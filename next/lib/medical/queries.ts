import { connectToDatabase } from "@/lib/db/connect";
import { Patient } from "@/lib/db/models/Patient";
import { Medicine } from "@/lib/db/models/Medicine";

export async function countVisitsToday(): Promise<number> {
  await connectToDatabase();
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  return Patient.countDocuments({
    visitDate: { $gte: today, $lt: tomorrow },
  });
}

export async function countLowStock(): Promise<number> {
  await connectToDatabase();
  return Medicine.countDocuments({
    $expr: { $lt: ["$quantity", "$minThreshold"] },
  });
}

export async function countExpired(): Promise<number> {
  await connectToDatabase();
  const now = new Date();
  return Medicine.countDocuments({ expiryDate: { $lt: now } });
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
