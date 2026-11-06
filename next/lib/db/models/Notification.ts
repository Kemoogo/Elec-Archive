import { Schema, model, models, type Document, type Types } from "mongoose";

export const NOTIFICATION_TYPES = [
  "new_fax",
  "rollcall_submitted",
  "medicine_expiry",
  "low_stock",
  "officers_reminder",
  "rollcall_reminder",
  "rollcall_approved",
  "leave_decision",
  "leave_request",
] as const;

export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

export interface INotification extends Document {
  userId: Types.ObjectId;
  type: NotificationType;
  title: string;
  body: string;
  isRead: boolean;
  readAt?: Date;
  refId?: Types.ObjectId;
  refModel?: string;
  createdAt: Date;
}

const NotificationSchema = new Schema<INotification>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    type: {
      type: String,
      required: true,
      enum: NOTIFICATION_TYPES,
    },
    title: { type: String, required: true, trim: true },
    body: { type: String, required: true, trim: true },
    isRead: { type: Boolean, default: false },
    readAt: { type: Date },
    refId: { type: Schema.Types.ObjectId },
    refModel: { type: String },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

NotificationSchema.index({ userId: 1, isRead: 1 });
NotificationSchema.index({ userId: 1, createdAt: -1 });
NotificationSchema.index({ type: 1, createdAt: -1 });
NotificationSchema.index({ createdAt: -1 });

export const Notification =
  models.Notification || model<INotification>("Notification", NotificationSchema);
