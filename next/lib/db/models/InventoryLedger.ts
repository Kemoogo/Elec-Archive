import { Schema, model, models, type Document, type Types } from "mongoose";

export type InventoryAction = "RESTOCK" | "DISPENSE" | "ADJUST";

export interface IInventoryLedger extends Document {
  medicineId: Types.ObjectId;
  action: InventoryAction;
  quantityChange: number; // Positive for restock, negative for dispense
  balanceAfter: number; // The new totalQuantity of the medicine after this action
  referenceId?: Types.ObjectId; // E.g., MedicalVisit._id if it's a dispense
  notes?: string;
  createdAt: Date;
}

const InventoryLedgerSchema = new Schema<IInventoryLedger>(
  {
    medicineId: { type: Schema.Types.ObjectId, ref: "Medicine", required: true },
    action: { type: String, enum: ["RESTOCK", "DISPENSE", "ADJUST"], required: true },
    quantityChange: { type: Number, required: true },
    balanceAfter: { type: Number, required: true },
    referenceId: { type: Schema.Types.ObjectId },
    notes: { type: String, trim: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

InventoryLedgerSchema.index({ medicineId: 1, createdAt: -1 });

export const InventoryLedger = models.InventoryLedger ?? model<IInventoryLedger>("InventoryLedger", InventoryLedgerSchema);
