import { Schema, model, models, type Document, type Types } from "mongoose";

import { 
  MISSION_STATUSES, 
  MISSION_STATUS_LABELS, 
  MISSION_TYPES,
  MISSION_TYPE_LABELS,
  type MissionStatus,
  type MissionType 
} from "./Mission.shared";

export { 
  MISSION_STATUSES, 
  MISSION_STATUS_LABELS, 
  MISSION_TYPES,
  MISSION_TYPE_LABELS,
  type MissionStatus,
  type MissionType 
};

export interface IMission extends Document {
  officerId: Types.ObjectId;
  additionalOfficerIds?: Types.ObjectId[];
  missionType?: MissionType;
  title: string;
  description?: string;
  destination?: string;
  startDate: Date;
  endDate?: Date;
  status: MissionStatus;
  statusReason?: string;
  resultSummary?: string;
  linkedFaxId?: string;
  completedAt?: Date;
  createdBy: Types.ObjectId;
  updatedBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const MissionSchema = new Schema<IMission>(
  {
    officerId: { type: Schema.Types.ObjectId, ref: "Officer", required: true },
    additionalOfficerIds: [{ type: Schema.Types.ObjectId, ref: "Officer" }],
    missionType: {
      type: String,
      enum: MISSION_TYPES,
      default: "external_multiday",
    },
    title: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    destination: { type: String, trim: true },
    startDate: { type: Date, required: true },
    endDate: { type: Date },
    status: {
      type: String,
      required: true,
      enum: MISSION_STATUSES,
      default: "scheduled",
    },
    statusReason: { type: String, trim: true },
    resultSummary: { type: String, trim: true },
    linkedFaxId: { type: String, trim: true },
    completedAt: { type: Date },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    updatedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true },
);

MissionSchema.pre("validate", function () {
  // endDate, when provided, must be >= startDate
  if (this.endDate && this.endDate < this.startDate) {
    this.invalidate(
      "endDate",
      "تاريخ الانتهاء يجب أن يكون بعد أو يساوي تاريخ البداية",
    );
  }
});

// Fetch a specific officer's missions ordered by most-recent first
MissionSchema.index({ officerId: 1, startDate: -1 });
// Filter missions by lifecycle status (e.g. all active missions)
MissionSchema.index({ status: 1 });

export const Mission =
  models.Mission ?? model<IMission>("Mission", MissionSchema);
