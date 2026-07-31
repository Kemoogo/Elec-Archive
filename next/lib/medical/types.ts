import type { IMedicalVisit } from "@/lib/db/models/MedicalVisit";
import type { IMedicalPatient } from "@/lib/db/models/MedicalPatient";
import type { Types } from "mongoose";

// Server-side database aggregation types
export interface PopulatedDispensedMedicine {
  medicineId: Types.ObjectId | {
    _id: Types.ObjectId;
    name: string;
    concentration?: string;
    unit?: string;
  };
  quantity: number;
}

export interface PopulatedVisit extends Omit<IMedicalVisit, "patientId" | "dispensedMedicines"> {
  patientId: IMedicalPatient;
  dispensedMedicines: PopulatedDispensedMedicine[];
}

// Client-safe API and Component types
export interface MedicalRecord {
  patientId: string;
  patientName: string;
  allergies: string[];
  chronicConditions: string[];
  bloodType?: string;
  medicalNotes: string;
  severityNotes: string;
  version: number;
}

export interface DispensedMedicine {
  medicineName: string;
  quantity: number;
}

export interface Visit {
  _id: string;
  visitDate: string;
  diagnosis: string;
  treatment: string;
  dispensedMedicines: DispensedMedicine[];
  restType?: string;
  restDays?: number;
  fitnessCategory?: string;
}

export interface Medication {
  medicineId: string;
  medicineName: string;
  unit: string;
  concentration: string;
  totalQuantity: number;
  lastDispenseDate: string;
}
