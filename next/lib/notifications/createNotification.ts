import { connectToDatabase } from "@/lib/db/connect";
import { Notification } from "@/lib/db/models/Notification";
import { User } from "@/lib/db/models/User";
import type { NotificationType } from "@/lib/db/models/Notification";
import { emitToUser } from "./emitter";

interface CreateNotificationParams {
  type: NotificationType;
  title: string;
  body: string;
  refId?: string;
  refModel?: string;
}

export async function createNotificationForCommanders(
  params: CreateNotificationParams,
): Promise<void> {
  await connectToDatabase();

  const commanders = await User.find({ role: "commander", isActive: true }).select("_id");

  const notifications = await Promise.all(
    commanders.map((commander) =>
      Notification.create({
        userId: commander._id,
        type: params.type,
        title: params.title,
        body: params.body,
        refId: params.refId,
        refModel: params.refModel,
      }),
    ),
  );

  for (const notification of notifications) {
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
}

export async function createNotificationForOfficersEditors(
  params: CreateNotificationParams,
): Promise<void> {
  await connectToDatabase();

  const editors = await User.find({
    isActive: true,
    "permissions.officers": "edit",
  }).select("_id");

  const notifications = await Promise.all(
    editors.map((editor) =>
      Notification.create({
        userId: editor._id,
        type: params.type,
        title: params.title,
        body: params.body,
        refId: params.refId,
        refModel: params.refModel,
      }),
    ),
  );

  for (const notification of notifications) {
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
}

export async function createNotificationForStaffOps(
  params: CreateNotificationParams,
): Promise<void> {
  await connectToDatabase();

  const staffOps = await User.find({
    isActive: true,
    $or: [{ role: "admin" }, { "permissions.arkan_harb": { $in: ["view", "edit"] } }],
  }).select("_id");

  const notifications = await Promise.all(
    staffOps.map((user) =>
      Notification.create({
        userId: user._id,
        type: params.type,
        title: params.title,
        body: params.body,
        refId: params.refId,
        refModel: params.refModel,
      }),
    ),
  );

  for (const notification of notifications) {
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
}

export async function createNotificationForUser(
  userId: string,
  params: CreateNotificationParams,
): Promise<void> {
  await connectToDatabase();

  const notification = await Notification.create({
    userId,
    type: params.type,
    title: params.title,
    body: params.body,
    refId: params.refId,
    refModel: params.refModel,
  });

  emitToUser(userId, {
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
