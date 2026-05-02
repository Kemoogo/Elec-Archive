import { Schema, model, models, type Document, type Types } from "mongoose";
import { MOVEMENT_TYPES, type MovementType } from "./ServiceHistory.shared";

export interface IServiceHistory extends Document {
  officerId: Types.ObjectId;
  type: "join" | "leave" | "return";
  action: MovementType;
  date: Date;
  notes?: string;
  createdBy: Types.ObjectId;
  updatedBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const ServiceHistorySchema = new Schema<IServiceHistory>(
  {
    officerId: { type: Schema.Types.ObjectId, ref: "Officer", required: true },
    type: {
      type: String,
      required: true,
      enum: ["join", "leave", "return"],
    },
    action: {
      type: String,
      required: true,
      enum: MOVEMENT_TYPES,
    },
    date: { type: Date, required: true },
    notes: { type: String, trim: true },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    updatedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true },
);

ServiceHistorySchema.index({ officerId: 1, date: -1 });

export const ServiceHistory =
  models.ServiceHistory ?? model<IServiceHistory>("ServiceHistory", ServiceHistorySchema);
