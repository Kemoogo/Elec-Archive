import { Schema, model, models, type Document, type Types } from "mongoose";

import { 
  POSITION_TYPES, 
  POSITION_STATUSES, 
  POSITION_TYPE_LABELS, 
  POSITION_STATUS_LABELS,
  type PositionType,
  type PositionStatus 
} from "./PositionAssignment.shared";

export { 
  POSITION_TYPES, 
  POSITION_STATUSES, 
  POSITION_TYPE_LABELS, 
  POSITION_STATUS_LABELS,
  type PositionType,
  type PositionStatus 
};

export interface IPositionAssignment extends Document {
  officerId: Types.ObjectId;
  positionTitle: string;
  positionType: PositionType;
  substituteForOfficerId?: Types.ObjectId;
  startDate: Date;
  endDate?: Date;
  orderNumber?: string;
  notes?: string;
  status: PositionStatus;
  createdBy: Types.ObjectId;
  updatedBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const PositionAssignmentSchema = new Schema<IPositionAssignment>(
  {
    officerId: { type: Schema.Types.ObjectId, ref: "Officer", required: true },
    positionTitle: { type: String, required: true, trim: true },
    positionType: {
      type: String,
      required: true,
      enum: POSITION_TYPES,
    },
    substituteForOfficerId: {
      type: Schema.Types.ObjectId,
      ref: "Officer",
    },
    startDate: { type: Date, required: true },
    endDate: { type: Date },
    orderNumber: { type: String, trim: true },
    notes: { type: String, trim: true },
    status: {
      type: String,
      required: true,
      enum: POSITION_STATUSES,
      default: "active",
    },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    updatedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true },
);

PositionAssignmentSchema.pre("validate", function () {
  // 1. endDate must be >= startDate
  if (this.endDate && this.endDate < this.startDate) {
    this.invalidate(
      "endDate",
      "تاريخ الانتهاء يجب أن يكون بعد أو يساوي تاريخ البداية",
    );
  }

  // 2. substituteForOfficerId is forbidden when positionType === "primary"
  if (this.positionType === "primary" && this.substituteForOfficerId) {
    this.invalidate(
      "substituteForOfficerId",
      "لا يمكن تحديد ضابط بديل عنه في تعيين أساسي",
    );
  }

  // 3. substituteForOfficerId is required when positionType === "substitute"
  if (this.positionType === "substitute" && !this.substituteForOfficerId) {
    this.invalidate(
      "substituteForOfficerId",
      "يجب تحديد الضابط الأصلي في التعيين البديل",
    );
  }
});

PositionAssignmentSchema.index({ officerId: 1, startDate: -1 });
PositionAssignmentSchema.index({ status: 1 });
PositionAssignmentSchema.index({ substituteForOfficerId: 1 });

export const PositionAssignment =
  models.PositionAssignment ??
  model<IPositionAssignment>("PositionAssignment", PositionAssignmentSchema);
