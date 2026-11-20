import { Schema, model, models, type Document, type Types } from "mongoose";

export interface IHistoricalVisit extends Document {
  title: string;
  visitorName: string;
  visitDate: Date;
  description?: string;
  photos: string[];
  createdBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const HistoricalVisitSchema = new Schema<IHistoricalVisit>(
  {
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },
    visitorName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },
    visitDate: {
      type: Date,
      required: true,
    },
    description: {
      type: String,
      trim: true,
      maxlength: 4000,
      default: "",
    },
    photos: {
      type: [String],
      default: [],
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: true },
);

HistoricalVisitSchema.index({ visitDate: -1, createdAt: -1 });
HistoricalVisitSchema.index({ createdBy: 1 });

export const HistoricalVisit =
  models.HistoricalVisit ??
  model<IHistoricalVisit>("HistoricalVisit", HistoricalVisitSchema);
