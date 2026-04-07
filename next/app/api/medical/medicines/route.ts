import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db/connect";
import { authenticate } from "@/lib/auth/middleware";
import { logAuditEvent } from "@/lib/auth/audit";
import { errors } from "@/lib/auth/errors";
import { Medicine } from "@/lib/db/models/Medicine";
import { createMedicineSchema } from "@/lib/validations/medical";
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

  await connectToDatabase();

  const medicines = await Medicine.find().sort({ name: 1 }).lean();
  const now = new Date();

  const serializedMedicines = medicines.map((med) => ({
    _id: (med._id as Types.ObjectId).toString(),
    name: med.name,
    unit: med.unit,
    quantity: med.quantity,
    expiryDate: (med.expiryDate as Date).toISOString(),
    minThreshold: med.minThreshold,
    isLowStock: med.quantity < med.minThreshold,
    isExpired: (med.expiryDate as Date) < now,
    createdAt: (med.createdAt as Date).toISOString(),
  }));

  return NextResponse.json({
    success: true,
    data: { medicines: serializedMedicines },
  });
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
    const parsed = createMedicineSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: errors.validationFailed, details: parsed.error.issues },
        { status: 400 },
      );
    }

    const { name, unit, quantity, expiryDate, minThreshold } = parsed.data;

    const medicine = await Medicine.create({
      name: name.trim(),
      unit: unit.trim(),
      quantity,
      expiryDate: new Date(expiryDate),
      minThreshold,
    });

    await logAuditEvent({
      userId: auth.user!.id,
      userName: auth.user!.fullName,
      action: "CREATE",
      module: "medical",
      targetId: medicine._id.toString(),
      description: `تمت إضافة دواء جديد: ${name}`,
      ipAddress: ip,
    });

    return NextResponse.json(
      {
        success: true,
        data: {
          _id: medicine._id.toString(),
          name: medicine.name,
          unit: medicine.unit,
          quantity: medicine.quantity,
          expiryDate: medicine.expiryDate.toISOString(),
          minThreshold: medicine.minThreshold,
          createdAt: medicine.createdAt.toISOString(),
        },
      },
      { status: 201 },
    );
  } catch {
    return NextResponse.json(
      { success: false, error: errors.internalError },
      { status: 500 },
    );
  }
}
