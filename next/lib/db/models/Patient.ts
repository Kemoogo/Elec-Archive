import { Schema, model, models, type Document, type Types } from "mongoose";

export interface IDispensedMedicine {
  medicineId: Types.ObjectId;
  quantity: number;
}

export interface IPatient extends Document {
  patientId: string;
  patientName: string;
  visitDate: Date;
  diagnosis: string;
  treatment: string;
  dispensedMedicines: IDispensedMedicine[];
  createdAt: Date;
  updatedAt: Date;
}

const PatientSchema = new Schema<IPatient>(
  {
    patientId: { type: String, required: true, trim: true },
    patientName: { type: String, required: true, trim: true },
    visitDate: { type: Date, required: true },
    diagnosis: { type: String, required: true, trim: true },
    treatment: { type: String, required: true, trim: true },
    dispensedMedicines: [
      {
        medicineId: { type: Schema.Types.ObjectId, ref: "Medicine", required: true },
        quantity: { type: Number, required: true, min: 1 },
      },
    ],
  },
  { timestamps: true },
);

PatientSchema.index({ patientId: 1 });
PatientSchema.index({ patientName: 1 });
PatientSchema.index({ visitDate: -1 });

export const Patient = models.Patient ?? model<IPatient>("Patient", PatientSchema);
