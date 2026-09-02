import { Schema, model, models, type Document, Types } from "mongoose";

export interface IDepartment extends Document {
  name: string;
  code?: string;
  branchId: Types.ObjectId;
  description?: string;
  isActive: boolean;
  order: number;
  createdAt: Date;
  updatedAt: Date;
}

const DepartmentSchema = new Schema<IDepartment>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    code: {
      type: String,
      trim: true,
    },
    branchId: {
      type: Schema.Types.ObjectId,
      ref: "Branch",
      required: true,
    },
    description: {
      type: String,
      trim: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    order: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

DepartmentSchema.index({ branchId: 1, name: 1 }, { unique: true });
DepartmentSchema.index({ order: 1 });

export const Department = models.Department ?? model<IDepartment>("Department", DepartmentSchema);
