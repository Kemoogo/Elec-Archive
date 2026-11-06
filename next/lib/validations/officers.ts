import { z } from "zod";

export const OFFICER_RANKS_Z = [
  "second_lieutenant",
  "first_lieutenant",
  "captain",
  "major",
  "lieutenant_colonel",
  "colonel",
  "brigadier",
  "major_general",
] as const;

export const EMPLOYMENT_STATUSES_Z = ["active", "inactive", "retired"] as const;

export const OFFICER_TYPES_Z = ["worker", "reserve", "university", "honorary", "technical", "engineer"] as const;

export const OFFICER_WEAPONS_Z = ["signals", "vehicles", "armored", "admin_affairs", "infantry"] as const;

export const createOfficerSchema = z.object({
  militaryId: z
    .string()
    .min(1, "الرقم العسكري مطلوب")
    .regex(/^\d{5,7}$/, "الرقم العسكري يجب أن يكون بين 5 إلى 7 أرقام")
    .trim(),
  seniorityNumber: z
    .string()
    .min(1, "رقم الأقدمية مطلوب")
    .regex(/^\d{5,}(?:[A-Za-z\u0600-\u06FF]+\d*)?$/, "رقم الأقدمية غير صالح. يجب أن يبدأ بـ 5 أرقام على الأقل، ويمكن أن يحتوي على حروف بعده")
    .trim(),
  fullName: z.string().min(1, "الاسم الكامل مطلوب").trim(),
  rank: z.enum(OFFICER_RANKS_Z, { message: "الرتبة غير صالحة" }),
  unit: z.string().trim().optional(),
  position: z.string().trim().optional(),
  batch: z.string().regex(/^\d+$/, "الدفعة يجب أن تكون أرقام فقط").trim().optional(),
  type: z.enum(OFFICER_TYPES_Z).optional(),
  weapon: z.enum(OFFICER_WEAPONS_Z).optional(),
  phone: z.string().trim().optional(),
  nationalId: z
    .string()
    .regex(/^\d{14}$/, "الرقم القومي يجب أن يكون 14 رقم")
    .trim()
    .optional()
    .or(z.literal("")),
   employmentStatus: z.enum(EMPLOYMENT_STATUSES_Z).default("active"),
   joinDate: z
     .string()
     .refine((val) => !isNaN(Date.parse(val)), "التاريخ غير صالح")
     .optional(),
   birthDate: z
     .string()
     .refine((val) => !isNaN(Date.parse(val)), "التاريخ غير صالح")
     .optional(),
    graduationDate: z
      .string()
      .refine((val) => !isNaN(Date.parse(val)), "التاريخ غير صالح")
      .optional(),
  bloodType: z.string().trim().optional(),
  religion: z.string().trim().optional(),
  maritalStatus: z.string().trim().optional(),
  faculty: z.string().trim().optional(),
  file121Url: z
    .string()
    .trim()
    .regex(/^(\/uploads\/officers\/[a-zA-Z0-9_-]+\.pdf)?$/, "مسار ملف 121 غير صالح")
    .optional(),
  photoUrl: z
    .string()
    .trim()
    .regex(/^(\/uploads\/officers\/photos\/[a-zA-Z0-9_-]+\.(jpg|jpeg|png|webp))?$/, "مسار الصورة غير صالح")
    .optional(),
  file121IssueDate: z.string().trim().optional(),
  isArkanHarb: z.boolean().default(false),
}).superRefine((data, ctx) => {
  if (data.birthDate) {
    const birth = new Date(data.birthDate);
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    if (birth >= today) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "تاريخ الميلاد يجب أن يكون في الماضي",
        path: ["birthDate"],
      });
    }
    if (data.joinDate) {
      const join = new Date(data.joinDate);
      if (birth >= join) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "تاريخ الميلاد يجب أن يكون قبل تاريخ الانضمام",
          path: ["birthDate"],
        });
      }
    }
  }
});

