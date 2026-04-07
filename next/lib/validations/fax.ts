import { z } from "zod";

export const createFaxSchema = z.object({
  faxNumber: z.string().min(1, "رقم الفاكس مطلوب").trim(),
  date: z.string().min(1, "التاريخ مطلوب").refine(
    (val) => !isNaN(Date.parse(val)),
    "التاريخ غير صالح",
  ),
  fromEntity: z.string().min(1, "الجهة المرسِلة مطلوبة").trim(),
  toEntity: z.string().min(1, "الجهة المستقبِلة مطلوبة").trim(),
  subject: z.string().min(1, "الموضوع مطلوب").trim(),
  relatedFaxId: z.string().optional(),
});

export const faxListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  status: z.enum(["pending", "forwarded", "closed"]).optional(),
  search: z.string().optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  sort: z
    .enum(["date", "-date", "faxNumber", "-faxNumber", "status", "-status"])
    .default("-date"),
  forwardedToMe: z.coerce.boolean().default(false),
});

export const decisionSchema = z.object({
  decision: z.string().min(1, "نص القرار مطلوب").trim(),
  action: z.enum(["forward", "close"]),
  forwardToType: z.enum(["user", "department"]).optional(),
  forwardToId: z.string().optional(),
  forwardToDepartment: z.string().optional(),
}).refine(
  (data) => {
    if (data.action === "forward") {
      if (data.forwardToType === "user") return !!data.forwardToId;
      if (data.forwardToType === "department") return !!data.forwardToDepartment;
      return false;
    }
    return true;
  },
  {
    message: "يجب تحديد الوجهة عند التوجيه",
    path: ["forwardToType"],
  },
);

export const linkSchema = z.object({
  relatedFaxId: z.string().min(1, "معرف الفاكس المرتبط مطلوب"),
});

export const closeSchema = z.object({
  note: z.string().optional(),
});

export const searchQuerySchema = z.object({
  q: z.string().min(1, "نص البحث مطلوب"),
  exclude: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(50).default(10),
});

export type CreateFaxInput = z.infer<typeof createFaxSchema>;
export type FaxListQueryInput = z.infer<typeof faxListQuerySchema>;
export type DecisionInput = z.infer<typeof decisionSchema>;
export type LinkInput = z.infer<typeof linkSchema>;
export type CloseInput = z.infer<typeof closeSchema>;
export type SearchQueryInput = z.infer<typeof searchQuerySchema>;
