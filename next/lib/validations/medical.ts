import { z } from "zod";

export const createVisitSchema = z.object({
  patientId: z.string().min(1, "رقم الفرد مطلوب").trim(),
  patientName: z.string().min(1, "اسم المريض مطلوب").trim(),
  diagnosis: z.string().min(1, "التشخيص مطلوب").trim(),
  treatment: z.string().min(1, "العلاج مطلوب").trim(),
  dispensedMedicines: z
    .array(
      z.object({
        medicineId: z.string().min(1, "معرف الدواء مطلوب"),
        quantity: z.number().int().min(1, "الكمية يجب أن تكون 1 على الأقل"),
      }),
    )
    .optional()
    .default([]),
});

export const visitListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().optional(),
  dateFrom: z.string().refine((v) => !isNaN(Date.parse(v)), "invalid").optional(),
  dateTo: z.string().refine((v) => !isNaN(Date.parse(v)), "invalid").optional(),
});

export const createMedicineSchema = z.object({
  name: z.string().min(1, "اسم الدواء مطلوب").trim(),
  unit: z.string().min(1, "الوحدة مطلوبة").trim(),
  quantity: z.number().int().min(0, "الكمية يجب أن تكون 0 على الأقل"),
  expiryDate: z.string().min(1, "تاريخ الصلاحية مطلوب").refine(
    (val) => !isNaN(Date.parse(val)),
    "التاريخ غير صالح",
  ),
  minThreshold: z.number().int().min(0, "الحد الأدنى يجب أن يكون 0 على الأقل"),
});

export const updateMedicineSchema = z.object({
  name: z.string().min(1).trim().optional(),
  unit: z.string().min(1).trim().optional(),
  quantity: z.number().int().min(0).optional(),
  expiryDate: z.string().refine((val) => !isNaN(Date.parse(val)), "التاريخ غير صالح").optional(),
  minThreshold: z.number().int().min(0).optional(),
}).refine((data) => Object.keys(data).length > 0, {
  message: "يجب تحديد حقل واحد على الأقل للتحديث",
});

export type CreateVisitInput = z.infer<typeof createVisitSchema>;
export type VisitListQueryInput = z.infer<typeof visitListQuerySchema>;
export type CreateMedicineInput = z.infer<typeof createMedicineSchema>;
export type UpdateMedicineInput = z.infer<typeof updateMedicineSchema>;
