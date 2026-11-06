import { Schema, model, models, type Document, type Types } from "mongoose";
import type { BackupType, BackupStatus } from "@/types/backup";

export interface IBackupRecord extends Document {
  filename: string;
  filePath: string;
  fileSizeBytes: number;
  backupType: BackupType;
  quarter?: string;
  status: BackupStatus;
  collectionsCount: number;
  documentsCount: number;
  checksumSha256?: string;
  createdBy: Types.ObjectId;
  createdByName: string;
  deletedAt?: Date;
  deletedReason?: string;
  isIncremental?: boolean;
  baseBackupId?: Types.ObjectId;
  baseBackupFilename?: string;
  createdAt: Date;
  updatedAt: Date;
}

const BackupRecordSchema = new Schema<IBackupRecord>(
  {
    filename: { type: String, required: true, unique: true, index: true, trim: true },
    filePath: { type: String, required: true, trim: true },
    fileSizeBytes: { type: Number, required: true, default: 0 },
    backupType: {
      type: String,
      enum: ["quarterly_scheduled", "manual_export", "incremental"],
      required: true,
      index: true,
    },
    quarter: { type: String, trim: true },
    status: {
      type: String,
      enum: ["in_progress", "completed", "failed", "deleted"],
      default: "in_progress",
      index: true,
    },
    collectionsCount: { type: Number, default: 0 },
    documentsCount: { type: Number, default: 0 },
    checksumSha256: { type: String, trim: true },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    createdByName: { type: String, required: true, trim: true },
    deletedAt: { type: Date },
    deletedReason: { type: String, trim: true },
    isIncremental: { type: Boolean, default: false },
    baseBackupId: { type: Schema.Types.ObjectId, ref: "BackupRecord" },
    baseBackupFilename: { type: String, trim: true },
  },
  {
    timestamps: true,
  }
);

BackupRecordSchema.index({ createdAt: -1 });
BackupRecordSchema.index({ status: 1, createdAt: -1 });

export const BackupRecord =
  models.BackupRecord ?? model<IBackupRecord>("BackupRecord", BackupRecordSchema);
