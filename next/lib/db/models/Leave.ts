import { Schema, model, models, type Document, type Types } from "mongoose";

import { 
  LEAVE_CATEGORIES, 
  LEAVE_TYPES, 
  LEAVE_STATUSES, 
  LEAVE_TYPE_LABELS, 
  LEAVE_STATUS_LABELS,
  type LeaveCategory,
  type LeaveType,
  type LeaveStatus 
} from "./Leave.shared";

export { 
  LEAVE_CATEGORIES, 
  LEAVE_TYPES, 
  LEAVE_STATUSES, 
  LEAVE_TYPE_LABELS, 
  LEAVE_STATUS_LABELS,
  type LeaveCategory,
  type LeaveType,
  type LeaveStatus 
};

export interface ILeave extends Document {
  officerId: Types.ObjectId;
  category: LeaveCategory;
  type: LeaveType;
  startDate: Date;
  endDate: Date;
  actualReturnDate?: Date;
  reason?: string;
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
    },
    type: {
      type: String,
      required: true,
      enum: LEAVE_TYPES,
    },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    actualReturnDate: { type: Date },
    reason: { type: String, trim: true },
    status: {
      type: String,
      required: true,
      enum: LEAVE_STATUSES,
      default: "draft",
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
LeaveSchema.index({ status: 1 });

export const Leave = models.Leave ?? model<ILeave>("Leave", LeaveSchema);
