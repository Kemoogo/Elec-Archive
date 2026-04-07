import { z } from "zod";

export const STUDENT_STATUSES_Z = ["active", "graduated", "inactive", "withdrawn"] as const;

export const createStudentSchema = z.object({
  studentId: z
    .string()
    .min(1, "رقم الطالب مطلوب")
    .max(50, "رقم الطالب يجب ألا يتجاوز 50 حرف")
    .trim(),
  fullName: z
    .string()
    .min(1, "الاسم الكامل مطلوب")
    .max(200, "الاسم يجب ألا يتجاوز 200 حرف")
    .trim(),
  enrollDate: z
    .string()
    .min(1, "تاريخ التسجيل مطلوب")
    .refine((val) => !isNaN(Date.parse(val)), "التاريخ غير صالح"),
  notes: z.string().max(2000, "الملاحظات يجب ألا تتجاوز 2000 حرف").trim().optional(),
});

export const updateStudentSchema = z.object({
  fullName: z
    .string()
    .min(1, "الاسم الكامل مطلوب")
    .max(200, "الاسم يجب ألا يتجاوز 200 حرف")
    .trim()
    .optional(),
  enrollDate: z
    .string()
    .refine((val) => !isNaN(Date.parse(val)), "التاريخ غير صالح")
    .optional(),
  notes: z.string().max(2000, "الملاحظات يجب ألا تتجاوز 2000 حرف").trim().optional(),
}).refine((data) => Object.keys(data).length > 0, {
  message: "يجب تحديد حقل واحد على الأقل للتحديث",
});

export const studentsListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  status: z.enum([...STUDENT_STATUSES_Z, "all"] as [string, ...string[]]).optional(),
  search: z.string().optional(),
});

export const studentIdParamSchema = z.object({
  id: z.string().min(1, "معرف الطالب مطلوب"),
});

export const deleteDocumentSchema = z.object({
  fileUrl: z
    .string()
    .min(1, "مسار الملف مطلوب")
    .regex(
      /^\/uploads\/students\/(?!.*\.\.)[a-zA-Z0-9\u0600-\u06FF][a-zA-Z0-9.\u0600-\u06FF_-]*$/,
      "مسار الملف غير صالح",
    ),
});

export const uploadDocumentBodySchema = z.object({
  name: z
    .string()
    .min(1, "اسم المستند مطلوب")
    .max(200, "اسم المستند يجب ألا يتجاوز 200 حرف")
    .trim(),
});

export type CreateStudentInput = z.infer<typeof createStudentSchema>;
export type UpdateStudentInput = z.infer<typeof updateStudentSchema>;
export type StudentsListQueryInput = z.infer<typeof studentsListQuerySchema>;
