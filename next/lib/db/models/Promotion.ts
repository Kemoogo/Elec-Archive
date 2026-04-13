import { Schema, model, models, type Document, type Types } from "mongoose";

import { OFFICER_RANKS, type OfficerRank } from "./Officer";
export { type OfficerRank };

export interface IPromotion extends Document {
  officerId: Types.ObjectId;
  fromRank: OfficerRank;
  toRank: OfficerRank;
  effectiveDate: Date;
  orderNumber?: string;
  notes?: string;
  createdBy: Types.ObjectId;
  updatedBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const PromotionSchema = new Schema<IPromotion>(
  {
    officerId: { type: Schema.Types.ObjectId, ref: "Officer", required: true },
    fromRank: {
      type: String,
      required: true,
      enum: OFFICER_RANKS,
    },
    toRank: {
      type: String,
      required: true,
      enum: OFFICER_RANKS,
    },
    effectiveDate: { type: Date, required: true },
    orderNumber: { type: String, trim: true },
    notes: { type: String, trim: true },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    updatedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true },
);

PromotionSchema.pre("validate", function () {
  // toRank must differ from fromRank — rank changes with identical ranks are invalid
  if (this.toRank && this.fromRank && this.toRank === this.fromRank) {
    this.invalidate(
      "toRank",
      "الرتبة الجديدة يجب أن تكون مختلفة عن الرتبة الحالية",
    );
  }
});

// Fetch a specific officer's promotions ordered by most-recent first
PromotionSchema.index({ officerId: 1, effectiveDate: -1 });

export const Promotion =
  models.Promotion ?? model<IPromotion>("Promotion", PromotionSchema);
