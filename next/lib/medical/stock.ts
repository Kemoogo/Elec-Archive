import mongoose from "mongoose";
import { connectToDatabase } from "@/lib/db/connect";
import { Medicine } from "@/lib/db/models/Medicine";

export interface DispenseItem {
  medicineId: string;
  quantity: number;
}

export interface DispenseResult {
  success: boolean;
  error?: string;
  availableQuantity?: number;
}

export async function dispenseMedicine(
  medicineId: string,
  requestedQty: number,
): Promise<DispenseResult> {
  await connectToDatabase();

  const medicine = await Medicine.findById(medicineId);
  if (!medicine) {
    return { success: false, error: "الدواء غير موجود" };
  }

  if (medicine.expiryDate < new Date()) {
    return { success: false, error: "الدواء منتهي الصلاحية ولا يمكن صرفه" };
  }

  const result = await Medicine.findOneAndUpdate(
    {
      _id: medicineId,
      quantity: { $gte: requestedQty },
    },
    {
      $inc: { quantity: -requestedQty },
    },
    { new: true },
  );

  if (!result) {
    const current = await Medicine.findById(medicineId).lean();
    const available = current ? (current.quantity as number) : 0;
    return {
      success: false,
      error: `الكمية المتاحة غير كافية — المتوفر: ${available}`,
      availableQuantity: available,
    };
  }

  return { success: true };
}

export async function dispenseMultipleMedicines(
  items: DispenseItem[],
): Promise<DispenseResult> {
  await connectToDatabase();

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    for (const item of items) {
      const medicine = await Medicine.findById(item.medicineId).session(session);
      if (!medicine) {
        await session.abortTransaction();
        return { success: false, error: "الدواء غير موجود" };
      }
      if (medicine.expiryDate < new Date()) {
        await session.abortTransaction();
        return { success: false, error: "الدواء منتهي الصلاحية ولا يمكن صرفه" };
      }
      if (medicine.quantity < item.quantity) {
        await session.abortTransaction();
        return {
          success: false,
          error: `الكمية المتاحة غير كافية — المتوفر: ${medicine.quantity}`,
          availableQuantity: medicine.quantity,
        };
      }
    }

    for (const item of items) {
      const result = await Medicine.findOneAndUpdate(
        {
          _id: item.medicineId,
          quantity: { $gte: item.quantity },
        },
        {
          $inc: { quantity: -item.quantity },
        },
        { new: true, session },
      );

      if (!result) {
        await session.abortTransaction();
        const current = await Medicine.findById(item.medicineId).lean();
        const available = current ? (current.quantity as number) : 0;
        return {
          success: false,
          error: `الكمية المتاحة غير كافية — المتوفر: ${available}`,
          availableQuantity: available,
        };
      }
    }

    await session.commitTransaction();
    return { success: true };
  } catch {
    await session.abortTransaction();
    return { success: false, error: "حدث خطأ أثناء صرف الأدوية" };
  } finally {
    await session.endSession();
  }
}
