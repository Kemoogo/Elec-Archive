import { Schema, model, models, type Document, type Types } from "mongoose";

export const LEAVE_CATEGORIES = ["leave", "absence"] as const;
export type LeaveCategory = (typeof LEAVE_CATEGORIES)[number];

export const LEAVE_TYPES = [
  "annual",
  "sick",
  "emergency",
  "rest",
  "overnight",
  "field",
  "casual",
] as const;
export type LeaveType = (typeof LEAVE_TYPES)[number];

export const LEAVE_STATUSES = ["draft", "approved", "closed", "cancelled"] as const;
export type LeaveStatus = (typeof LEAVE_STATUSES)[number];

export const LEAVE_TYPE_LABELS: Record<LeaveType, string> = {
  annual: "سنوية",
  sick: "مرضية",
  emergency: "طارئة",
  rest: "راحة",
  overnight: "مبيت",
  field: "ميدانية",
  casual: "عارضة",
};

export const LEAVE_STATUS_LABELS: Record<LeaveStatus, string> = {
  draft: "مسودة",
  approved: "معتمدة",
  closed: "منتهية",
  cancelled: "ملغاة",
};

export interface ILeave extends Document {
  officerId: Types.ObjectId;
  category: LeaveCategory;
  type: LeaveType;
  startDate: Date;
  endDate: Date;
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
