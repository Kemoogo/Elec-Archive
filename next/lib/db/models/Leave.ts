import { Schema, model, models, type Document, type Types } from "mongoose";

import { 
  LEAVE_CATEGORIES, 
  LEAVE_TYPES, 
  LEAVE_STATUSES, 
  LEAVE_TYPE_LABELS, 
  LEAVE_STATUS_LABELS,
  OFFICER_LEAVE_SYSTEMS,
  OFFICER_LEAVE_SYSTEM_LABELS,
  LEAVE_REQUEST_TYPES,
  type LeaveCategory,
  type LeaveType,
  type LeaveStatus,
  type OfficerLeaveSystem,
  type LeaveRequestType,
} from "./Leave.shared";

export { 
  LEAVE_CATEGORIES, 
  LEAVE_TYPES, 
  LEAVE_STATUSES, 
  LEAVE_TYPE_LABELS, 
  LEAVE_STATUS_LABELS,
  OFFICER_LEAVE_SYSTEMS,
  OFFICER_LEAVE_SYSTEM_LABELS,
  LEAVE_REQUEST_TYPES,
  type LeaveCategory,
  type LeaveType,
  type LeaveStatus,
  type OfficerLeaveSystem,
  type LeaveRequestType,
};

export interface ILeaveExtension {
  newEndDate: Date;
  reason?: string;
  requestedAt: Date;
  status: "pending" | "approved" | "rejected";
  commanderNotes?: string;
  decidedAt?: Date;
}

export interface ICommanderDecision {
  status: "approved" | "rejected" | "other_orders";
  notes?: string;
  decidedAt?: Date;
  decidedBy?: Types.ObjectId;
}

export interface ILeave extends Document {
  officerId: Types.ObjectId;
  category: LeaveCategory;
  type: LeaveType;
  startDate: Date;
  endDate: Date;
  lastReturnDate?: Date;
  presenceDurationDays?: number;
  actingOfficerId?: Types.ObjectId;
  isActingOfficerPresentConfirmed?: boolean;
  commanderDecision?: ICommanderDecision;
  extensionRequests?: ILeaveExtension[];
  actualReturnDate?: Date;
  originalEndDate?: Date;
  isResumedLeave?: boolean;
  originalLeaveId?: Types.ObjectId;
  isResumed?: boolean;
  resumedLeaveId?: Types.ObjectId;
  compensatedDays?: number;
  isReturnConfirmed?: boolean;
  viewedByCommander?: boolean;
  reason?: string;
  medicalReportUrl?: string;
  status: LeaveStatus;
  createdBy: Types.ObjectId;
  updatedBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const LeaveSchema = new Schema<ILeave>(
  {
    officerId: { type: Schema.Types.ObjectId, ref: "Officer", required: true },
    category: {
      type: String,
      required: true,
      enum: LEAVE_CATEGORIES,
      default: "leave",
    },
    type: {
      type: String,
      required: true,
      enum: LEAVE_TYPES,
      default: "field",
    },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    lastReturnDate: { type: Date },
    presenceDurationDays: { type: Number, default: 0 },
    actingOfficerId: { type: Schema.Types.ObjectId, ref: "Officer" },
    isActingOfficerPresentConfirmed: { type: Boolean, default: false },
    commanderDecision: {
      status: { type: String, enum: ["approved", "rejected", "other_orders"] },
      notes: { type: String, trim: true },
      decidedAt: { type: Date },
      decidedBy: { type: Schema.Types.ObjectId, ref: "User" },
    },
    extensionRequests: [
      {
        newEndDate: { type: Date, required: true },
        reason: { type: String, trim: true },
        requestedAt: { type: Date, default: Date.now },
        status: { type: String, enum: ["pending", "approved", "rejected"], default: "pending" },
        commanderNotes: { type: String, trim: true },
        decidedAt: { type: Date },
      },
    ],
    actualReturnDate: { type: Date },
    originalEndDate: { type: Date },
    isResumedLeave: { type: Boolean, default: false },
    originalLeaveId: { type: Schema.Types.ObjectId, ref: "Leave" },
    isResumed: { type: Boolean, default: false },
    resumedLeaveId: { type: Schema.Types.ObjectId, ref: "Leave" },
    compensatedDays: { type: Number, default: 0 },
    isReturnConfirmed: { type: Boolean, default: false },
    viewedByCommander: { type: Boolean, default: false },
    reason: { type: String, trim: true },
    medicalReportUrl: { type: String, trim: true },
    status: {
      type: String,
      required: true,
      enum: LEAVE_STATUSES,
      default: "pending_commander",
    },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    updatedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true },
);

LeaveSchema.pre("validate", function () {
  if (this.endDate < this.startDate) {
    this.invalidate("endDate", "تاريخ الانتهاء يجب أن يكون بعد أو يساوي تاريخ البداية");
  }
});

LeaveSchema.index({ officerId: 1, startDate: 1, endDate: 1, status: 1 });
LeaveSchema.index({ startDate: 1, endDate: 1, status: 1 });
LeaveSchema.index({ status: 1 });
LeaveSchema.index({ "commanderDecision.decidedAt": -1 }, { sparse: true });

export const Leave = models.Leave ?? model<ILeave>("Leave", LeaveSchema);
