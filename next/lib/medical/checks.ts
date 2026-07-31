import { connectToDatabase } from "@/lib/db/connect";
import { Medicine } from "@/lib/db/models/Medicine";
import { User } from "@/lib/db/models/User";
import { Notification } from "@/lib/db/models/Notification";
import { emitToUser } from "@/lib/notifications/emitter";

export interface CheckResult {
  expiryAlerts: number;
  lowStockAlerts: number;
  notificationsCreated: number;
}

async function getMedicalStaffAndCommanders() {
  return User.find({
    isActive: true,
    $or: [
      { role: "commander" },
      { "permissions.medical": "edit" },
    ],
  }).select("_id");
}

export async function runExpiryCheck(): Promise<number> {
  await connectToDatabase();

  const now = new Date();
  const expiredMedicines = await Medicine.find({
    expiryDate: { $lt: now },
  }).lean();

  if (expiredMedicines.length === 0) return 0;

  const recipients = await getMedicalStaffAndCommanders();
  let count = 0;

  for (const med of expiredMedicines) {
    for (const user of recipients) {
      const notification = await Notification.create({
        userId: user._id,
        type: "medicine_expiry",
        title: "دواء منتهي الصلاحية",
        body: `دواء ${med.name} منتهي الصلاحية`,
        refId: med._id,
        refModel: "Medicine",
      });

      emitToUser(user._id.toString(), {
        _id: notification._id.toString(),
        type: notification.type,
        title: notification.title,
        body: notification.body,
        isRead: notification.isRead,
        refId: notification.refId?.toString(),
        refModel: notification.refModel,
        createdAt: notification.createdAt.toISOString(),
      });

      count++;
    }
  }

  return count;
}

export async function runLowStockCheck(): Promise<number> {
  await connectToDatabase();

  const lowStockMedicines = await Medicine.find({
    $expr: { $lt: ["$totalQuantity", "$minThreshold"] },
  }).lean();

  if (lowStockMedicines.length === 0) return 0;

  const recipients = await getMedicalStaffAndCommanders();
  let count = 0;

  for (const med of lowStockMedicines) {
    for (const user of recipients) {
      const notification = await Notification.create({
        userId: user._id,
        type: "low_stock",
        title: "مخزون منخفض",
        body: `${med.name}: الكمية أقل من الحد الأدنى (${med.totalQuantity}/${med.minThreshold})`,
        refId: med._id,
        refModel: "Medicine",
      });

      emitToUser(user._id.toString(), {
        _id: notification._id.toString(),
        type: notification.type,
        title: notification.title,
        body: notification.body,
        isRead: notification.isRead,
        refId: notification.refId?.toString(),
        refModel: notification.refModel,
        createdAt: notification.createdAt.toISOString(),
      });

      count++;
    }
  }

  return count;
}

export async function runAllChecks(): Promise<CheckResult> {
  const [expiryAlerts, lowStockAlerts] = await Promise.all([
    runExpiryCheck(),
    runLowStockCheck(),
  ]);

  return {
    expiryAlerts,
    lowStockAlerts,
    notificationsCreated: expiryAlerts + lowStockAlerts,
  };
}
