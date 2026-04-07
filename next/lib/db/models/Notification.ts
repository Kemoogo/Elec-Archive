import { Schema, model, models, type Document, type Types } from "mongoose";

export type NotificationType = "new_fax" | "rollcall_submitted" | "medicine_expiry" | "low_stock" | "officers_reminder";

export interface INotification extends Document {
  userId: Types.ObjectId;
  type: NotificationType;
  title: string;
  body: string;
  isRead: boolean;
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
      enum: ["new_fax", "rollcall_submitted", "medicine_expiry", "low_stock", "officers_reminder"],
    },
    title: { type: String, required: true, trim: true },
    body: { type: String, required: true, trim: true },
    isRead: { type: Boolean, default: false },
    refId: { type: Schema.Types.ObjectId },
    refModel: { type: String },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

NotificationSchema.index({ userId: 1, isRead: 1 });
NotificationSchema.index({ createdAt: -1 });

export const Notification =
  models.Notification ?? model<INotification>("Notification", NotificationSchema);
