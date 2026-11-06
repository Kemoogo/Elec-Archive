import { connectToDatabase } from "@/lib/db/connect";
import { Medicine } from "@/lib/db/models/Medicine";
import { User } from "@/lib/db/models/User";
import { Notification } from "@/lib/db/models/Notification";
import { emitToUser } from "@/lib/notifications/emitter";
import type { Types } from "mongoose";

export interface CheckResult {
  expiryAlerts: number;
  lowStockAlerts: number;
  notificationsCreated: number;
}

async function getMedicalStaffAndCommanders(): Promise<Array<{ _id: Types.ObjectId }>> {
  return User.find({
    isActive: true,
    $or: [
      { role: "commander" },
      { "permissions.medical": "edit" },
    ],
  }).select("_id").lean();
}

export async function runExpiryCheck(cachedRecipients?: Array<{ _id: Types.ObjectId }>): Promise<number> {
  await connectToDatabase();

  const now = new Date();
  const expiredMedicines = await Medicine.find({
    batches: { $elemMatch: { quantity: { $gt: 0 }, expiryDate: { $lt: now } } },
  }).select("_id name").lean();

  if (expiredMedicines.length === 0) return 0;

  const recipients = cachedRecipients ?? (await getMedicalStaffAndCommanders());
  if (recipients.length === 0) return 0;

  const existing = await Notification.find({
    type: "medicine_expiry",
    isRead: false,
    refId: { $in: expiredMedicines.map((m) => m._id) },
    userId: { $in: recipients.map((u) => u._id) },
  }).select("userId refId").lean();

  const existingSet = new Set(existing.map((n) => `${n.userId.toString()}:${n.refId?.toString()}`));
  const docsToInsert = [];

  for (const med of expiredMedicines) {
    for (const user of recipients) {
      const key = `${user._id.toString()}:${med._id.toString()}`;
      if (!existingSet.has(key)) {
        docsToInsert.push({
          userId: user._id,
          type: "medicine_expiry" as const,
          title: "دواء منتهي الصلاحية",
          body: `دواء ${med.name} يحتوي على تشغيلات منتهية الصلاحية`,
          refId: med._id,
          refModel: "Medicine" as const,
          isRead: false,
        });
      }
    }
  }

  if (docsToInsert.length === 0) return 0;

  const inserted = await Notification.insertMany(docsToInsert);
  for (const notification of inserted) {
    emitToUser(notification.userId.toString(), {
      _id: notification._id.toString(),
      type: notification.type,
      title: notification.title,
      body: notification.body,
      isRead: notification.isRead,
      refId: notification.refId?.toString(),
      refModel: notification.refModel,
      createdAt: notification.createdAt.toISOString(),
    });
  }

  return inserted.length;
}

export async function runLowStockCheck(cachedRecipients?: Array<{ _id: Types.ObjectId }>): Promise<number> {
  await connectToDatabase();

  const lowStockMedicines = await Medicine.find({
    $expr: { $lt: ["$totalQuantity", "$minThreshold"] },
  }).select("_id name totalQuantity minThreshold").lean();

  if (lowStockMedicines.length === 0) return 0;

  const recipients = cachedRecipients ?? (await getMedicalStaffAndCommanders());
  if (recipients.length === 0) return 0;

  const existing = await Notification.find({
    type: "low_stock",
    isRead: false,
    refId: { $in: lowStockMedicines.map((m) => m._id) },
    userId: { $in: recipients.map((u) => u._id) },
  }).select("userId refId").lean();

  const existingSet = new Set(existing.map((n) => `${n.userId.toString()}:${n.refId?.toString()}`));
  const docsToInsert = [];

  for (const med of lowStockMedicines) {
    for (const user of recipients) {
      const key = `${user._id.toString()}:${med._id.toString()}`;
      if (!existingSet.has(key)) {
        docsToInsert.push({
          userId: user._id,
          type: "low_stock" as const,
          title: "مخزون منخفض",
          body: `${med.name}: الكمية أقل من الحد الأدنى (${med.totalQuantity}/${med.minThreshold})`,
          refId: med._id,
          refModel: "Medicine" as const,
          isRead: false,
        });
      }
    }
  }

  if (docsToInsert.length === 0) return 0;

  const inserted = await Notification.insertMany(docsToInsert);
  for (const notification of inserted) {
    emitToUser(notification.userId.toString(), {
      _id: notification._id.toString(),
      type: notification.type,
      title: notification.title,
      body: notification.body,
      isRead: notification.isRead,
      refId: notification.refId?.toString(),
      refModel: notification.refModel,
      createdAt: notification.createdAt.toISOString(),
    });
  }

  return inserted.length;
}

export async function runAllChecks(): Promise<CheckResult> {
  await connectToDatabase();
  const recipients = await getMedicalStaffAndCommanders();

  const [expiryAlerts, lowStockAlerts] = await Promise.all([
    runExpiryCheck(recipients),
    runLowStockCheck(recipients),
  ]);

  return {
    expiryAlerts,
    lowStockAlerts,
    notificationsCreated: expiryAlerts + lowStockAlerts,
  };
}