export const patchOfficerSchema = z.object({
  fullName: z.string().min(1).trim().optional(),
  rank: z.enum(OFFICER_RANKS_Z).optional(),
  unit: z.string().min(1).trim().optional(),
  position: z.string().min(1).trim().optional(),
  batch: z.string().trim().optional(),
  type: z.enum(OFFICER_TYPES_Z).optional(),
  weapon: z.enum(OFFICER_WEAPONS_Z).optional(),
  phone: z.string().trim().optional(),
  nationalId: z.string().trim().optional(),
  employmentStatus: z.enum(EMPLOYMENT_STATUSES_Z).optional(),
  defaultLeaveSystem: z.string().trim().optional(),
  joinDate: z
    .string()
    .refine((val) => !isNaN(Date.parse(val)), "التاريخ غير صالح")
    .optional(),
  birthDate: z
    .string()
    .refine((val) => !isNaN(Date.parse(val)), "التاريخ غير صالح")
    .optional(),
  graduationDate: z
    .string()
    .refine((val) => !isNaN(Date.parse(val)), "التاريخ غير صالح")
    .optional(),
  bloodType: z.string().trim().optional(),
  religion: z.string().trim().optional(),
  maritalStatus: z.string().trim().optional(),
  faculty: z.string().trim().optional(),
  file121Url: z
    .string()
    .trim()
    .regex(/^(\/uploads\/officers\/[a-zA-Z0-9_-]+\.pdf)?$/, "مسار ملف 121 غير صالح")
    .optional(),
  photoUrl: z
    .string()
    .trim()
    .regex(/^(\/uploads\/officers\/photos\/[a-zA-Z0-9_-]+\.(jpg|jpeg|png|webp))?$/, "مسار الصورة غير صالح")
    .optional(),
  file121IssueDate: z.string().trim().optional(),
  isInUnit: z.boolean().optional(),
  isArkanHarb: z.boolean().optional(),
  movement: z
    .object({
      action: z.enum(["transfer_out", "return_to_unit", "termination", "retirement", "death"]).optional(),
      date: z.string().min(1).optional(),
      notes: z.string().max(500).optional(),
    })
    .optional(),
}).refine((data) => Object.keys(data).length > 0, {
  message: "يجب تحديد حقل واحد على الأقل",
});

export const officersListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  status: z.enum(EMPLOYMENT_STATUSES_Z).optional(),
  search: z.string().optional(),
});

export const seniorityCheckSchema = z.object({
  seniorityNumber: z.string().min(1, "رقم الأقدمية مطلوب").trim(),
});

export const returningOfficerSchema = z.object({
  returnDate: z
    .string()
    .min(1, "تاريخ العودة مطلوب")
    .refine((val) => !isNaN(Date.parse(val)), "التاريخ غير صالح"),
  returnReason: z.string().trim().optional().default("return"),
  notes: z.string().trim().optional(),
});

export const officerMovementSchema = z.object({
  officerId: z.string().min(1, "معرف الضابط مطلوب"),
  type: z.enum(["join", "leave", "return"]),
  action: z.string().min(1, "نوع الإجراء مطلوب"),
  date: z
    .string()
    .min(1, "التاريخ مطلوب")
    .refine((val) => !isNaN(Date.parse(val)), "التاريخ غير صالح"),
  notes: z.string().trim().optional(),
});

export const officerIdParamSchema = z.object({
  id: z.string().min(1, "معرف الضابط مطلوب"),
});

export const deleteDocumentSchema = z.object({
  documentId: z.string().min(1, "معرف المستند مطلوب"),
});

export const ROLLCALL_STATUSES_Z = [
  "present",
  "daily_mission",
  "clinic",
  "custom_present",
  "leave",
  "absent",
  "course",
  "rest",
  "external_mission",
  "mission",
  "medical",
  "attached",
  "hospital",
  "prison",
  "unit_arrest",
  "court",
  "travel_abroad",
  "custom_out",
] as const;

export const rollcallEntrySchema = z.object({
  officerId: z.string().min(1, "معرف الضابط مطلوب"),
  status: z.enum(ROLLCALL_STATUSES_Z, { message: "الحالة غير صالحة" }),
  note: z.string().trim().optional(),
  customReason: z.string().trim().optional(),
  hospitalName: z.string().trim().optional(),
  hospitalAdmissionDate: z.string().trim().optional(),
  disciplinaryType: z.string().trim().optional(),
  disciplinaryAuthority: z.string().trim().optional(),
  travelDestination: z.string().trim().optional(),
  travelPurpose: z.string().trim().optional(),
  statusStartDate: z.string().trim().optional(),
  statusEndDate: z.string().trim().optional(),
});

