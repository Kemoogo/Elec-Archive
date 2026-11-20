import { z } from "zod";
import {
  HISTORICAL_IMAGE_MAX_BYTES,
  HISTORICAL_MAX_PHOTOS_PER_ITEM,
  UNIT_MILESTONE_CATEGORIES,
} from "@/types/historical-record";

const OBJECT_ID_REGEX = /^[0-9a-fA-F]{24}$/;
const ISO_DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Validates strict YYYY-MM-DD calendar date strings (no overflow dates like 2024-02-30).
 */
export function isValidIsoDateString(value: string): boolean {
  if (!ISO_DATE_REGEX.test(value)) return false;
  const [yearStr, monthStr, dayStr] = value.split("-");
  const year = Number(yearStr);
  const month = Number(monthStr);
  const day = Number(dayStr);
  if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) {
    return false;
  }
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

const isoDateField = (label: string) =>
  z
    .string()
    .trim()
    .refine(isValidIsoDateString, `صيغة ${label} غير صالحة (يجب أن تكون YYYY-MM-DD)`);

const optionalIsoDateField = (label: string) =>
  z
    .union([z.literal(""), isoDateField(label)])
    .optional()
    .transform((v) => (v === "" ? undefined : v));

const historicalPhotoUrlSchema = z
  .string()
  .trim()
  .refine(
    (url) => url.startsWith("/uploads/historical-record/"),
    "مسار الصورة المرجعي غير صالح",
  );

export const governanceReasonSchema = z
  .string()
  .trim()
  .min(3, "سبب التعديل أو الحذف مطلوب (3 أحرف على الأقل)")
  .max(500, "السبب يجب ألا يتجاوز 500 حرف");

export const governanceConfirmationSchema = z.object({
  reason: governanceReasonSchema,
  confirmed: z.literal(true, {
    message: "يجب إتمام التأكيد المزدوج قبل تنفيذ العملية",
  }),
});

export const historicalVisitCreateSchema = z.object({
  title: z
    .string()
    .trim()
    .min(2, "عنوان الزيارة مطلوب (حرفين على الأقل)")
    .max(200, "عنوان الزيارة لا يتجاوز 200 حرف"),
  visitorName: z
    .string()
    .trim()
    .min(2, "اسم الزائر أو الوفد مطلوب (حرفين على الأقل)")
    .max(200, "اسم الزائر لا يتجاوز 200 حرف"),
  visitDate: isoDateField("تاريخ الزيارة"),
  description: z
    .string()
    .trim()
    .max(4000, "التفاصيل لا تتجاوز 4000 حرف")
    .optional()
    .default(""),
});

export const historicalVisitUpdateSchema = z.object({
  title: z
    .string()
    .trim()
    .min(2, "عنوان الزيارة يجب أن يكون حرفين على الأقل")
    .max(200, "عنوان الزيارة لا يتجاوز 200 حرف")
    .optional(),
  visitorName: z
    .string()
    .trim()
    .min(2, "اسم الزائر يجب أن يكون حرفين على الأقل")
    .max(200, "اسم الزائر لا يتجاوز 200 حرف")
    .optional(),
  visitDate: isoDateField("تاريخ الزيارة").optional(),
  description: z
    .string()
    .trim()
    .max(4000, "التفاصيل لا تتجاوز 4000 حرف")
    .optional(),
  keepPhotos: z
    .array(historicalPhotoUrlSchema)
    .max(
      HISTORICAL_MAX_PHOTOS_PER_ITEM,
      `الحد الأقصى للصور هو ${HISTORICAL_MAX_PHOTOS_PER_ITEM} صور`,
    )
    .optional(),
  reason: governanceReasonSchema,
  confirmed: z.literal(true, {
    message: "يجب إتمام التأكيد المزدوج قبل الحفظ",
  }),
});

export const historicalCommanderCreateSchema = z
  .object({
    officerId: z
      .string()
      .trim()
      .regex(OBJECT_ID_REGEX, "معرف الضابط المختار غير صالح"),
    startDate: isoDateField("تاريخ تولي القيادة"),
    isCurrent: z.boolean(),
    endDate: optionalIsoDateField("تاريخ انتهاء القيادة"),
    previousCommanderEndDate: optionalIsoDateField("تاريخ انتهاء القائد السابق"),
    notes: z
      .string()
      .trim()
      .max(4000, "الملاحظات لا تتجاوز 4000 حرف")
      .optional()
      .default(""),
  })
  .superRefine((data, ctx) => {
    if (data.isCurrent && data.endDate) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "لا يمكن إدخال تاريخ انتهاء عند اختيار (حتى الآن)",
        path: ["endDate"],
      });
    }
    if (!data.isCurrent && !data.endDate) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "تاريخ انتهاء القيادة مطلوب إذا لم يكن القائد حالياً",
        path: ["endDate"],
      });
    }
    if (!data.isCurrent && data.endDate && data.endDate < data.startDate) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "تاريخ انتهاء القيادة يجب أن يساوي أو يلحق تاريخ تولي القيادة",
        path: ["endDate"],
      });
    }
  });

