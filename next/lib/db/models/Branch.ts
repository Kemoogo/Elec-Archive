import { Schema, model, models, type Document } from "mongoose";

export interface IBranch extends Document {
  name: string;
  code?: string;
  description?: string;
  isActive: boolean;
  order: number;
  createdAt: Date;
  updatedAt: Date;
}

const BranchSchema = new Schema<IBranch>(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    code: {
      type: String,
      trim: true,
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

BranchSchema.index({ order: 1 });

export const Branch = models.Branch ?? model<IBranch>("Branch", BranchSchema);