export const customRollcallTableSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1, "اسم الجدول مطلوب"),
  isInsideUnit: z.boolean().default(false),
  officerIds: z.array(z.string()).default([]),
  officerTasks: z.record(z.string(), z.string()).optional(),
  notes: z.string().optional(),
});

export const rollcallSubmitSchema = z.object({
  date: z
    .string()
    .min(1, "التاريخ مطلوب")
    .refine((val) => !isNaN(Date.parse(val)), "التاريخ غير صالح"),
  action: z.enum(["save_draft", "submit"], { message: "الإجراء غير صالح" }),
  entries: z.array(rollcallEntrySchema).min(1, "يجب إدخال سجل واحد على الأقل"),
  customTables: z.array(customRollcallTableSchema).optional(),
  confirmedOfficerIds: z.array(z.string()).optional(),
});

export const rollcallQuerySchema = z.object({
  date: z
    .string()
    .min(1, "التاريخ مطلوب")
    .refine((val) => !isNaN(Date.parse(val)), "التاريخ غير صالح"),
});

export const LEAVE_CATEGORIES_Z = ["leave", "absence"] as const;
export const LEAVE_TYPES_Z = [
  "field",
  "weekly_rest",
  "daily_sleep",
  "medical",
  "annual",
  "permission",
  "casual",
  "rest",
] as const;
export const LEAVE_STATUSES_Z = [
  "pending_commander",
  "approved",
  "rejected",
  "other_orders",
  "interrupted",
  "closed",
  "extension_pending",
] as const;

export const createLeaveSchema = z.object({
  officerId: z.string().min(1, "معرف الضابط مطلوب"),
  category: z.enum(LEAVE_CATEGORIES_Z).default("leave"),
  type: z.enum(LEAVE_TYPES_Z, { message: "النوع غير صالح" }),
  startDate: z
    .string()
    .min(1, "تاريخ البداية مطلوب")
    .refine((val) => !isNaN(Date.parse(val)), "التاريخ غير صالح"),
  endDate: z
    .string()
    .min(1, "تاريخ الانتهاء مطلوب")
    .refine((val) => !isNaN(Date.parse(val)), "التاريخ غير صالح"),
  lastReturnDate: z.string().optional(),
  presenceDurationDays: z.number().optional(),
  actingOfficerId: z.string().optional(),
  isActingOfficerPresentConfirmed: z.boolean().optional(),
  reason: z.string().trim().optional(),
  medicalReportUrl: z.string().trim().optional(),
}).refine((data) => new Date(data.endDate) >= new Date(data.startDate), {
  message: "تاريخ النهاية يجب أن يكون بعد تاريخ البداية",
  path: ["endDate"],
}).refine((data) => {
  // Extract date string YYYY-MM-DD
  const startStr = data.startDate.split("T")[0];
  const now = new Date();
  const _todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = `${tomorrow.getFullYear()}-${String(tomorrow.getMonth() + 1).padStart(2, "0")}-${String(tomorrow.getDate()).padStart(2, "0")}`;
  
  // Start date must not be later than tomorrow (can be today or tomorrow; or past if registering historical/backlog)
  return startStr <= tomorrowStr;
}, {
  message: "تاريخ بداية الإجازة يجب أن يكون اليوم أو باكر فقط، ولا يمكن تقديم طلب لتاريخ لاحق",
  path: ["startDate"],
});

export const commanderDecisionSchema = z.object({
  leaveId: z.string().optional(),
  leaveIds: z.array(z.string()).optional(), // for bulk "تصدق للكل"
  action: z.enum(["approve", "reject", "modify", "other_orders"]),
  notes: z.string().trim().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});

export const extendLeaveSchema = z.object({
  leaveId: z.string().min(1, "معرف الإجازة مطلوب"),
  newEndDate: z
    .string()
    .min(1, "تاريخ الانتهاء الجديد مطلوب")
    .refine((val) => !isNaN(Date.parse(val)), "التاريخ غير صالح"),
  reason: z.string().trim().optional(),
});

