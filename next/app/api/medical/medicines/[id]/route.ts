import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db/connect";
import { authenticate } from "@/lib/auth/middleware";
import { logAuditEvent } from "@/lib/auth/audit";
import { errors } from "@/lib/auth/errors";
import { handleApiError } from "@/lib/utils/api-error";
import { Medicine, type IMedicineBatch } from "@/lib/db/models/Medicine";
import { MedicalVisit } from "@/lib/db/models/MedicalVisit";
import { updateMedicineSchema } from "@/lib/validations/medical";
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

  try {
    const medicine = await Medicine.findById(id).lean();
    if (!medicine) {
      return NextResponse.json(
        { success: false, error: "الدواء غير موجود" },
        { status: 404 },
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        ...medicine,
        _id: medicine._id.toString(),
        batches: (medicine.batches || []).map((b: IMedicineBatch & { _id?: Types.ObjectId }) => ({
          ...b,
          _id: b._id?.toString(),
          expiryDate: b.expiryDate.toISOString(),
          receivedAt: b.receivedAt.toISOString(),
        })),
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
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
    const body = await request.json();
    const parsed = updateMedicineSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: errors.validationFailed, details: parsed.error.issues },
        { status: 400 },
      );
    }

    const updateData: Record<string, unknown> = {};
    if (parsed.data.name !== undefined) updateData.name = parsed.data.name.trim();
    if (parsed.data.unit !== undefined) updateData.unit = parsed.data.unit.trim();
    if (parsed.data.concentration !== undefined) updateData.concentration = parsed.data.concentration.trim();
    if (parsed.data.minThreshold !== undefined) updateData.minThreshold = parsed.data.minThreshold;

    const medicine = await Medicine.findByIdAndUpdate(id, updateData, { returnDocument: "after" });
    if (!medicine) {
      return NextResponse.json(
        { success: false, error: "الدواء غير موجود" },
        { status: 404 },
      );
    }

    await logAuditEvent({
      userId: auth.user!.id,
      userName: auth.user!.fullName,
      action: "UPDATE",
      module: "medical",
      targetId: id,
      description: `تم تحديث دواء: ${medicine.name}`,
      ipAddress: ip,
    });

    return NextResponse.json({
      success: true,
      data: {
        _id: (medicine._id as Types.ObjectId).toString(),
        name: medicine.name,
        unit: medicine.unit,
        concentration: medicine.concentration || "",
        quantity: medicine.totalQuantity,
        minThreshold: medicine.minThreshold,
        createdAt: medicine.createdAt.toISOString(),
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(
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

  const medicine = await Medicine.findById(id);
  if (!medicine) {
    return NextResponse.json(
      { success: false, error: "الدواء غير موجود" },
      { status: 404 },
    );
  }

  const visitRefs = await MedicalVisit.countDocuments({
    "dispensedMedicines.medicineId": id,
  });

  if (visitRefs > 0) {
    return NextResponse.json(
      { success: false, error: "لا يمكن حذف الدواء لوجود زيارات مرتبطة به" },
      { status: 400 },
    );
  }

  await Medicine.findByIdAndDelete(id);

  await logAuditEvent({
    userId: auth.user!.id,
    userName: auth.user!.fullName,
    action: "DELETE",
    module: "medical",
    targetId: id,
    description: `تم حذف دواء: ${medicine.name}`,
    ipAddress: ip,
  });

  return NextResponse.json({ success: true });
}
