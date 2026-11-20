import { Schema, model, models, type Document, type Types } from "mongoose";

export interface IOfficerSnapshot {
  militaryId: string;
  fullName: string;
  rank: string;
  seniorityNumber?: string;
}

export interface IHistoricalCommander extends Document {
  officerId?: Types.ObjectId;
  officerSnapshot: IOfficerSnapshot;
  photoUrl?: string;
  startDate: Date;
  endDate?: Date;
  isCurrent: boolean;
  notes?: string;
  createdBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const OfficerSnapshotSchema = new Schema<IOfficerSnapshot>(
  {
    militaryId: {
      type: String,
      required: true,
      trim: true,
      maxlength: 50,
    },
    fullName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 150,
    },
    rank: {
      type: String,
      required: true,
      trim: true,
      maxlength: 60,
    },
    seniorityNumber: {
      type: String,
      trim: true,
      maxlength: 50,
    },
  },
  { _id: false },
);

const HistoricalCommanderSchema = new Schema<IHistoricalCommander>(
  {
    officerId: {
      type: Schema.Types.ObjectId,
      ref: "Officer",
    },
    officerSnapshot: {
      type: OfficerSnapshotSchema,
      required: true,
    },
    photoUrl: {
      type: String,
      trim: true,
    },
    startDate: {
      type: Date,
      required: true,
    },
    endDate: {
      type: Date,
    },
    isCurrent: {
      type: Boolean,
      required: true,
      default: false,
    },
    notes: {
      type: String,
      trim: true,
      maxlength: 4000,
      default: "",
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: true },
);

HistoricalCommanderSchema.index({ startDate: -1, createdAt: -1 });
HistoricalCommanderSchema.index({ officerId: 1 });
HistoricalCommanderSchema.index(
  { isCurrent: 1 },
  {
    unique: true,
    partialFilterExpression: { isCurrent: true },
  },
);

HistoricalCommanderSchema.pre("validate", function (this: IHistoricalCommander) {
  if (this.isCurrent) {
    if (this.endDate !== undefined && this.endDate !== null) {
      this.invalidate("endDate", "لا يمكن تحديد تاريخ انتهاء عند تفعيل حالة (حتى الآن)");
    }
    return;
  }

  if (!this.endDate) {
    this.invalidate("endDate", "تاريخ انتهاء القيادة مطلوب إذا لم يكن القائد حالياً");
    return;
  }

  if (this.startDate) {
    const startIso = this.startDate.toISOString().slice(0, 10);
    const endIso = this.endDate.toISOString().slice(0, 10);
    if (endIso < startIso) {
      this.invalidate("endDate", "تاريخ انتهاء القيادة يجب أن يساوي أو يلحق تاريخ تولي القيادة");
    }
  }
});

export const HistoricalCommander =
  models.HistoricalCommander ??
  model<IHistoricalCommander>("HistoricalCommander", HistoricalCommanderSchema);
