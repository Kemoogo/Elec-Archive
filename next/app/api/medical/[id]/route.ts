import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db/connect";
import { authenticate } from "@/lib/auth/middleware";
import { logAuditEvent } from "@/lib/auth/audit";
import { errors } from "@/lib/auth/errors";
import { handleApiError } from "@/lib/utils/api-error";
import { MedicalVisit } from "@/lib/db/models/MedicalVisit";
import { Medicine } from "@/lib/db/models/Medicine";
import { checkApiRateLimit, rateLimitErrorResponse } from "@/lib/security/rate-limit";
import { Types } from "mongoose";
import { createVisitSchema } from "@/lib/validations/medical";
import { dispenseMultipleMedicines } from "@/lib/medical/stock";
import { MedicalPatient } from "@/lib/db/models/MedicalPatient";
import { InventoryLedger } from "@/lib/db/models/InventoryLedger";

interface PopulatedVisit {
  _id: Types.ObjectId;
  patientId?: {
    patientId: string;
    patientName: string;
  } | null;
  visitDate: Date;
  diagnosis: string;
  treatment: string;
  restType?: string;
  restDays?: number;
  fitnessCategory?: string;
  dispensedMedicines: {
    medicineId: Types.ObjectId;
    quantity: number;
  }[];
  createdAt: Date;
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
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

  await connectToDatabase();

  const { id } = await params;

  const visit = (await MedicalVisit.findById(id)
    .populate<{ patientId: { patientId: string; patientName: string } }>("patientId", "patientId patientName")
    .lean()) as unknown as PopulatedVisit | null;

  if (!visit) {
    return NextResponse.json(
      { success: false, error: "الزيارة غير موجودة" },
      { status: 404 },
    );
  }

  const dispensedWithNames = await Promise.all(
    visit.dispensedMedicines.map(
      async (d) => {
        const med = await Medicine.findById(d.medicineId).lean();
        return {
          medicineId: d.medicineId.toString(),
          medicineName: med ? (med.name as string) : "دواء محذوف",
          concentration: med ? (med.concentration as string) : "",
          unit: med ? (med.unit as string) : "",
          quantity: d.quantity,
        };
      },
    ),
  );

  await logAuditEvent({
    userId: auth.user!.id,
    userName: auth.user!.fullName,
    action: "VIEW",
    module: "medical",
    targetId: id,
    description: `عرض تفاصيل زيارة طبية`,
    ipAddress: ip,
  });

  return NextResponse.json({
    success: true,
    data: {
      _id: visit._id.toString(),
      patientId: visit.patientId?.patientId || "غير معروف",
      patientName: visit.patientId?.patientName || "غير معروف",
      visitDate: visit.visitDate.toISOString(),
      diagnosis: visit.diagnosis,
      treatment: visit.treatment,
      restType: visit.restType || "none",
      restDays: visit.restDays || 0,
      fitnessCategory: visit.fitnessCategory || "fit",
      dispensedMedicines: dispensedWithNames,
      createdAt: visit.createdAt.toISOString(),
    },
  });
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
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

  const { id } = await params;

  try {
    const visit = await MedicalVisit.findById(id);
    if (!visit) {
      return NextResponse.json(
        { success: false, error: "الزيارة غير موجودة" },
        { status: 404 },
      );
    }

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

    // 1. Return previously dispensed medicines back to the inventory
    if (visit.dispensedMedicines && visit.dispensedMedicines.length > 0) {
      for (const oldItem of visit.dispensedMedicines) {
        const med = await Medicine.findById(oldItem.medicineId);
        if (med) {
          if (med.batches && med.batches.length > 0) {
            med.batches[0].quantity += oldItem.quantity;
          } else {
            med.batches.push({
              quantity: oldItem.quantity,
              expiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
            } as unknown as typeof med.batches[number]);
          }
          med.totalQuantity = med.batches.reduce((sum: number, b: typeof med.batches[number]) => sum + b.quantity, 0);
          await med.save();

          await InventoryLedger.create({
            medicineId: med._id,
            action: "ADJUSTMENT",
            quantityChange: oldItem.quantity,
            balanceAfter: med.totalQuantity,
            referenceId: visit._id,
            notes: "إرجاع أدوية لتعديل زيارة طبية",
          });
        }
      }
    }

    // 2. Dispense the new set of medicines
    if (dispensedMedicines && dispensedMedicines.length > 0) {
      const invalidId = dispensedMedicines.find((d) => !/^[a-f\d]{24}$/i.test(d.medicineId));
      if (invalidId) {
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
        // Rollback: Re-dispense the old medicines to restore state
        await dispenseMultipleMedicines(
          visit.dispensedMedicines.map((d: { medicineId: Types.ObjectId; quantity: number }) => ({
            medicineId: d.medicineId.toString(),
            quantity: d.quantity,
          })),
          visit._id
        );

        return NextResponse.json(
          { success: false, error: dispenseResult.error },
          { status: 400 },
        );
      }
    }

    // 3. Update Patient's name if changed
    const patient = await MedicalPatient.findOne({ patientId: patientId.trim() });
    if (patient && patient.patientName !== patientName.trim()) {
      patient.patientName = patientName.trim();
      await patient.save();
    }

    // 4. Update the visit details
    visit.diagnosis = diagnosis.trim();
    visit.treatment = (treatment || "").trim();
    visit.dispensedMedicines = (dispensedMedicines || []).map((d) => ({
      medicineId: new Types.ObjectId(d.medicineId),
      quantity: d.quantity,
    }));
    visit.restType = restType;
    visit.restDays = restDays;
    visit.fitnessCategory = fitnessCategory;

    await visit.save();

    await logAuditEvent({
      userId: auth.user!.id,
      userName: auth.user!.fullName,
      action: "UPDATE",
      module: "medical",
      targetId: visit._id.toString(),
      description: `تم تعديل زيارة طبية للمريض ${patientName} (${patientId})`,
      ipAddress: ip,
    });

    return NextResponse.json({
      success: true,
      data: {
        _id: visit._id.toString(),
        patientId,
        patientName,
        visitDate: visit.visitDate.toISOString(),
        diagnosis: visit.diagnosis,
        treatment: visit.treatment,
        dispensedMedicines: visit.dispensedMedicines,
        restType: visit.restType,
        restDays: visit.restDays,
        fitnessCategory: visit.fitnessCategory,
      },
    });

  } catch (error) {
    return handleApiError(error);
  }
}