export const officerSnapshotPatchSchema = z.object({
  militaryId: z
    .string()
    .trim()
    .min(1, "الرقم العسكري مطلوب")
    .max(50, "الرقم العسكري لا يتجاوز 50 حرفاً")
    .optional(),
  fullName: z
    .string()
    .trim()
    .min(2, "الاسم الكامل مطلوب")
    .max(150, "الاسم الكامل لا يتجاوز 150 حرفاً")
    .optional(),
  rank: z
    .string()
    .trim()
    .min(1, "الرتبة مطلوبة")
    .max(60, "الرتبة لا تتجاوز 60 حرفاً")
    .optional(),
  seniorityNumber: z
    .string()
    .trim()
    .max(50, "رقم الأقدمية لا يتجاوز 50 حرفاً")
    .optional(),
});

export const historicalCommanderUpdateSchema = z
  .object({
    startDate: isoDateField("تاريخ تولي القيادة").optional(),
    endDate: optionalIsoDateField("تاريخ انتهاء القيادة"),
    isCurrent: z.boolean().optional(),
    previousCommanderEndDate: optionalIsoDateField("تاريخ انتهاء القائد السابق"),
    notes: z
      .string()
      .trim()
      .max(4000, "الملاحظات لا تتجاوز 4000 حرف")
      .optional(),
    officerSnapshot: officerSnapshotPatchSchema.optional(),
    removePhoto: z.boolean().optional(),
    reason: governanceReasonSchema,
    confirmed: z.literal(true, {
      message: "يجب إتمام التأكيد المزدوج قبل الحفظ",
    }),
  })
  .superRefine((data, ctx) => {
    if (data.isCurrent === true && data.endDate) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "لا يمكن تحديد تاريخ انتهاء عند تفعيل حالة (حتى الآن)",
        path: ["endDate"],
      });
    }
    if (data.isCurrent === false && !data.endDate) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "تاريخ انتهاء القيادة مطلوب عند إلغاء حالة (حتى الآن)",
        path: ["endDate"],
      });
    }
    if (data.startDate && data.endDate && data.endDate < data.startDate) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "تاريخ الانتهاء يجب أن يساوي أو يلحق تاريخ تولي القيادة",
        path: ["endDate"],
      });
    }
  });

export const unitProfileUpsertSchema = z.object({
  unitName: z
    .string()
    .trim()
    .min(2, "اسم الوحدة الرسمي مطلوب (حرفين على الأقل)")
    .max(200, "اسم الوحدة لا يتجاوز 200 حرف"),
  foundingDate: optionalIsoDateField("تاريخ النشأة"),
  affiliation: z.string().trim().max(200, "التبعية لا تتجاوز 200 حرف").optional().default(""),
  location: z.string().trim().max(200, "الموقع لا يتجاوز 200 حرف").optional().default(""),
  motto: z.string().trim().max(300, "الشعار لا يتجاوز 300 حرف").optional().default(""),
  mission: z.string().trim().max(2000, "المهمة لا تتجاوز 2000 حرف").optional().default(""),
  removeEmblem: z.boolean().optional().default(false),
  reason: z.string().trim().max(500).optional(),
  confirmed: z.boolean().optional(),
});

export const unitMilestoneCreateSchema = z.object({
  milestoneDate: isoDateField("تاريخ الحدث"),
  title: z
    .string()
    .trim()
    .min(2, "عنوان المحطة التاريخية مطلوب")
    .max(200, "العنوان لا يتجاوز 200 حرف"),
  category: z.enum(UNIT_MILESTONE_CATEGORIES, {
    message: "التصنيف المختار غير صالح",
  }),
  description: z
    .string()
    .trim()
    .max(4000, "التفاصيل لا تتجاوز 4000 حرف")
    .optional()
    .default(""),
});

export const unitMilestoneUpdateSchema = z.object({
  milestoneDate: isoDateField("تاريخ الحدث").optional(),
  title: z
    .string()
    .trim()
    .min(2, "عنوان المحطة يجب أن يكون حرفين على الأقل")
    .max(200, "العنوان لا يتجاوز 200 حرف")
    .optional(),
  category: z
    .enum(UNIT_MILESTONE_CATEGORIES, {
      message: "التصنيف المختار غير صالح",
    })
    .optional(),
  description: z
    .string()
    .trim()
    .max(4000, "التفاصيل لا تتجاوز 4000 حرف")
    .optional(),
  keepPhotos: z
    .array(historicalPhotoUrlSchema)
    .max(
      HISTORICAL_MAX_PHOTOS_PER_ITEM,
      `الحد الأقصى للصور هو ${HISTORICAL_MAX_PHOTOS_PER_ITEM} صور`,
    )
    .optional(),
  reason: governanceReasonSchema,
  confirmed: z.literal(true, {
    message: "يجب إتمام التأكيد المزدوج قبل الحفظ",
  }),
});

export const historicalQuerySchema = z.object({
  search: z.string().trim().max(100).optional(),
  year: z.coerce.number().int().min(1900).max(2100).optional(),
  sortOrder: z.enum(["desc", "asc"]).default("desc"),
  status: z.enum(["all", "current", "former"]).optional().default("all"),
  category: z.enum(UNIT_MILESTONE_CATEGORIES).optional(),
});

export { HISTORICAL_IMAGE_MAX_BYTES, HISTORICAL_MAX_PHOTOS_PER_ITEM };
