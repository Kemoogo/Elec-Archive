import { z } from "zod";
import { OFFICER_RANKS_Z } from "./officers";

export const POSITION_TYPES_Z = ["primary", "substitute"] as const;
export const POSITION_STATUSES_Z = ["active", "ended"] as const;

export const createPositionAssignmentSchema = z.object({
  positionTitle: z.string().min(1, "المسمى الوظيفي مطلوب").trim(),
  department: z.string().min(1, "الفرع / القسم مطلوب").trim().default("القيادة"),
  primaryOfficerId: z.string().trim().optional().nullable().or(z.literal("")),
  substituteOfficerIds: z.array(z.string().trim()).optional().default([]),
  hasNoSubstitute: z.boolean().optional().default(false),
  orderNumber: z.string().trim().optional(),
  notes: z.string().trim().optional(),
});

export const updatePositionAssignmentSchema = z
  .object({
    positionTitle: z.string().min(1, "المسمى الوظيفي مطلوب").trim().optional(),
    department: z.string().min(1, "الفرع / القسم مطلوب").trim().optional(),
    primaryOfficerId: z.string().trim().optional().nullable().or(z.literal("")),
    substituteOfficerIds: z.array(z.string().trim()).optional(),
    hasNoSubstitute: z.boolean().optional(),
    orderNumber: z.string().trim().optional(),
    notes: z.string().trim().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "يجب تحديد حقل واحد على الأقل",
  });

// Base shape for promotion — without superRefine
const promotionBaseShape = {
  officerId: z.string().min(1, "معرف الضابط مطلوب"),
  fromRank: z.enum(OFFICER_RANKS_Z, { message: "الرتبة الحالية غير صالحة" }),
  toRank: z.enum(OFFICER_RANKS_Z, { message: "الرتبة الجديدة غير صالحة" }),
  effectiveDate: z
    .string()
    .min(1, "تاريخ السريان مطلوب")
    .refine((val) => !isNaN(Date.parse(val)), "التاريخ غير صالح"),
  orderNumber: z.string().trim().optional(),
  notes: z.string().trim().optional(),
};

export const createPromotionSchema = z.object(promotionBaseShape).superRefine((data, ctx) => {
  if (data.fromRank && data.toRank && data.fromRank === data.toRank) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "الرتبة الجديدة يجب أن تكون مختلفة عن الرتبة الحالية",
      path: ["toRank"],
    });
  }
});

export const updatePromotionSchema = z
  .object(promotionBaseShape)
  .partial()
  .refine((data) => Object.keys(data).length > 0, {
    message: "يجب تحديد حقل واحد على الأقل",
  });

export const MISSION_STATUSES_Z = ["scheduled", "active", "completed", "cancelled", "postponed"] as const;
export const MISSION_TYPES_Z = ["internal_daily", "external_multiday"] as const;

// Base shape for mission — without superRefine
const missionBaseShape = {
  officerId: z.string().min(1, "معرف الضابط مطلوب"),
  missionType: z.enum(MISSION_TYPES_Z).default("external_multiday"),
  title: z.string().min(1, "عنوان المأمورية مطلوب").trim(),
  description: z.string().trim().optional(),
  destination: z.string().trim().optional(),
  startDate: z
    .string()
    .min(1, "تاريخ البداية مطلوب")
    .refine((val) => !isNaN(Date.parse(val)), "التاريخ غير صالح"),
  endDate: z
    .string()
    .refine((val) => !isNaN(Date.parse(val)), "التاريخ غير صالح")
    .optional()
    .or(z.literal("")),
  status: z.enum(MISSION_STATUSES_Z).default("scheduled"),
  statusReason: z.string().trim().optional(),
  resultSummary: z.string().trim().optional(),
  linkedFaxId: z.string().trim().optional(),
  linkedFax: z.string().trim().optional(),
  referenceLetterNumber: z.string().trim().optional(),
  travelOrderNumber: z.string().trim().optional(),
  transportationMean: z.string().trim().optional(),
  authorizedWeapons: z.string().trim().optional(),
  clearanceDocuments: z
    .array(
      z.object({
        name: z.string().trim().min(1),
        fileUrl: z.string().trim().min(1),
        uploadedAt: z.union([z.string(), z.date()]).optional(),
      }),
    )
    .optional(),
};

export const createMissionSchema = z.object(missionBaseShape).superRefine((data, ctx) => {
  if (data.endDate && data.startDate && new Date(data.endDate) < new Date(data.startDate)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "تاريخ الانتهاء يجب أن يكون بعد أو يساوي تاريخ البداية",
      path: ["endDate"],
    });
  }
});

export const updateMissionSchema = z
  .object(missionBaseShape)
  .partial()
  .refine((data) => Object.keys(data).length > 0, {
    message: "يجب تحديد حقل واحد على الأقل",
  });

export const convertFaxToMissionSchema = z.object({
  officerId: z.string().min(1, "معرف الضابط مطلوب"),
  missionType: z.enum(MISSION_TYPES_Z).default("external_multiday"),
  title: z.string().min(1, "عنوان المأمورية مطلوب").trim(),
  description: z.string().trim().optional(),
  destination: z.string().trim().optional(),
  startDate: z
    .string()
    .min(1, "تاريخ البداية مطلوب")
    .refine((val) => !isNaN(Date.parse(val)), "التاريخ غير صالح"),
  endDate: z
    .string()
    .refine((val) => !isNaN(Date.parse(val)), "التاريخ غير صالح")
    .optional()
    .or(z.literal("")),
  transportationMean: z.string().trim().optional(),
  authorizedWeapons: z.string().trim().optional(),
  travelOrderNumber: z.string().trim().optional(),
}).superRefine((data, ctx) => {
  if (data.endDate && data.startDate && new Date(data.endDate) < new Date(data.startDate)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "تاريخ الانتهاء يجب أن يكون بعد أو يساوي تاريخ البداية",
      path: ["endDate"],
    });
  }
});

