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

export interface IPositionHistoryEntry {
  _id?: Types.ObjectId;
  officerId: Types.ObjectId;
  role: PositionType;
  startDate: Date;
  endDate?: Date | null;
  notes?: string;
}

export interface IPositionAssignment extends Document {
  positionTitle: string;
  department: string;
  primaryOfficerId?: Types.ObjectId | null;
  primaryStartDate?: Date | null;
  substituteOfficerIds: Types.ObjectId[];
  substituteStartDates?: { officerId: Types.ObjectId; startDate: Date }[];
  assignmentHistory: IPositionHistoryEntry[];
  hasNoSubstitute?: boolean;
  orderNumber?: string;
  notes?: string;
  createdBy: Types.ObjectId;
  updatedBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const PositionHistoryEntrySchema = new Schema<IPositionHistoryEntry>(
  {
    officerId: { type: Schema.Types.ObjectId, ref: "Officer", required: true },
    role: { type: String, enum: POSITION_TYPES, required: true },
    startDate: { type: Date, required: true },
    endDate: { type: Date, default: null },
    notes: { type: String, trim: true },
  },
  { _id: true, timestamps: false }
);

const PositionAssignmentSchema = new Schema<IPositionAssignment>(
  {
    positionTitle: { type: String, required: true, trim: true },
    department: { type: String, required: true, trim: true, default: "القيادة" },
    primaryOfficerId: { type: Schema.Types.ObjectId, ref: "Officer", default: null },
    primaryStartDate: { type: Date, default: null },
    substituteOfficerIds: [{ type: Schema.Types.ObjectId, ref: "Officer" }],
    substituteStartDates: [
      {
        officerId: { type: Schema.Types.ObjectId, ref: "Officer" },
        startDate: { type: Date, default: Date.now },
      },
    ],
    assignmentHistory: [PositionHistoryEntrySchema],
    hasNoSubstitute: { type: Boolean, default: false },
    orderNumber: { type: String, trim: true },
    notes: { type: String, trim: true },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    updatedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
);

PositionAssignmentSchema.index({ department: 1, positionTitle: 1 });
PositionAssignmentSchema.index({ primaryOfficerId: 1 });
PositionAssignmentSchema.index({ substituteOfficerIds: 1 });
PositionAssignmentSchema.index({ "assignmentHistory.officerId": 1 });

export const PositionAssignment =
  models.PositionAssignment ??
  model<IPositionAssignment>("PositionAssignment", PositionAssignmentSchema);
