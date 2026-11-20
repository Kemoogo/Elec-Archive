import { z } from "zod";
export { auditQuerySchema, type AuditQueryInput } from "./audit";

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

export type NotificationQueryInput = z.infer<typeof notificationQuerySchema>;
export type MarkReadInput = z.infer<typeof markReadSchema>;
