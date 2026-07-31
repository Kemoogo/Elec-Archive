import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db/connect";
import { authenticate } from "@/lib/auth/middleware";
import { logAuditEvent } from "@/lib/auth/audit";
import { errors } from "@/lib/auth/errors";
import { Medicine, type IMedicine, type IMedicineBatch } from "@/lib/db/models/Medicine";
import { InventoryLedger } from "@/lib/db/models/InventoryLedger";
import { createMedicineSchema } from "@/lib/validations/medical";
import { handleApiError } from "@/lib/utils/api-error";
import { checkApiRateLimit, rateLimitErrorResponse } from "@/lib/security/rate-limit";

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

    const medicines = (await Medicine.find().sort({ name: 1 }).lean()) as unknown as IMedicine[];
    const now = new Date();

    const serializedMedicines = medicines.map((med) => {
      // Find the closest expiry date among batches with quantity > 0
      let closestExpiryDate: Date | null = null;
      let isExpired = false;

      const activeBatches = (med.batches || []).filter((b: IMedicineBatch) => b.quantity > 0);
      
      if (activeBatches.length > 0) {
        closestExpiryDate = new Date(Math.min(...activeBatches.map((b: IMedicineBatch) => new Date(b.expiryDate).getTime())));
        isExpired = closestExpiryDate < now;
      }

      return {
        _id: med._id.toString(),
        name: med.name,
        unit: med.unit,
        concentration: med.concentration || "",
        quantity: med.totalQuantity,
        expiryDate: closestExpiryDate ? closestExpiryDate.toISOString() : null,
        minThreshold: med.minThreshold,
        isLowStock: med.totalQuantity < med.minThreshold,
        isExpired,
        createdAt: med.createdAt.toISOString(),
        batches: (med.batches || []).map((b: IMedicineBatch) => ({
          quantity: b.quantity,
          expiryDate: new Date(b.expiryDate).toISOString()
        }))
      };
    });

    return NextResponse.json({
      success: true,
      data: { medicines: serializedMedicines },
    });
  } catch (error) {
    return handleApiError(error, "حدث خطأ أثناء تحميل الأدوية");
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

  try {
    await connectToDatabase();
    const body = await request.json();
    const parsed = createMedicineSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: errors.validationFailed, details: parsed.error.issues },
        { status: 400 },
      );
    }

    const { name, unit, concentration, quantity, expiryDate, minThreshold } = parsed.data;

    // Check if medicine with same name, unit AND concentration already exists
    const existing = await Medicine.findOne({ 
      name: name.trim(),
      unit: unit.trim(),
      concentration: concentration.trim()
    });
    
    if (existing) {
      return NextResponse.json(
        { success: false, error: "يوجد دواء مسجل بنفس الاسم والنوع والتركيز مسبقاً، يرجى استخدام خيار (إضافة كمية)" },
        { status: 400 },
      );
    }

    const medicine = await Medicine.create({
      name: name.trim(),
      unit: unit.trim(),
      concentration: concentration.trim(),
      minThreshold,
      totalQuantity: quantity,
      batches: [
        {
          quantity,
          expiryDate: new Date(expiryDate),
        }
      ]
    });

    // Create Ledger Entry
    await InventoryLedger.create({
      medicineId: medicine._id,
      action: "RESTOCK",
      quantityChange: quantity,
      balanceAfter: quantity,
      notes: "رصيد افتتاحي (إضافة دواء جديد)",
    });

    await logAuditEvent({
      userId: auth.user!.id,
      userName: auth.user!.fullName,
      action: "CREATE",
      module: "medical",
      targetId: medicine._id.toString(),
      description: `تم تعريف دواء جديد: ${name} بكمية ${quantity}`,
      ipAddress: ip,
    });

    return NextResponse.json(
      {
        success: true,
        data: {
          _id: medicine._id.toString(),
          name: medicine.name,
          unit: medicine.unit,
          concentration: medicine.concentration || "",
          quantity: medicine.totalQuantity,
          minThreshold: medicine.minThreshold,
          createdAt: medicine.createdAt.toISOString(),
        },
      },
      { status: 201 },
    );
  } catch (error) {
    return handleApiError(error, "حدث خطأ أثناء إضافة الدواء");
  }
}
