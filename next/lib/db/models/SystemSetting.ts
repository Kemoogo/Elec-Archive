import { Schema, model, models, type Document, type Types } from "mongoose";

export interface ISystemSetting extends Document {
  key: string;
  value: string;
  description?: string;
  updatedBy?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const SystemSettingSchema = new Schema<ISystemSetting>(
  {
    key: { type: String, required: true, unique: true, trim: true, index: true },
    value: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    updatedBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

export const SystemSetting =
  models.SystemSetting ?? model<ISystemSetting>("SystemSetting", SystemSettingSchema);
