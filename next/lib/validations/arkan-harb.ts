import { z } from "zod";
import { OFFICER_RANKS_Z } from "./officers";

export const POSITION_TYPES_Z = ["primary", "substitute"] as const;
export const POSITION_STATUSES_Z = ["active", "ended"] as const;

// Base shape without cross-field refinements — used for .partial() in update schemas
const positionAssignmentBaseShape = {
  officerId: z.string().min(1, "معرف الضابط مطلوب"),
  positionTitle: z.string().min(1, "المسمى الوظيفي مطلوب").trim(),
  positionType: z.enum(POSITION_TYPES_Z, { message: "النوع غير صالح" }),
  substituteForOfficerId: z.string().optional().or(z.literal("")),
  startDate: z
    .string()
    .min(1, "تاريخ البداية مطلوب")
    .refine((val) => !isNaN(Date.parse(val)), "التاريخ غير صالح"),
  endDate: z
    .string()
    .refine((val) => !isNaN(Date.parse(val)), "التاريخ غير صالح")
    .optional()
    .or(z.literal("")),
  orderNumber: z.string().trim().optional(),
  notes: z.string().trim().optional(),
  status: z.enum(POSITION_STATUSES_Z).default("active"),
};

export const createPositionAssignmentSchema = z.object(positionAssignmentBaseShape).superRefine((data, ctx) => {
  if (data.endDate && data.startDate && new Date(data.endDate) < new Date(data.startDate)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "تاريخ الانتهاء يجب أن يكون بعد أو يساوي تاريخ البداية",
      path: ["endDate"],
    });
  }
  if (data.positionType === "primary" && data.substituteForOfficerId) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "لا يمكن تحديد ضابط بديل عنه في تعيين أساسي",
      path: ["substituteForOfficerId"],
    });
  }
  if (data.positionType === "substitute" && !data.substituteForOfficerId) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "يجب تحديد الضابط الأصلي في التعيين البديل",
      path: ["substituteForOfficerId"],
    });
  }
});

export const updatePositionAssignmentSchema = z
  .object(positionAssignmentBaseShape)
  .partial()
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

export const MISSION_STATUSES_Z = ["scheduled", "active", "completed", "cancelled"] as const;

// Base shape for mission — without superRefine
const missionBaseShape = {
  officerId: z.string().min(1, "معرف الضابط مطلوب"),
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

export const missionsListQuerySchema = z.object({
  officerId: z.string().optional(),
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
