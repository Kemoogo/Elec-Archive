import { Schema, model, models, type Document, type Types } from "mongoose";
import {
  UNIT_MILESTONE_CATEGORIES,
  type UnitMilestoneCategory,
} from "./UnitHistoricalInfo.shared";

export interface IUnitHistoricalProfile extends Document {
  singletonKey: string;
  unitName: string;
  foundingDate?: Date;
  affiliation?: string;
  location?: string;
  motto?: string;
  mission?: string;
  emblemUrl?: string;
  updatedBy?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const UnitHistoricalProfileSchema = new Schema<IUnitHistoricalProfile>(
  {
    singletonKey: {
      type: String,
      default: "default",
      unique: true,
      immutable: true,
    },
    unitName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },
    foundingDate: {
      type: Date,
    },
    affiliation: {
      type: String,
      trim: true,
      maxlength: 200,
      default: "",
    },
    location: {
      type: String,
      trim: true,
      maxlength: 200,
      default: "",
    },
    motto: {
      type: String,
      trim: true,
      maxlength: 300,
      default: "",
    },
    mission: {
      type: String,
      trim: true,
      maxlength: 2000,
      default: "",
    },
    emblemUrl: {
      type: String,
      trim: true,
    },
    updatedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
  },
  { timestamps: true },
);

export interface IUnitHistoricalMilestone extends Document {
  milestoneDate: Date;
  title: string;
  category: UnitMilestoneCategory;
  description?: string;
  photos: string[];
  createdBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const UnitHistoricalMilestoneSchema = new Schema<IUnitHistoricalMilestone>(
  {
    milestoneDate: {
      type: Date,
      required: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },
    category: {
      type: String,
      required: true,
      enum: UNIT_MILESTONE_CATEGORIES,
      default: "other",
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

UnitHistoricalMilestoneSchema.index({ milestoneDate: -1, createdAt: -1 });
UnitHistoricalMilestoneSchema.index({ category: 1, milestoneDate: -1 });

export const UnitHistoricalProfile =
  models.UnitHistoricalProfile ??
  model<IUnitHistoricalProfile>(
    "UnitHistoricalProfile",
    UnitHistoricalProfileSchema,
  );

export const UnitHistoricalMilestone =
  models.UnitHistoricalMilestone ??
  model<IUnitHistoricalMilestone>(
    "UnitHistoricalMilestone",
    UnitHistoricalMilestoneSchema,
  );
