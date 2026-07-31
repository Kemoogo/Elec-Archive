import { z } from "zod";

export const COURSE_STATUSES_Z = ["upcoming", "ongoing", "completed"] as const;
export const PARTICIPANT_MODELS_Z = ["Officer", "Student"] as const;

export const createCourseSchema = z.object({
  title: z.string().min(1, "عنوان الدورة مطلوب").max(200, "العنوان يجب ألا يتجاوز 200 حرف").trim(),
  description: z.string().max(2000, "الوصف يجب ألا يتجاوز 2000 حرف").trim().optional(),
  startDate: z.string().min(1, "تاريخ البداية مطلوب").refine((val) => !isNaN(Date.parse(val)), "التاريخ غير صالح"),
  endDate: z.string().min(1, "تاريخ الانتهاء مطلوب").refine((val) => !isNaN(Date.parse(val)), "التاريخ غير صالح"),
  participantModel: z.enum(PARTICIPANT_MODELS_Z, { message: "نوع المشاركين غير صالح" }),
}).superRefine((data, ctx) => {
  if (new Date(data.endDate) < new Date(data.startDate)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "تاريخ الانتهاء يجب أن يكون بعد أو يساوي تاريخ البداية",
      path: ["endDate"],
    });
  }
});

export const updateCourseSchema = z.object({
  title: z.string().min(1).max(200).trim().optional(),
  description: z.string().max(2000).trim().optional(),
  startDate: z.string().refine((val) => !isNaN(Date.parse(val)), "التاريخ غير صالح").optional(),
  endDate: z.string().refine((val) => !isNaN(Date.parse(val)), "التاريخ غير صالح").optional(),
  status: z.enum(COURSE_STATUSES_Z).optional(),
}).refine((data) => Object.keys(data).length > 0, {
  message: "يجب تحديد حقل واحد على الأقل للتحديث",
}).superRefine((data, ctx) => {
  if (data.startDate && data.endDate && new Date(data.endDate) < new Date(data.startDate)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "تاريخ الانتهاء يجب أن يكون بعد أو يساوي تاريخ البداية",
      path: ["endDate"],
    });
  }
});

export const courseListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  status: z.enum([...COURSE_STATUSES_Z, "all"] as [string, ...string[]]).optional(),
  search: z.string().optional(),
});

export const courseIdParamSchema = z.object({
  id: z.string().min(1, "معرف الدورة مطلوب"),
});

export const addParticipantSchema = z.object({
  participantId: z.string().min(1, "معرف المشارك مطلوب"),
});

export const removeParticipantSchema = z.object({
  participantId: z.string().min(1, "معرف المشارك مطلوب"),
});

export const deleteDocumentSchema = z.object({
  fileUrl: z
    .string()
    .min(1, "مسار الملف مطلوب")
    .regex(
      /^\/uploads\/courses\/(?!.*\.\.)[a-zA-Z0-9\u0600-\u06FF][a-zA-Z0-9.\u0600-\u06FF_-]*$/,
      "مسار الملف غير صالح",
    ),
});

export type CreateCourseInput = z.infer<typeof createCourseSchema>;
export type UpdateCourseInput = z.infer<typeof updateCourseSchema>;
export type CourseListQueryInput = z.infer<typeof courseListQuerySchema>;
