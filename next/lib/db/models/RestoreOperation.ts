import { Schema, model, models, type Document, type Types } from "mongoose";
import type { RestoreStatus } from "@/types/backup";

export interface IRestoreOperation extends Document {
  backupId: Types.ObjectId;
  backupFilename: string;
  status: RestoreStatus;
  startedAt: Date;
  completedAt?: Date;
  durationSeconds?: number;
  performedBy: Types.ObjectId;
  performedByName: string;
  errorDetails?: string;
  createdAt: Date;
}

const RestoreOperationSchema = new Schema<IRestoreOperation>(
  {
    backupId: { type: Schema.Types.ObjectId, ref: "BackupRecord", required: true, index: true },
    backupFilename: { type: String, required: true, trim: true },
    status: {
      type: String,
      enum: ["in_progress", "completed", "failed"],
      default: "in_progress",
      index: true,
    },
    startedAt: { type: Date, required: true, default: Date.now },
    completedAt: { type: Date },
    durationSeconds: { type: Number },
    performedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    performedByName: { type: String, required: true, trim: true },
    errorDetails: { type: String, trim: true },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

RestoreOperationSchema.index({ createdAt: -1 });

export const RestoreOperation =
  models.RestoreOperation ?? model<IRestoreOperation>("RestoreOperation", RestoreOperationSchema);
