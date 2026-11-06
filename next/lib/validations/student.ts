import { z } from "zod";

export const STUDENT_STATUSES_Z = [
  "active",
  "graduated",
  "inactive",
  "withdrawn",
  "transferred_personnel",
] as const;

export const STUDENT_LOCATION_STATUSES_Z = [
  "in_unit",
  "relocated",
  "transferred_to_unit_personnel",
] as const;

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

export const updateStudentSchema = z
  .object({
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
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "يجب تحديد حقل واحد على الأقل للتحديث",
  });

export const studentsListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  status: z.enum([...STUDENT_STATUSES_Z, "all"] as [string, ...string[]]).optional(),
  mrhla: z.string().optional(),
  search: z.string().optional(),
  qualification: z.string().optional(),
  classificationId: z.string().optional(),
  locationStatus: z.enum([...STUDENT_LOCATION_STATUSES_Z, "all"] as [string, ...string[]]).optional(),
  governorate: z.string().optional(),
  bloodType: z.string().optional(),
  distributionStatus: z.string().optional(),
  showAllPrevious: z.coerce.boolean().optional(),
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
      "مسار الملف غير صالح"
    ),
});

export const uploadDocumentBodySchema = z.object({
  name: z
    .string()
    .min(1, "اسم المستند مطلوب")
    .max(200, "اسم المستند يجب ألا يتجاوز 200 حرف")
    .trim(),
});

// New Schemas for 011-students-mdb-upgrade
export const importConfirmSchema = z.object({
  fileId: z.string().min(1, "معرف الملف المؤقت مطلوب"),
});

export const activeStageSchema = z.object({
  mrhla: z.string().min(1, "رمز المرحلة مطلوب"),
});

export const studentRollcallEntrySchema = z.object({
  studentId: z.string().min(1, "معرف الطالب مطلوب"),
  militaryNo: z.string().min(1, "الرقم العسكري مطلوب"),
  fullName: z.string().min(1, "اسم الطالب مطلوب"),
  status: z.enum([
    "present",
    "duty_service",
    "clinic",
    "leave",
    "sick_leave",
    "rest",
    "hospital",
    "police_academy_exam",
    "military_academy_exam",
    "mission",
    "absent",
    "prison",
    "court",
  ]),
  notes: z.string().optional(),
  destination: z.string().optional(),
  expectedReturnDate: z.string().optional(),
  isOngoingDisciplinary: z.boolean().optional(),
});

export const saveRollcallSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "تاريخ التمام غير صالح (YYYY-MM-DD)"),
  mrhla: z.string().min(1, "رمز المرحلة مطلوب"),
  action: z.enum(["save_draft", "approve", "reopen"]),
  entries: z.array(studentRollcallEntrySchema),
  overrideReason: z.string().optional(),
});

export const updateDistributionStatusSchema = z.object({
  studentIds: z.array(z.string().min(1)).min(1, "يجب تحديد طالب واحد على الأقل"),
  distributionStatus: z.enum([
    "distributed_to_unit",
    "halt_transfer",
    "without_distribution",
    "stage_remnants",
    "unspecified",
  ]),
});

// Phase 10 Delta Upgrade Schemas
export const relocateStudentsSchema = z
  .object({
    mrhla: z.string().min(1, "رمز المرحلة مطلوب"),
    classificationId: z.string().optional(),
    studentIds: z.array(z.string().min(1)).optional(),
    destination: z.string().min(1, "جهة الترحيل مطلوبة").max(200, "جهة الترحيل يجب ألا تتجاوز 200 حرف"),
    date: z.string().min(1, "تاريخ الترحيل مطلوب"),
    orderNo: z.string().min(1, "رقم وتاريخ أمر الترحيل والتصديق مطلوب").max(100),
    reason: z.string().max(500, "السبب يجب ألا يتجاوز 500 حرف").optional(),
  })
  .refine(
    (data) => Boolean(data.classificationId) || (Array.isArray(data.studentIds) && data.studentIds.length > 0),
    {
      message: "يجب تحديد تصنيف كامل أو اختيار طالب واحد على الأقل للترحيل",
    }
  );

export const transferToPersonnelSchema = z.object({
  mrhla: z.string().min(1, "رمز المرحلة مطلوب"),
  studentIds: z.array(z.string().min(1)).min(1, "يجب تحديد طالب واحد على الأقل"),
  transferDate: z.string().min(1, "تاريخ النقل لقوة الأفراد مطلوب"),
  orderNo: z.string().min(1, "رقم أمر التسكين والتصديق مطلوب").max(100),
  assignedRole: z.string().max(200, "الوظيفة يجب ألا تتجاوز 200 حرف").optional(),
});

export const updateBatchTargetSchema = z.object({
  targetCount: z.coerce.number().int().min(0, "المقرر وصوله يجب ألا يقل عن صفر"),
});

export const batchClassificationSchema = z.object({
  name: z.string().min(1, "اسم التصنيف مطلوب").max(100, "اسم التصنيف يجب ألا يتجاوز 100 حرف").trim(),
  description: z.string().max(500).optional(),
});

export type CreateStudentInput = z.infer<typeof createStudentSchema>;
export type UpdateStudentInput = z.infer<typeof updateStudentSchema>;
export type StudentsListQueryInput = z.infer<typeof studentsListQuerySchema>;
export type ImportConfirmInput = z.infer<typeof importConfirmSchema>;
export type ActiveStageInput = z.infer<typeof activeStageSchema>;
export type SaveRollcallInput = z.infer<typeof saveRollcallSchema>;
export type UpdateDistributionStatusInput = z.infer<typeof updateDistributionStatusSchema>;
export type RelocateStudentsInput = z.infer<typeof relocateStudentsSchema>;
export type TransferToPersonnelInput = z.infer<typeof transferToPersonnelSchema>;
export type UpdateBatchTargetInput = z.infer<typeof updateBatchTargetSchema>;
export type BatchClassificationInput = z.infer<typeof batchClassificationSchema>;
