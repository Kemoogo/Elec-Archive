import { Schema, model, models, type Document, type Types } from "mongoose";

export type CourseStatus = "upcoming" | "ongoing" | "completed";

export interface ICourseDocument {
  name: string;
  fileUrl: string;
}

export interface ICourse extends Document {
  title: string;
  description?: string;
  startDate: Date;
  endDate: Date;
  status: CourseStatus;
  participantModel: "Officer" | "Student";
  participants: Types.ObjectId[];
  documents: ICourseDocument[];
  createdAt: Date;
  updatedAt: Date;
}

const CourseSchema = new Schema<ICourse>(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    status: {
      type: String,
      required: true,
      enum: ["upcoming", "ongoing", "completed"],
      default: "upcoming",
    },
    participantModel: {
      type: String,
      required: true,
      enum: ["Officer", "Student"],
    },
    participants: [{ type: Schema.Types.ObjectId, refPath: "participantModel" }],
    documents: [
      {
        name: { type: String, required: true },
        fileUrl: { type: String, required: true },
      },
    ],
  },
  { timestamps: true },
);

CourseSchema.pre("validate", function () {
  if (this.endDate < this.startDate) {
    this.invalidate("endDate", "endDate must be after or equal to startDate", this.endDate);
  }
});

CourseSchema.index({ status: 1 });
CourseSchema.index({ startDate: 1 });
CourseSchema.index({ participantModel: 1, status: 1, startDate: 1, endDate: 1, participants: 1 });

export const Course = models.Course ?? model<ICourse>("Course", CourseSchema);
