import { Schema, model, models, type Document } from "mongoose";

export interface IPatientMedicalRecord extends Document {
  patientId: string;
  patientName: string;
  allergies: string[];
  chronicConditions: string[];
  bloodType?: string;
  medicalNotes: string;
  severityNotes: string;
  version: number;
  createdAt: Date;
  updatedAt: Date;
}

const PatientMedicalRecordSchema = new Schema<IPatientMedicalRecord>(
  {
    patientId: { type: String, required: true, unique: true, trim: true },
    patientName: { type: String, required: true, trim: true },
    allergies: { type: [String], default: [], trim: true },
    chronicConditions: { type: [String], default: [], trim: true },
    bloodType: { type: String, enum: ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"], trim: true },
    medicalNotes: { type: String, default: "", trim: true },
    severityNotes: { type: String, default: "", trim: true },
    version: { type: Number, required: true, default: 0, min: 0 },
  },
  { timestamps: true },
);

PatientMedicalRecordSchema.index({ patientName: "text" });

export const PatientMedicalRecord = models.PatientMedicalRecord ?? model<IPatientMedicalRecord>("PatientMedicalRecord", PatientMedicalRecordSchema);
