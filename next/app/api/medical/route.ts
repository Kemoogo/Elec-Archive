import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db/connect";
import { authenticate } from "@/lib/auth/middleware";
import { logAuditEvent } from "@/lib/auth/audit";
import { errors } from "@/lib/auth/errors";
import { Patient } from "@/lib/db/models/Patient";
import { createVisitSchema, visitListQuerySchema } from "@/lib/validations/medical";
import { dispenseMultipleMedicines } from "@/lib/medical/stock";
import { escapeRegex } from "@/lib/utils";
import { checkApiRateLimit, rateLimitErrorResponse } from "@/lib/security/rate-limit";
import type { Types } from "mongoose";

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

    const query: Record<string, unknown> = {};

    if (search) {
      const escapedSearch = escapeRegex(search);
      const searchRegex = { $regex: escapedSearch, $options: "i" };
      query.$or = [
        { patientName: searchRegex },
        { patientId: searchRegex },
      ];
    }

    if (dateFrom || dateTo) {
      const dateQuery: Record<string, Date> = {};
      if (dateFrom) dateQuery.$gte = new Date(dateFrom);
      if (dateTo) dateQuery.$lte = new Date(dateTo);
      query.visitDate = dateQuery;
    }

    const skip = (page - 1) * limit;

    const [visits, total] = await Promise.all([
      Patient.find(query)
        .sort({ visitDate: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Patient.countDocuments(query),
    ]);

    await logAuditEvent({
      userId: auth.user!.id,
      userName: auth.user!.fullName,
      action: "VIEW",
      module: "medical",
      description: `عرض قائمة الزيارات الطبية (صفحة ${page})`,
      ipAddress: ip,
    });

    const serializedVisits = visits.map((visit) => ({
      _id: (visit._id as Types.ObjectId).toString(),
      patientId: visit.patientId,
      patientName: visit.patientName,
      visitDate: (visit.visitDate as Date).toISOString(),
      diagnosis: visit.diagnosis,
      treatment: visit.treatment,
      dispensedMedicines: (visit.dispensedMedicines as { medicineId: Types.ObjectId; quantity: number }[]).map((d) => ({
        medicineId: d.medicineId.toString(),
        quantity: d.quantity,
      })),
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
    console.error("Medical GET error:", error);
    return NextResponse.json(
      { success: false, error: errors.internalError },
      { status: 500 },
    );
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

    const { patientId, patientName, diagnosis, treatment, dispensedMedicines } = parsed.data;

    if (dispensedMedicines && dispensedMedicines.length > 0) {
      const dispenseResult = await dispenseMultipleMedicines(
        dispensedMedicines.map((d) => ({ medicineId: d.medicineId, quantity: d.quantity })),
      );

      if (!dispenseResult.success) {
        return NextResponse.json(
          { success: false, error: dispenseResult.error },
          { status: 400 },
        );
      }
    }

    const visit = await Patient.create({
      patientId: patientId.trim(),
      patientName: patientName.trim(),
      visitDate: new Date(),
      diagnosis: diagnosis.trim(),
      treatment: treatment.trim(),
      dispensedMedicines: dispensedMedicines ?? [],
    });

    await logAuditEvent({
      userId: auth.user!.id,
      userName: auth.user!.fullName,
      action: "CREATE",
      module: "medical",
      targetId: visit._id.toString(),
      description: `تم تسجيل زيارة طبية للمريض ${patientName} (${patientId})`,
      ipAddress: ip,
    });

    return NextResponse.json(
      {
        success: true,
        data: {
          _id: visit._id.toString(),
          patientId: visit.patientId,
          patientName: visit.patientName,
          visitDate: visit.visitDate.toISOString(),
          diagnosis: visit.diagnosis,
          treatment: visit.treatment,
          dispensedMedicines: (visit.dispensedMedicines as { medicineId: Types.ObjectId; quantity: number }[]).map((d) => ({
            medicineId: d.medicineId.toString(),
            quantity: d.quantity,
          })),
          createdAt: visit.createdAt.toISOString(),
        },
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("Medical POST error:", error);
    return NextResponse.json(
      { success: false, error: errors.internalError },
      { status: 500 },
    );
  }
}
