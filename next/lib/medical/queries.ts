import { connectToDatabase } from "@/lib/db/connect";
import { MedicalVisit } from "@/lib/db/models/MedicalVisit";
import { Medicine } from "@/lib/db/models/Medicine";
import type { Types } from "mongoose";

export async function countVisitsToday(): Promise<number> {
  await connectToDatabase();
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  return MedicalVisit.countDocuments({
    visitDate: { $gte: today, $lt: tomorrow },
  });
}

export async function countLowStock(): Promise<number> {
  await connectToDatabase();
  return Medicine.countDocuments({
    $expr: { $lt: ["$totalQuantity", "$minThreshold"] },
  });
}

export async function countExpired(): Promise<number> {
  await connectToDatabase();
  const now = new Date();
  
  // A medicine is considered expired if ANY of its batches has quantity > 0 AND expiryDate < now
  // Since we want to know if there are expired batches holding quantity
  return Medicine.countDocuments({
    batches: {
      $elemMatch: {
        quantity: { $gt: 0 },
        expiryDate: { $lt: now }
      }
    }
  });
}

export async function countTotalMedicines(): Promise<number> {
  await connectToDatabase();
  return Medicine.countDocuments();
}

export async function getDashboardStats() {
  const [visitsToday, lowStockCount, expiredCount, totalMedicines] = await Promise.all([
    countVisitsToday(),
    countLowStock(),
    countExpired(),
    countTotalMedicines(),
  ]);

  return { visitsToday, lowStockCount, expiredCount, totalMedicines };
}

export interface AggregatedMedication {
  medicineId: string;
  medicineName: string;
  unit: string;
  concentration: string;
  totalQuantity: number;
  lastDispenseDate: string;
}

export async function aggregatePatientMedications(patientObjectId: Types.ObjectId): Promise<AggregatedMedication[]> {
  await connectToDatabase();

  const visits = await MedicalVisit.find({ patientId: patientObjectId })
    .select("dispensedMedicines visitDate")
    .lean();

  // Extract unique medicine IDs
  const medicineIds = new Set<string>();
  for (const visit of visits) {
    const dispensed = visit.dispensedMedicines || [];
    for (const d of dispensed) {
      if (d.medicineId) {
        medicineIds.add(d.medicineId.toString());
      }
    }
  }

  // Pre-fetch all unique medicines in a single database query
  const medicines = await Medicine.find({ _id: { $in: Array.from(medicineIds) } })
    .select("name concentration unit")
    .lean();

  const preFetchedMedicinesMap = new Map<string, { medicineName: string; unit: string; concentration: string }>();
  for (const m of medicines) {
    const fullName = m.name as string;
    preFetchedMedicinesMap.set((m._id as Types.ObjectId).toString(), {
      medicineName: fullName,
      unit: (m.unit as string) || "",
      concentration: (m.concentration as string) || "",
    });
  }

  const medicineMap = new Map<string, { totalQuantity: number; lastDispenseDate: Date; medicineName: string; unit: string; concentration: string }>();

  for (const visit of visits) {
    const visitDate = visit.visitDate as Date;
    const dispensed = visit.dispensedMedicines || [];

    for (const d of dispensed) {
      const medId = (d.medicineId as Types.ObjectId).toString();

      if (!medicineMap.has(medId)) {
        const medInfo = preFetchedMedicinesMap.get(medId) || { medicineName: "دواء غير معروف", unit: "", concentration: "" };

        medicineMap.set(medId, {
          totalQuantity: 0,
          lastDispenseDate: new Date(0),
          medicineName: medInfo.medicineName,
          unit: medInfo.unit,
          concentration: medInfo.concentration,
        });
      }

      const entry = medicineMap.get(medId)!;
      entry.totalQuantity += d.quantity as number;
      if (visitDate > entry.lastDispenseDate) {
        entry.lastDispenseDate = visitDate;
      }
    }
  }

  return Array.from(medicineMap.entries()).map(([medicineId, data]) => ({
    medicineId,
    medicineName: data.medicineName,
    unit: data.unit,
    concentration: data.concentration,
    totalQuantity: data.totalQuantity,
    lastDispenseDate: data.lastDispenseDate.toISOString(),
  }));
}
