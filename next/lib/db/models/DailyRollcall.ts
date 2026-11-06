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
  type ICustomRollcallTable,
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
  type ICustomRollcallTable,
};

export interface IDailyRollcall extends Document {
  date: Date;
  status: RollcallDraftStatus;
  targetOfficerCount: number;
  entries: IRollcallEntry[];
  customTables?: ICustomRollcallTable[];
  confirmedOfficerIds?: (typeof Schema.Types.ObjectId | string)[];
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
    hospitalName: { type: String, trim: true },
    hospitalAdmissionDate: { type: String, trim: true },
    disciplinaryType: { type: String, trim: true },
    disciplinaryAuthority: { type: String, trim: true },
    travelDestination: { type: String, trim: true },
    travelPurpose: { type: String, trim: true },
    statusStartDate: { type: String, trim: true },
    statusEndDate: { type: String, trim: true },
    relatedLeaveId: { type: Schema.Types.ObjectId, ref: "Leave" },
    relatedMissionId: { type: Schema.Types.ObjectId, ref: "Mission" },
    relatedAssignmentId: { type: Schema.Types.ObjectId, ref: "Assignment" },
    isLocked: { type: Boolean, default: false },
    lockReason: { type: String, trim: true },
    sourceId: { type: String, trim: true },
    sourceType: { type: String, enum: ["leave", "mission"] },
    isReturningToday: { type: Boolean, default: false },
    leaveTypeLabel: { type: String, trim: true },
    leaveStartDate: { type: String, trim: true },
    leaveEndDate: { type: String, trim: true },
    missionTitle: { type: String, trim: true },
    missionDestination: { type: String, trim: true },
    missionStartDate: { type: String, trim: true },
    missionEndDate: { type: String, trim: true },
    isCourse: { type: Boolean, default: false },
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
    customTables: [
      {
        id: { type: String, required: true },
        name: { type: String, required: true },
        isInsideUnit: { type: Boolean, default: false },
        officerIds: [{ type: Schema.Types.ObjectId, ref: "Officer" }],
        officerTasks: { type: Map, of: String },
        notes: { type: String, trim: true },
      },
    ],
    confirmedOfficerIds: [{ type: Schema.Types.ObjectId, ref: "Officer" }],
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

