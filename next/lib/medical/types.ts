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

export interface MedicalDashboardStats {
  visitsToday: number;
  lowStockCount: number;
  expiredCount: number;
  totalMedicines: number;
}

export interface MedicalDashboardVisitItem {
  _id: string;
  id?: string;
  className?: string;
  patientId: string;
  patientName: string;
  visitDate: string;
  diagnosis: string;
  treatment: string;
  restType?: string;
  restDays?: number;
  fitnessCategory?: string;
  dispensedMedicines: Array<{
    medicineId: string;
    medicineName: string;
    quantity: number;
  }>;
}

export interface MedicalDashboardMedicineItem {
  _id: string;
  id?: string;
  className?: string;
  name: string;
  unit: string;
  concentration: string;
  quantity: number;
  expiryDate: string;
  minThreshold: number;
  isExpired: boolean;
}

export interface MedicalDashboardPatientItem {
  _id: string;
  patientId: string;
  patientName: string;
  visitCount: number;
  lastVisitDate: string | null;
}

