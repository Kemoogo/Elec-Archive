import { Schema, model, models, type Document } from "mongoose";
import {
  type IBatchClassification,
  DEFAULT_BATCH_CLASSIFICATIONS,
} from "./StudentBatch.shared";

export * from "./StudentBatch.shared";

export interface IStudentBatch extends Document {
  mrhla: string;
  name: string;
  targetCount: number;
  arrivedCount: number;
  remainingCount: number;
  isActiveStage: boolean;
  classifications: IBatchClassification[];
  startDate?: Date;
  endDate?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const BatchClassificationSchema = new Schema<IBatchClassification>(
  {
    id: { type: String, required: true },
    name: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    isDefault: { type: Boolean, default: false },
  },
  { _id: false }
);

const StudentBatchSchema = new Schema<IStudentBatch>(
  {
    mrhla: { type: String, required: true, unique: true, index: true, trim: true },
    name: { type: String, required: true, trim: true },
    targetCount: { type: Number, default: 0 },
    arrivedCount: { type: Number, default: 0 },
    remainingCount: { type: Number, default: 0 },
    isActiveStage: { type: Boolean, default: false, index: true },
    classifications: {
      type: [BatchClassificationSchema],
      default: () => [...DEFAULT_BATCH_CLASSIFICATIONS],
    },
    startDate: { type: Date },
    endDate: { type: Date },
  },
  { timestamps: true }
);

StudentBatchSchema.index({ isActiveStage: 1 });

export const StudentBatch =
  models.StudentBatch ?? model<IStudentBatch>("StudentBatch", StudentBatchSchema);
