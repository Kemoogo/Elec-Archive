import { Schema, model, models, type Document, type Types } from "mongoose";

export type FaxStatus = "pending" | "forwarded" | "closed";
export type FileType = "pdf" | "image";
export type ForwardedToType = "user" | "department";

export interface IFax extends Document {
  faxNumber: string;
  date: Date;
  fromEntity: string;
  toEntity: string;
  subject: string;
  fileUrl: string;
  fileType: FileType;
  status: FaxStatus;
  commanderDecision?: string;
  commanderDecisionAt?: Date;
  forwardedToType?: ForwardedToType;
  forwardedToId?: Types.ObjectId;
  forwardedToDepartment?: string;
  closedBy?: Types.ObjectId;
  closedAt?: Date;
  relatedFaxes: Types.ObjectId[];
  uploadedBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const FaxSchema = new Schema<IFax>(
  {
    faxNumber: { type: String, required: true, trim: true },
    date: { type: Date, required: true },
    fromEntity: { type: String, required: true, trim: true },
    toEntity: { type: String, required: true, trim: true },
    subject: { type: String, required: true, trim: true },
    fileUrl: { type: String, required: true },
    fileType: { type: String, required: true, enum: ["pdf", "image"] },
    status: {
      type: String,
      required: true,
      enum: ["pending", "forwarded", "closed"],
      default: "pending",
    },
    commanderDecision: { type: String, trim: true },
    commanderDecisionAt: { type: Date },
    forwardedToType: { type: String, enum: ["user", "department"] },
    forwardedToId: { type: Schema.Types.ObjectId, ref: "User" },
    forwardedToDepartment: { type: String, trim: true },
    closedBy: { type: Schema.Types.ObjectId, ref: "User" },
    closedAt: { type: Date },
    relatedFaxes: [{ type: Schema.Types.ObjectId, ref: "Fax" }],
    uploadedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true },
);

FaxSchema.index({ faxNumber: 1, date: 1 }, { unique: true });
FaxSchema.index({ status: 1 });
FaxSchema.index({ date: -1 });
FaxSchema.index({ uploadedBy: 1 });
FaxSchema.index({ forwardedToId: 1, status: 1 });
FaxSchema.index({ forwardedToDepartment: 1, status: 1 });

export const Fax = models.Fax ?? model<IFax>("Fax", FaxSchema);
