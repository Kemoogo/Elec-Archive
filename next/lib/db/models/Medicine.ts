import { Schema, model, models, type Document } from "mongoose";

export interface IMedicineBatch {
  quantity: number;
  expiryDate: Date;
  receivedAt: Date;
}

export interface IMedicine extends Document {
  name: string;
  unit: string;
  concentration: string;
  minThreshold: number;
  batches: IMedicineBatch[];
  totalQuantity: number; // Computed or maintained field for easy querying
  createdAt: Date;
  updatedAt: Date;
}

const MedicineBatchSchema = new Schema<IMedicineBatch>(
  {
    quantity: { type: Number, required: true, min: 0 },
    expiryDate: { type: Date, required: true },
    receivedAt: { type: Date, default: Date.now },
  },
  { _id: true }
);

const MedicineSchema = new Schema<IMedicine>(
  {
    name: { type: String, required: true, trim: true },
    unit: { type: String, required: true, trim: true },
    concentration: { type: String, trim: true, default: "" },
    minThreshold: { type: Number, required: true, min: 0, default: 10 },
    batches: [MedicineBatchSchema],
    totalQuantity: { type: Number, required: true, default: 0, min: 0 },
  },
  { timestamps: true },
);

// Compound unique index: Name + Unit + Concentration must be unique together
MedicineSchema.index({ name: 1, unit: 1, concentration: 1 }, { unique: true });

export const Medicine = models.Medicine ?? model<IMedicine>("Medicine", MedicineSchema);
