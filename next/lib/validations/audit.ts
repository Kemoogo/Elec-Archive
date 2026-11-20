import { z } from "zod";

export const AUDIT_ACTIONS = [
  "CREATE",
  "UPDATE",
  "DELETE",
  "VIEW",
  "LOGIN",
  "LOGIN_FAILED",
  "LOGOUT",
  "LOCK",
  "UNLOCK",
] as const;

export const AUDIT_MODULES = [
  "auth",
  "users",
  "fax",
  "officers",
  "medical",
  "students",
  "education",
  "notifications",
  "arkan_harb",
  "app_ideas",
  "backup",
  "historical_record",
] as const;

export const auditQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  userId: z.string().optional(),
  action: z.enum(AUDIT_ACTIONS).optional(),
  module: z.enum(AUDIT_MODULES).optional(),
  startDate: z.string().refine((v) => !isNaN(Date.parse(v)), "invalid").optional(),
  endDate: z.string().refine((v) => !isNaN(Date.parse(v)), "invalid").optional(),
});

export type AuditQueryInput = z.infer<typeof auditQuerySchema>;
