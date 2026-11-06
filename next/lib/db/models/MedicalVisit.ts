import { Schema, model, models, type Document, type Types } from "mongoose";

export interface IMedicalVisit extends Document {
  patientId: Types.ObjectId; // Reference to MedicalPatient._id
  visitDate: Date;
  diagnosis: string;
  treatment: string;
  dispensedMedicines: {
    medicineId: Types.ObjectId; // Reference to Medicine._id
    quantity: number;
  }[];
  restType?: string; // 'none' | 'ward' | 'home' | 'exemption'
  restDays?: number;
  fitnessCategory?: string; // 'fit' | 'class_a' | 'class_b' | 'class_c' | 'temporary_unfit'
  createdAt: Date;
  updatedAt: Date;
}

const MedicalVisitSchema = new Schema<IMedicalVisit>(
  {
    patientId: { type: Schema.Types.ObjectId, ref: "MedicalPatient", required: true },
    visitDate: { type: Date, required: true, default: Date.now },
    diagnosis: { type: String, required: true, trim: true },
    treatment: { type: String, required: false, trim: true, default: "" },
    dispensedMedicines: [
      {
        medicineId: { type: Schema.Types.ObjectId, ref: "Medicine", required: true },
        quantity: { type: Number, required: true, min: 1 },
      },
    ],
    restType: { type: String, required: false, default: "none" },
    restDays: { type: Number, required: false, default: 0 },
    fitnessCategory: { type: String, required: false, default: "fit" },
  },
  { timestamps: true },
);

MedicalVisitSchema.index({ patientId: 1, visitDate: -1 });
MedicalVisitSchema.index({ patientId: 1 });
MedicalVisitSchema.index({ visitDate: -1 });

export const MedicalVisit = models.MedicalVisit ?? model<IMedicalVisit>("MedicalVisit", MedicalVisitSchema);
