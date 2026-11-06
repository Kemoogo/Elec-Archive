import { z } from "zod";

export const notificationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  unreadOnly: z.coerce.boolean().default(false),
});

export const markReadSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("mark_read"),
    notificationIds: z.array(z.string().min(1)).min(1),
  }),
  z.object({
    action: z.literal("mark_all_read"),
  }),
]);

export const auditQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  userId: z.string().optional(),
  action: z.enum(["CREATE", "UPDATE", "DELETE", "VIEW", "LOGIN", "LOGIN_FAILED", "LOGOUT", "LOCK", "UNLOCK"]).optional(),
  module: z.enum(["auth", "users", "fax", "officers", "medical", "students", "education", "notifications", "arkan_harb", "app_ideas"]).optional(),
  startDate: z.string().refine((v) => !isNaN(Date.parse(v)), "invalid").optional(),
  endDate: z.string().refine((v) => !isNaN(Date.parse(v)), "invalid").optional(),
});

export type NotificationQueryInput = z.infer<typeof notificationQuerySchema>;
export type MarkReadInput = z.infer<typeof markReadSchema>;
export type AuditQueryInput = z.infer<typeof auditQuerySchema>;
