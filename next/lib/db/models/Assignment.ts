import { Schema, model, models, type Document, type Types } from "mongoose";

export const ASSIGNMENT_TYPES = ["assignment", "promotion", "mission"] as const;
export type AssignmentType = (typeof ASSIGNMENT_TYPES)[number];

export const ASSIGNMENT_STATUSES = ["scheduled", "active", "completed", "cancelled"] as const;
export type AssignmentStatus = (typeof ASSIGNMENT_STATUSES)[number];

export const ASSIGNMENT_TYPE_LABELS: Record<AssignmentType, string> = {
  assignment: "تكليف",
  promotion: "ترقية",
  mission: "مأمورية",
};

export const ASSIGNMENT_STATUS_LABELS: Record<AssignmentStatus, string> = {
  scheduled: "مجدولة",
  active: "نشطة",
  completed: "منتهية",
  cancelled: "ملغاة",
};

export interface IAssignment extends Document {
  officerId: Types.ObjectId;
  type: AssignmentType;
  title: string;
  description?: string;
  effectiveDate: Date;
  endDate?: Date;
  status: AssignmentStatus;
  createdBy: Types.ObjectId;
  updatedBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const AssignmentSchema = new Schema<IAssignment>(
  {
    officerId: { type: Schema.Types.ObjectId, ref: "Officer", required: true },
    type: {
      type: String,
      required: true,
      enum: ASSIGNMENT_TYPES,
    },
    title: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    effectiveDate: { type: Date, required: true },
    endDate: { type: Date },
    status: {
      type: String,
      required: true,
      enum: ASSIGNMENT_STATUSES,
      default: "scheduled",
    },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    updatedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true },
);

AssignmentSchema.pre("validate", function () {
  if (this.endDate && this.endDate < this.effectiveDate) {
    this.invalidate("endDate", "تاريخ الانتهاء يجب أن يكون بعد أو يساوي تاريخ السريان");
  }
});

AssignmentSchema.index({ officerId: 1, effectiveDate: -1, type: 1 });
AssignmentSchema.index({ status: 1 });

export const Assignment = models.Assignment ?? model<IAssignment>("Assignment", AssignmentSchema);
