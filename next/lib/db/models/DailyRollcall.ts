import { Schema, model, models, type Document, type Types } from "mongoose";

export const ROLLCALL_STATUSES = ["present", "absent", "leave", "mission"] as const;
export type RollcallStatus = (typeof ROLLCALL_STATUSES)[number];

export const ROLLCALL_STATUS_LABELS: Record<RollcallStatus, string> = {
  present: "حاضر",
  absent: "غائب",
  leave: "إجازة",
  mission: "مأمورية",
};

export const ROLLCALL_DRAFT_STATUSES = ["draft", "submitted"] as const;
export type RollcallDraftStatus = (typeof ROLLCALL_DRAFT_STATUSES)[number];

export interface IRollcallEntry {
  officerId: Types.ObjectId;
  militaryId: string;
  fullName: string;
  rank: string;
  status: RollcallStatus;
  note?: string;
  relatedLeaveId?: Types.ObjectId;
  relatedAssignmentId?: Types.ObjectId;
}

export interface IDailyRollcall extends Document {
  date: Date;
  status: RollcallDraftStatus;
  targetOfficerCount: number;
  entries: IRollcallEntry[];
  submittedBy?: Types.ObjectId;
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
    relatedLeaveId: { type: Schema.Types.ObjectId, ref: "Leave" },
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