export const confirmReturnSchema = z.object({
  leaveId: z.string().min(1, "معرف الإجازة مطلوب"),
  returnDate: z.string().optional(),
});

export const cancelLeaveSchema = z.object({
  leaveId: z.string().min(1, "معرف الإجازة مطلوب"),
  reason: z.string().trim().optional(),
});

export const patchLeaveSchema = z.object({
  type: z.enum(LEAVE_TYPES_Z).optional(),
  startDate: z
    .string()
    .refine((val) => !isNaN(Date.parse(val)), "التاريخ غير صالح")
    .optional(),
  endDate: z
    .string()
    .refine((val) => !isNaN(Date.parse(val)), "التاريخ غير صالح")
    .optional(),
  reason: z.string().trim().optional(),
  status: z.enum(LEAVE_STATUSES_Z).optional(),
  actingOfficerId: z.string().optional(),
  isActingOfficerPresentConfirmed: z.boolean().optional(),
}).refine((data) => Object.keys(data).length > 0, {
  message: "يجب تحديد حقل واحد على الأقل",
}).refine((data) => !data.startDate || !data.endDate || new Date(data.endDate) >= new Date(data.startDate), {
  message: "تاريخ النهاية يجب أن يكون بعد تاريخ البداية",
  path: ["endDate"],
});

export const leavesListQuerySchema = z.object({
  officerId: z.string().optional(),
  status: z.enum(LEAVE_STATUSES_Z).optional(),
  type: z.enum(LEAVE_TYPES_Z).optional(),
  from: z.string().refine((v) => !isNaN(Date.parse(v)), "invalid").optional(),
  to: z.string().refine((v) => !isNaN(Date.parse(v)), "invalid").optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const ASSIGNMENT_TYPES_Z = ["assignment", "promotion", "mission"] as const;
export const ASSIGNMENT_STATUSES_Z = ["scheduled", "active", "completed", "cancelled"] as const;

export const createAssignmentSchema = z.object({
  officerId: z.string().min(1, "معرف الضابط مطلوب"),
  type: z.enum(ASSIGNMENT_TYPES_Z, { message: "النوع غير صالح" }),
  title: z.string().min(1, "العنوان مطلوب").trim(),
  description: z.string().trim().optional(),
  effectiveDate: z
    .string()
    .min(1, "تاريخ السريان مطلوب")
    .refine((val) => !isNaN(Date.parse(val)), "التاريخ غير صالح"),
  endDate: z
    .string()
    .refine((val) => !isNaN(Date.parse(val)), "التاريخ غير صالح")
    .optional(),
});

export const patchAssignmentSchema = z.object({
  type: z.enum(ASSIGNMENT_TYPES_Z).optional(),
  title: z.string().min(1).trim().optional(),
  description: z.string().trim().optional(),
  effectiveDate: z
    .string()
    .refine((val) => !isNaN(Date.parse(val)), "التاريخ غير صالح")
    .optional(),
  endDate: z
    .string()
    .refine((val) => !isNaN(Date.parse(val)), "التاريخ غير صالح")
    .optional(),
  status: z.enum(ASSIGNMENT_STATUSES_Z).optional(),
});

export const assignmentsListQuerySchema = z.object({
  officerId: z.string().optional(),
  type: z.enum(ASSIGNMENT_TYPES_Z).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type CreateOfficerInput = z.infer<typeof createOfficerSchema>;
export type PatchOfficerInput = z.infer<typeof patchOfficerSchema>;
export type OfficersListQueryInput = z.infer<typeof officersListQuerySchema>;
export type CreateLeaveInput = z.infer<typeof createLeaveSchema>;
export type PatchLeaveInput = z.infer<typeof patchLeaveSchema>;
export type LeavesListQueryInput = z.infer<typeof leavesListQuerySchema>;
export type CreateAssignmentInput = z.infer<typeof createAssignmentSchema>;
export type PatchAssignmentInput = z.infer<typeof patchAssignmentSchema>;
export type AssignmentsListQueryInput = z.infer<typeof assignmentsListQuerySchema>;
export type RollcallSubmitInput = z.infer<typeof rollcallSubmitSchema>;
