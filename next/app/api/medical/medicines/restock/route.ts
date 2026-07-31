import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db/connect";
import { authenticate } from "@/lib/auth/middleware";
import { logAuditEvent } from "@/lib/auth/audit";
import { errors } from "@/lib/auth/errors";
import { handleApiError } from "@/lib/utils/api-error";
import { Medicine, type IMedicineBatch } from "@/lib/db/models/Medicine";
import { InventoryLedger } from "@/lib/db/models/InventoryLedger";
import { checkApiRateLimit, rateLimitErrorResponse } from "@/lib/security/rate-limit";
import { z } from "zod";

const restockSchema = z.object({
  medicineId: z.string().min(1),
  quantity: z.number().int().min(1, "الكمية المضافة يجب أن تكون 1 على الأقل"),
  expiryDate: z.string().refine((val) => !isNaN(Date.parse(val)), "التاريخ غير صالح"),
});

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
    const parsed = restockSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: errors.validationFailed, details: parsed.error.issues },
        { status: 400 },
      );
    }

    const { medicineId, quantity, expiryDate } = parsed.data;

    const medicine = await Medicine.findById(medicineId);
    if (!medicine) {
      return NextResponse.json(
        { success: false, error: "الدواء غير موجود" },
        { status: 404 },
      );
    }

    // Add new batch
    medicine.batches.push({
      quantity,
      expiryDate: new Date(expiryDate),
      receivedAt: new Date(),
    });

    medicine.totalQuantity = medicine.batches.reduce((sum: number, b: IMedicineBatch) => sum + b.quantity, 0);

    await medicine.save();

    // Create Ledger Entry
    await InventoryLedger.create({
      medicineId: medicine._id,
      action: "RESTOCK",
      quantityChange: quantity,
      balanceAfter: medicine.totalQuantity,
      notes: "إضافة كمية (توريد)",
    });

    await logAuditEvent({
      userId: auth.user!.id,
      userName: auth.user!.fullName,
      action: "UPDATE",
      module: "medical",
      targetId: medicine._id.toString(),
      description: `تم إضافة كمية ${quantity} لدواء ${medicine.name}`,
      ipAddress: ip,
    });

    return NextResponse.json(
      {
        success: true,
        data: {
          _id: medicine._id.toString(),
          name: medicine.name,
          quantity: medicine.totalQuantity,
        },
      },
      { status: 200 },
    );
  } catch (error) {
    return handleApiError(error);
  }
}
