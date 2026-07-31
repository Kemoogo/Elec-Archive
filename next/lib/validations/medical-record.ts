import { z } from "zod";

export const bloodTypeEnum = z.enum(["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"]);

export const patientMedicalRecordSchema = z.object({
  patientId: z.string().trim().min(1),
  patientName: z.string().trim().min(1),
  allergies: z.array(z.string().trim().max(200)).default([]),
  chronicConditions: z.array(z.string().trim().max(200)).default([]),
  bloodType: bloodTypeEnum.optional(),
  medicalNotes: z.string().trim().max(2000).default(""),
  severityNotes: z.string().trim().max(2000).default(""),
  version: z.number().int().nonnegative().default(0),
});

export const patientSearchQuerySchema = z.object({
  q: z.string().min(1).trim(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});
