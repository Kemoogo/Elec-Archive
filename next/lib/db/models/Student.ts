import { Schema, model, models, type Document } from "mongoose";

export type StudentStatus = "active" | "graduated" | "inactive" | "withdrawn";

export interface IStudentDocument {
  name: string;
  fileUrl: string;
  uploadedAt: Date;
}

export interface IStudent extends Document {
  studentId: string;
  fullName: string;
  enrollDate: Date;
  status: StudentStatus;
  documents: IStudentDocument[];
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const StudentSchema = new Schema<IStudent>(
  {
    studentId: { type: String, required: true, unique: true, trim: true },
    fullName: { type: String, required: true, trim: true },
    enrollDate: { type: Date, required: true },
    status: {
      type: String,
      enum: ["active", "graduated", "inactive", "withdrawn"],
      default: "active",
    },
    documents: [
      {
        name: { type: String, required: true },
        fileUrl: { type: String, required: true },
        uploadedAt: { type: Date, default: Date.now },
      },
    ],
    notes: { type: String, trim: true },
  },
  { timestamps: true },
);


StudentSchema.index({ fullName: 1 });
StudentSchema.index({ status: 1 });

export const Student = models.Student ?? model<IStudent>("Student", StudentSchema);
