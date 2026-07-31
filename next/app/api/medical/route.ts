import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db/connect";
import { authenticate } from "@/lib/auth/middleware";
import { logAuditEvent } from "@/lib/auth/audit";
import { errors } from "@/lib/auth/errors";
import { handleApiError } from "@/lib/utils/api-error";
import { MedicalPatient } from "@/lib/db/models/MedicalPatient";
import { MedicalVisit } from "@/lib/db/models/MedicalVisit";
import { createVisitSchema, visitListQuerySchema } from "@/lib/validations/medical";
import { dispenseMultipleMedicines } from "@/lib/medical/stock";
import { escapeRegex } from "@/lib/utils";
import { checkApiRateLimit, rateLimitErrorResponse } from "@/lib/security/rate-limit";
import type { Types } from "mongoose";
import { IMedicalVisit } from "@/lib/db/models/MedicalVisit";
import { IMedicalPatient } from "@/lib/db/models/MedicalPatient";

interface PopulatedVisit extends Omit<IMedicalVisit, 'patientId'> {
  patientId: IMedicalPatient;
}

export async function GET(request: Request) {
  const auth = await authenticate();
  if (!auth.success) {
    return NextResponse.json(
      { success: false, error: auth.error },
      { status: auth.status },
    );
  }

  const medicalPermission = auth.user!.permissions.medical;
  if (medicalPermission === "none") {
    return NextResponse.json(
      { success: false, error: errors.insufficientPermissions },
      { status: 403 },
    );
  }

  const ip = request.headers.get("x-forwarded-for") ?? "";
  const rl = checkApiRateLimit(auth.user!.id, ip, "read");
  if (!rl.allowed) {
    return NextResponse.json(rateLimitErrorResponse(rl.resetAt), { status: 429 });
  }

  try {
    await connectToDatabase();

    const { searchParams } = new URL(request.url);
    const params = Object.fromEntries(searchParams.entries());

    const parsed = visitListQuerySchema.safeParse(params);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: errors.validationFailed, details: parsed.error.issues },
        { status: 400 },
      );
    }

    const { page, limit, search, dateFrom, dateTo } = parsed.data;

    let patientIdsToFilter: Types.ObjectId[] | null = null;

    if (search) {
      const escapedSearch = escapeRegex(search);
      const searchRegex = { $regex: escapedSearch, $options: "i" };
      const matchedPatients = await MedicalPatient.find({
        $or: [{ patientName: searchRegex }, { patientId: searchRegex }]
      }).select('_id').lean();
      
      patientIdsToFilter = matchedPatients.map(p => p._id as Types.ObjectId);
      
      // If we searched and found no patients, return empty
      if (patientIdsToFilter.length === 0) {
        return NextResponse.json({
          success: true,
          data: {
            visits: [],
            pagination: { page, limit, total: 0, totalPages: 1 },
          },
        });
      }
    }

    const query: Record<string, unknown> = {};

    if (patientIdsToFilter) {
      query.patientId = { $in: patientIdsToFilter };
    }

    if (dateFrom || dateTo) {
      const dateQuery: Record<string, Date> = {};
      if (dateFrom) dateQuery.$gte = new Date(dateFrom);
      if (dateTo) dateQuery.$lte = new Date(dateTo);
      query.visitDate = dateQuery;
    }

    const skip = (page - 1) * limit;

    const [visits, total] = await Promise.all([
      MedicalVisit.find(query)
        .sort({ visitDate: -1 })
        .skip(skip)
        .limit(limit)
        .populate('patientId', 'patientId patientName')
        .lean(),
      MedicalVisit.countDocuments(query),
    ]);

    await logAuditEvent({
      userId: auth.user!.id,
      userName: auth.user!.fullName,
      action: "VIEW",
      module: "medical",
      description: `عرض قائمة الزيارات الطبية (صفحة ${page})`,
      ipAddress: ip,
    });

    const serializedVisits = (visits as unknown as PopulatedVisit[]).map((visit) => ({
      _id: (visit._id as Types.ObjectId).toString(),
      patientId: visit.patientId?.patientId || "غير معروف",
      patientName: visit.patientId?.patientName || "غير معروف",
      visitDate: (visit.visitDate as Date).toISOString(),
      diagnosis: visit.diagnosis,
      treatment: visit.treatment,
      dispensedMedicines: (visit.dispensedMedicines || []).map((d) => ({
        medicineId: d.medicineId.toString(),
        quantity: d.quantity,
      })),
      restType: visit.restType || "none",
      restDays: visit.restDays || 0,
      fitnessCategory: visit.fitnessCategory || "fit",
      createdAt: (visit.createdAt as Date).toISOString(),
    }));

    const totalPages = Math.max(1, Math.ceil(total / limit));

    return NextResponse.json({
      success: true,
      data: {
        visits: serializedVisits,
        pagination: { page, limit, total, totalPages },
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: Request) {
  const auth = await authenticate();
  if (!auth.success) {
    return NextResponse.json(
      { success: false, error: auth.error },
      { status: auth.status },
    );
  }

  if (auth.user!.permissions.medical !== "edit") {
    return NextResponse.json(
      { success: false, error: errors.insufficientPermissions },
      { status: 403 },
    );
  }

  const ip = request.headers.get("x-forwarded-for") ?? "";
  const rl = checkApiRateLimit(auth.user!.id, ip, "write");
  if (!rl.allowed) {
    return NextResponse.json(rateLimitErrorResponse(rl.resetAt), { status: 429 });
  }

  await connectToDatabase();

  try {
    const body = await request.json();
    const parsed = createVisitSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: errors.validationFailed, details: parsed.error.issues },
        { status: 400 },
      );
    }

    const {
      patientId,
      patientName,
      diagnosis,
      treatment,
      dispensedMedicines,
      restType,
      restDays,
      fitnessCategory
    } = parsed.data;

    // 1. Find or create MedicalPatient; update name if changed
    let patient = await MedicalPatient.findOne({ patientId: patientId.trim() });
    if (!patient) {
      patient = await MedicalPatient.create({
        patientId: patientId.trim(),
        patientName: patientName.trim(),
      });
    } else if (patient.patientName !== patientName.trim()) {
      patient.patientName = patientName.trim();
      await patient.save();
    }

    // 2. Create MedicalVisit
    const visit = await MedicalVisit.create({
      patientId: patient._id,
      visitDate: new Date(),
      diagnosis: diagnosis.trim(),
      treatment: treatment.trim(),
      dispensedMedicines: dispensedMedicines ?? [],
      restType,
      restDays,
      fitnessCategory,
    });

    // 3. Dispense medicines if any
    if (dispensedMedicines && dispensedMedicines.length > 0) {
      // Validate all medicineIds are 24-char hex (valid ObjectId)
      const invalidId = dispensedMedicines.find((d) => !/^[a-f\d]{24}$/i.test(d.medicineId));
      if (invalidId) {
        await MedicalVisit.findByIdAndDelete(visit._id);
        return NextResponse.json(
          { success: false, error: "معرف الدواء غير صالح" },
          { status: 400 },
        );
      }

      const dispenseResult = await dispenseMultipleMedicines(
        dispensedMedicines.map((d) => ({ medicineId: d.medicineId, quantity: d.quantity })),
        visit._id
      );

      if (!dispenseResult.success) {
        // Since we are not using transactions (for standalone mongo), 
        // if dispensing fails, we might still have created the visit.
        // In a strict system, we would rollback visit creation here.
        // For now, we will delete the visit if dispensing completely fails.
        await MedicalVisit.findByIdAndDelete(visit._id);

        return NextResponse.json(
          { success: false, error: dispenseResult.error },
          { status: 400 },
        );
      }
    }

    await logAuditEvent({
      userId: auth.user!.id,
      userName: auth.user!.fullName,
      action: "CREATE",
      module: "medical",
      targetId: visit._id.toString(),
      description: `تم تسجيل زيارة طبية للمريض ${patient.patientName} (${patient.patientId})`,
      ipAddress: ip,
    });

    return NextResponse.json(
      {
        success: true,
        data: {
          _id: visit._id.toString(),
          patientId: patient.patientId,
          patientName: patient.patientName,
          visitDate: visit.visitDate.toISOString(),
          diagnosis: visit.diagnosis,
          treatment: visit.treatment,
          dispensedMedicines: (visit.dispensedMedicines as { medicineId: Types.ObjectId; quantity: number }[]).map((d) => ({
            medicineId: d.medicineId.toString(),
            quantity: d.quantity,
          })),
          restType: visit.restType,
          restDays: visit.restDays,
          fitnessCategory: visit.fitnessCategory,
          createdAt: visit.createdAt.toISOString(),
        },
      },
      { status: 201 },
    );
  } catch (error) {
    return handleApiError(error);
  }
}
