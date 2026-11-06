import { Schema, model, models, type Document, type Types } from "mongoose";

import {
  DEFAULT_DUTY_ROLES,
  DUTY_TYPES,
  DUTY_TYPE_LABELS,
  DUTY_ROSTER_STATUSES,
  DUTY_ROSTER_STATUS_LABELS,
  type DefaultDutyRoleKey,
  type DutyType,
  type DutyRosterStatus,
  type IDutyRosterEntry,
  type IOfficerDutyEquityStat,
  type WeekDayInfo,
} from "./DutyRoster.shared";

export {
  DEFAULT_DUTY_ROLES,
  DUTY_TYPES,
  DUTY_TYPE_LABELS,
  DUTY_ROSTER_STATUSES,
  DUTY_ROSTER_STATUS_LABELS,
  type DefaultDutyRoleKey,
  type DutyType,
  type DutyRosterStatus,
  type IDutyRosterEntry,
  type IOfficerDutyEquityStat,
  type WeekDayInfo,
};

export interface IDutySwapDocRecord {
  fromOfficerId: Types.ObjectId;
  toOfficerId: Types.ObjectId;
  targetRole: "primary" | "yadak";
  reason?: string;
  swappedAt: Date;
  swappedBy?: Types.ObjectId;
}

export interface IDutyRosterDocEntry {
  date: Date;
  dutyType: string;
  dutyTitle: string;
  assignedOfficerId: Types.ObjectId;
  yadakOfficerId?: Types.ObjectId;
  substituteOfficerId?: Types.ObjectId;
  isSwapped?: boolean;
  originalOfficerId?: Types.ObjectId;
  swapReason?: string;
  swappedAt?: Date;
  swappedBy?: Types.ObjectId;
  swapHistory?: IDutySwapDocRecord[];
  isForcedAssignment?: boolean;
  notes?: string;
  isHoliday: boolean;
}

export interface IDutyRoster extends Document {
  startDate: Date;
  endDate: Date;
  weekNumber?: number;
  year?: number;
  month?: number;
  customDuties?: string[];
  status: DutyRosterStatus;
  entries: IDutyRosterDocEntry[];
  approvedByCommander?: boolean;
  commanderDecisionDate?: Date;
  commanderNotes?: string;
  createdBy: Types.ObjectId;
  updatedBy?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const DutySwapRecordSchema = new Schema<IDutySwapDocRecord>(
  {
    fromOfficerId: { type: Schema.Types.ObjectId, ref: "Officer", required: true },
    toOfficerId: { type: Schema.Types.ObjectId, ref: "Officer", required: true },
    targetRole: { type: String, enum: ["primary", "yadak"], default: "primary" },
    reason: { type: String, trim: true, default: "" },
    swappedAt: { type: Date, default: Date.now },
    swappedBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { _id: false }
);

const DutyRosterEntrySchema = new Schema<IDutyRosterDocEntry>(
  {
    date: { type: Date, required: true },
    dutyType: {
      type: String,
      default: "unit_duty",
      required: true,
      trim: true,
    },
    dutyTitle: { type: String, required: true, trim: true },
    assignedOfficerId: {
      type: Schema.Types.ObjectId,
      ref: "Officer",
      required: true,
    },
    yadakOfficerId: {
      type: Schema.Types.ObjectId,
      ref: "Officer",
    },
    substituteOfficerId: {
      type: Schema.Types.ObjectId,
      ref: "Officer",
    },
    isSwapped: { type: Boolean, default: false },
    originalOfficerId: {
      type: Schema.Types.ObjectId,
      ref: "Officer",
    },
    swapReason: { type: String, trim: true },
    swappedAt: { type: Date },
    swappedBy: { type: Schema.Types.ObjectId, ref: "User" },
    swapHistory: { type: [DutySwapRecordSchema], default: [] },
    isForcedAssignment: { type: Boolean, default: false },
    notes: { type: String, trim: true },
    isHoliday: { type: Boolean, default: false },
  },
  { _id: false },
);

const DutyRosterSchema = new Schema<IDutyRoster>(
  {
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    weekNumber: { type: Number },
    year: { type: Number },
    month: { type: Number },
    customDuties: [{ type: String, trim: true }],
    status: {
      type: String,
      enum: DUTY_ROSTER_STATUSES,
      default: "draft",
      required: true,
    },
    entries: [DutyRosterEntrySchema],
    approvedByCommander: { type: Boolean, default: false },
    commanderDecisionDate: { type: Date },
    commanderNotes: { type: String, trim: true },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    updatedBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true },
);

// One roster per week start date
DutyRosterSchema.index({ startDate: 1 }, { unique: true });
DutyRosterSchema.index({ startDate: 1, endDate: 1 });
// Fast query for entries by date
DutyRosterSchema.index({ "entries.date": 1 });
DutyRosterSchema.index({ "entries.assignedOfficerId": 1, "entries.date": 1 });

export const DutyRoster =
  models.DutyRoster ?? model<IDutyRoster>("DutyRoster", DutyRosterSchema);

