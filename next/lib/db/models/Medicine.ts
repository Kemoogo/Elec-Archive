import { Schema, model, models, type Document } from "mongoose";

export interface IMedicine extends Document {
  name: string;
  unit: string;
  quantity: number;
  expiryDate: Date;
  minThreshold: number;
  createdAt: Date;
  updatedAt: Date;
}

const MedicineSchema = new Schema<IMedicine>(
  {
    name: { type: String, required: true, trim: true },
    unit: { type: String, required: true, trim: true },
    quantity: { type: Number, required: true, min: 0 },
    expiryDate: { type: Date, required: true },
    minThreshold: { type: Number, required: true, min: 0 },
  },
  { timestamps: true },
);

MedicineSchema.index({ expiryDate: 1 });
MedicineSchema.index({ name: 1 });

export const Medicine = models.Medicine ?? model<IMedicine>("Medicine", MedicineSchema);