export const checkMissionConflictSchema = z.object({
  officerId: z.string().min(1, "معرف الضابط مطلوب"),
  startDate: z
    .string()
    .min(1, "تاريخ البداية مطلوب")
    .refine((val) => !isNaN(Date.parse(val)), "التاريخ غير صالح"),
  endDate: z
    .string()
    .refine((val) => !isNaN(Date.parse(val)), "التاريخ غير صالح")
    .optional()
    .or(z.literal("")),
  excludeMissionId: z.string().optional(),
});

export const DUTY_TYPES_Z = [
  "duty_commander",
  "mobile_officer",
  "unit_duty",
  "guard_commander",
  "camp_officer",
  "store_guard",
  "security_duty",
  "assistant_duty",
  "custom",
] as const;

export const DUTY_ROSTER_STATUSES_Z = ["draft", "submitted", "approved"] as const;

export const dutySwapRecordSchema = z.object({
  fromOfficerId: z.string().min(1),
  toOfficerId: z.string().min(1),
  targetRole: z.enum(["primary", "yadak"]).default("primary"),
  reason: z.string().default(""),
  swappedAt: z.union([z.string(), z.date()]),
  swappedBy: z.string().optional(),
});

export const dutyRosterEntrySchema = z.object({
  date: z
    .string()
    .min(1, "تاريخ الخدمة مطلوب")
    .refine((val) => !isNaN(Date.parse(val)), "التاريخ غير صالح"),
  dutyType: z.string().min(1, "نوع الخدمة مطلوب").default("unit_duty"),
  dutyTitle: z.string().min(1, "مسمى الخدمة مطلوب").trim(),
  assignedOfficerId: z.string().min(1, "الضابط المعين مطلوب"),
  yadakOfficerId: z.string().optional().or(z.literal("")),
  substituteOfficerId: z.string().optional().or(z.literal("")),
  isSwapped: z.boolean().optional(),
  originalOfficerId: z.string().optional().or(z.literal("")),
  swapReason: z.string().trim().optional(),
  swappedAt: z.union([z.string(), z.date()]).optional(),
  swappedBy: z.string().optional(),
  swapHistory: z.array(dutySwapRecordSchema).optional(),
  isForcedAssignment: z.boolean().optional(),
  notes: z.string().trim().optional(),
  isHoliday: z.boolean().default(false),
});

export const updateDutyRosterSchema = z.object({
  startDate: z
    .string()
    .min(1, "تاريخ بداية الأسبوع مطلوب")
    .refine((val) => !isNaN(Date.parse(val)), "تاريخ البداية غير صالح"),
  endDate: z
    .string()
    .min(1, "تاريخ نهاية الأسبوع مطلوب")
    .refine((val) => !isNaN(Date.parse(val)), "تاريخ النهاية غير صالح"),
  month: z.number().int().min(1).max(12).optional(),
  year: z.number().int().min(2020).max(2100).optional(),
  customDuties: z.array(z.string().trim()).optional(),
  status: z.enum(DUTY_ROSTER_STATUSES_Z).optional(),
  entries: z.array(dutyRosterEntrySchema),
  commanderNotes: z.string().trim().optional(),
});

export const dutySwapSchema = z.object({
  startDate: z.string().optional(),
  date: z
    .string()
    .min(1, "تاريخ الخدمة مطلوب")
    .refine((val) => !isNaN(Date.parse(val)), "التاريخ غير صالح"),
  dutyType: z.string().min(1, "نوع الخدمة مطلوب"),
  dutyTitle: z.string().min(1, "مسمى الخدمة مطلوب"),
  replacementOfficerId: z.string().min(1, "الضابط البديل مطلوب"),
  reason: z.string().trim().optional(),
  targetRole: z.enum(["primary", "yadak"]).default("primary"),
});

export const missionsListQuerySchema = z.object({
  officerId: z.string().optional(),
  search: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  status: z.enum(MISSION_STATUSES_Z).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const promotionsListQuerySchema = z.object({
  officerId: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const positionsListQuerySchema = z.object({
  officerId: z.string().optional(),
  status: z.enum(POSITION_STATUSES_Z).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type MissionsListQuery = z.infer<typeof missionsListQuerySchema>;
export type PromotionsListQuery = z.infer<typeof promotionsListQuerySchema>;
export type PositionsListQuery = z.infer<typeof positionsListQuerySchema>;
export type CreatePositionAssignmentInput = z.infer<typeof createPositionAssignmentSchema>;
export type UpdatePositionAssignmentInput = z.infer<typeof updatePositionAssignmentSchema>;
export type CreatePromotionInput = z.infer<typeof createPromotionSchema>;
export type UpdatePromotionInput = z.infer<typeof updatePromotionSchema>;
export type CreateMissionInput = z.infer<typeof createMissionSchema>;
export type UpdateMissionInput = z.infer<typeof updateMissionSchema>;
export type ConvertFaxToMissionInput = z.infer<typeof convertFaxToMissionSchema>;
export type CheckMissionConflictInput = z.infer<typeof checkMissionConflictSchema>;
export type DutyRosterEntryInput = z.infer<typeof dutyRosterEntrySchema>;
export type UpdateDutyRosterInput = z.infer<typeof updateDutyRosterSchema>;
export type DutySwapInput = z.infer<typeof dutySwapSchema>;
