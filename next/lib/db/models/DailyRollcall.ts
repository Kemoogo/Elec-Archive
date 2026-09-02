import { Schema, model, models, type Document } from "mongoose";
import {
  ROLLCALL_STATUSES,
  ROLLCALL_DRAFT_STATUSES,
  type RollcallStatus,
  type RollcallDraftStatus,
  type IRollcallEntry,
  PRESENT_STATUSES,
  OUT_STATUSES,
  ROLLCALL_STATUS_LABELS,
  isRollcallPresent,
  isRollcallOut,
} from "./DailyRollcall.shared";

export {
  ROLLCALL_STATUSES,
  ROLLCALL_DRAFT_STATUSES,
  type RollcallStatus,
  type RollcallDraftStatus,
  type IRollcallEntry,
  PRESENT_STATUSES,
  OUT_STATUSES,
  ROLLCALL_STATUS_LABELS,
  isRollcallPresent,
  isRollcallOut,
};

export interface IDailyRollcall extends Document {
  date: Date;
  status: RollcallDraftStatus;
  targetOfficerCount: number;
  entries: IRollcallEntry[];
  submittedBy?: typeof Schema.Types.ObjectId;
  submittedAt?: Date;
  viewedByCommander: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const RollcallEntrySchema = new Schema<IRollcallEntry>(
  {
    officerId: { type: Schema.Types.ObjectId, ref: "Officer", required: true },
    militaryId: { type: String, required: true },
    fullName: { type: String, required: true },
    rank: { type: String, required: true },
    status: {
      type: String,
      required: true,
      enum: ROLLCALL_STATUSES,
    },
    note: { type: String, trim: true },
    customReason: { type: String, trim: true },
    attachedDestination: { type: String, trim: true },
    relatedLeaveId: { type: Schema.Types.ObjectId, ref: "Leave" },
    relatedMissionId: { type: Schema.Types.ObjectId, ref: "Mission" },
    relatedAssignmentId: { type: Schema.Types.ObjectId, ref: "Assignment" },
  },
  { _id: false },
);

const DailyRollcallSchema = new Schema<IDailyRollcall>(
  {
    date: { type: Date, required: true },
    status: {
      type: String,
      required: true,
      enum: ROLLCALL_DRAFT_STATUSES,
      default: "draft",
    },
    targetOfficerCount: { type: Number, required: true, min: 0 },
    entries: { type: [RollcallEntrySchema], default: [] },
    submittedBy: { type: Schema.Types.ObjectId, ref: "User" },
    submittedAt: { type: Date },
    viewedByCommander: { type: Boolean, default: false },
  },
  { timestamps: true },
);

DailyRollcallSchema.index({ date: 1 }, { unique: true });
DailyRollcallSchema.index({ status: 1 });
DailyRollcallSchema.index({ submittedAt: 1 });

export const DailyRollcall =
  models.DailyRollcall ?? model<IDailyRollcall>("DailyRollcall", DailyRollcallSchema);

