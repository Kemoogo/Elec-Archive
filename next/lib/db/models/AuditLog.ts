import { Schema, model, models, type Document, type Types } from "mongoose";

export type AuditAction = "CREATE" | "UPDATE" | "DELETE" | "VIEW" | "LOGIN" | "LOGIN_FAILED" | "LOGOUT" | "LOCK" | "UNLOCK";
export type AuditModule = "auth" | "users" | "fax" | "officers" | "medical" | "students" | "education" | "notifications" | "arkan_harb";

export interface IAuditLog extends Document {
  userId: Types.ObjectId;
  userName: string;
  action: AuditAction;
  module: AuditModule;
  targetId?: Types.ObjectId;
  description: string;
  ipAddress: string;
  createdAt: Date;
}

const AuditLogSchema = new Schema<IAuditLog>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    userName: { type: String, required: true },
    action: {
      type: String,
      required: true,
      enum: ["CREATE", "UPDATE", "DELETE", "VIEW", "LOGIN", "LOGIN_FAILED", "LOGOUT", "LOCK", "UNLOCK"],
    },
    module: {
      type: String,
      required: true,
      enum: ["auth", "users", "fax", "officers", "medical", "students", "education", "notifications", "arkan_harb"],
    },
    targetId: { type: Schema.Types.ObjectId },
    description: { type: String, required: true, trim: true },
    ipAddress: { type: String, required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

AuditLogSchema.index({ userId: 1 });
AuditLogSchema.index({ module: 1 });
AuditLogSchema.index({ createdAt: -1 });
AuditLogSchema.index({ action: 1 });

export const AuditLog = models.AuditLog ?? model<IAuditLog>("AuditLog", AuditLogSchema);
