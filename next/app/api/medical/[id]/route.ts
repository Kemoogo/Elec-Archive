import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db/connect";
import { authenticate } from "@/lib/auth/middleware";
import { logAuditEvent } from "@/lib/auth/audit";
import { errors } from "@/lib/auth/errors";
import { Patient } from "@/lib/db/models/Patient";
import { Medicine } from "@/lib/db/models/Medicine";
import { checkApiRateLimit, rateLimitErrorResponse } from "@/lib/security/rate-limit";
import type { Types } from "mongoose";

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

  const visit = await Patient.findById(id).lean();
  if (!visit) {
    return NextResponse.json(
      { success: false, error: "الزيارة غير موجودة" },
      { status: 404 },
    );
  }

  const dispensedWithNames = await Promise.all(
    (visit.dispensedMedicines as { medicineId: Types.ObjectId; quantity: number }[]).map(
      async (d) => {
        const med = await Medicine.findById(d.medicineId).lean();
        return {
          medicineId: d.medicineId.toString(),
          medicineName: med ? (med.name as string) : "دواء محذوف",
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
      _id: (visit._id as Types.ObjectId).toString(),
      patientId: visit.patientId,
      patientName: visit.patientName,
      visitDate: (visit.visitDate as Date).toISOString(),
      diagnosis: visit.diagnosis,
      treatment: visit.treatment,
      dispensedMedicines: dispensedWithNames,
      createdAt: (visit.createdAt as Date).toISOString(),
    },
  });
}
