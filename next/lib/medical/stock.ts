import { connectToDatabase } from "@/lib/db/connect";
import { Medicine, type IMedicineBatch } from "@/lib/db/models/Medicine";
import { InventoryLedger } from "@/lib/db/models/InventoryLedger";
import type { Types } from "mongoose";

export interface DispenseItem {
  medicineId: string;
  quantity: number;
}

export interface DispenseResult {
  success: boolean;
  error?: string;
  availableQuantity?: number;
}

export async function dispenseMultipleMedicines(
  items: DispenseItem[],
  visitId: Types.ObjectId | string,
): Promise<DispenseResult> {
  await connectToDatabase();

  // 1. Validation Phase: Check if all items are available and have enough unexpired stock
  const medicinesToUpdate = [];

  for (const item of items) {
    const medicine = await Medicine.findById(item.medicineId);
    if (!medicine) {
      return { success: false, error: "أحد الأدوية المطلوبة غير موجود" };
    }

    // Filter active batches (quantity > 0 and not expired)
    const now = new Date();
    const activeBatches = medicine.batches.filter(
      (b: IMedicineBatch) => b.quantity > 0 && b.expiryDate > now
    );

    activeBatches.sort((a: IMedicineBatch, b: IMedicineBatch) => a.expiryDate.getTime() - b.expiryDate.getTime());

    const totalAvailable = activeBatches.reduce((sum: number, b: IMedicineBatch) => sum + b.quantity, 0);

    if (activeBatches.length === 0 || totalAvailable < item.quantity) {
      return {
        success: false,
        error: `الكمية المتاحة من ${medicine.name} غير كافية أو منتهية الصلاحية — المتوفر الصالح: ${totalAvailable}`,
        availableQuantity: totalAvailable,
      };
    }

    medicinesToUpdate.push({
      medicine,
      requestedQty: item.quantity,
      activeBatches,
    });
  }

  // 2. Execution Phase: Deduct from batches
  // We don't use strict transactions here to ensure compatibility with standalone MongoDB.
  // Instead, we deduct sequentially. Since validation passed, failure is unlikely unless concurrent edits occur.
  try {
    for (const update of medicinesToUpdate) {
      let remainingToDeduct = update.requestedQty;
      const { medicine, activeBatches } = update;

      for (const batch of activeBatches) {
        if (remainingToDeduct <= 0) break;

        const deductAmount = Math.min(batch.quantity, remainingToDeduct);
        batch.quantity -= deductAmount;
        remainingToDeduct -= deductAmount;
      }

      // Re-calculate totalQuantity
      medicine.totalQuantity = medicine.batches.reduce((sum: number, b: IMedicineBatch) => sum + b.quantity, 0);

      // Save the medicine
      await medicine.save();

      // Log to ledger
      await InventoryLedger.create({
        medicineId: medicine._id,
        action: "DISPENSE",
        quantityChange: -update.requestedQty,
        balanceAfter: medicine.totalQuantity,
        referenceId: visitId,
        notes: "صرف لزيارة طبية",
      });
    }

    return { success: true };
  } catch (error) {
    console.error("Error during dispensing:", error);
    return { success: false, error: "حدث خطأ داخلي أثناء صرف الأدوية" };
  }
}

export async function destroyExpiredBatches(medicineId: string): Promise<DispenseResult> {
  await connectToDatabase();
  try {
    const medicine = await Medicine.findById(medicineId);
    if (!medicine) return { success: false, error: "الدواء غير موجود" };

    const now = new Date();
    const expiredBatches = medicine.batches.filter(
      (b: IMedicineBatch) => b.expiryDate < now && b.quantity > 0
    );

    if (expiredBatches.length === 0) {
      return { success: false, error: "لا توجد تشغيلات منتهية الصلاحية بها كميات حالياً" };
    }

    const totalToDestroy = expiredBatches.reduce((sum: number, b: IMedicineBatch) => sum + b.quantity, 0);

    // Set quantity of expired batches to 0
    medicine.batches.forEach((b: IMedicineBatch) => {
      if (b.expiryDate < now) {
        b.quantity = 0;
      }
    });

    // Re-calculate totalQuantity
    medicine.totalQuantity = medicine.batches.reduce((sum: number, b: IMedicineBatch) => sum + b.quantity, 0);

    await medicine.save();

    // Log to ledger
    await InventoryLedger.create({
      medicineId: medicine._id,
      action: "ADJUSTMENT",
      quantityChange: -totalToDestroy,
      balanceAfter: medicine.totalQuantity,
      notes: "إعدام أدوية منتهية الصلاحية",
    });

    return { success: true };
  } catch (error) {
    console.error("Error destroying expired batches:", error);
    return { success: false, error: "حدث خطأ أثناء إعدام الأدوية" };
  }
}
