import { Schema, model, models, type Document } from "mongoose";

export interface IMedicalPatient extends Document {
  patientId: string; // Military ID or generic ID
  patientName: string;
  bloodType?: string;
  chronicDiseases?: string;
  allergies?: string;
  createdAt: Date;
  updatedAt: Date;
}

const MedicalPatientSchema = new Schema<IMedicalPatient>(
  {
    patientId: { type: String, required: true, unique: true, trim: true },
    patientName: { type: String, required: true, trim: true },
    bloodType: { type: String, trim: true },
    chronicDiseases: { type: String, trim: true },
    allergies: { type: String, trim: true },
  },
  { timestamps: true },
);

MedicalPatientSchema.index({ patientName: "text" });

export const MedicalPatient = models.MedicalPatient ?? model<IMedicalPatient>("MedicalPatient", MedicalPatientSchema);
