import { z } from "zod";

const usernameSchema = z
  .string()
  .min(3, "Username must be at least 3 characters")
  .max(50, "Username must be at most 50 characters")
  .regex(/^[a-zA-Z0-9_]+$/, "Username can only contain letters, numbers, and underscores");

const passwordSchema = z
  .string()
  .min(6, "Password must be at least 6 characters");

const roleSchema = z.enum(["admin", "commander", "employee", "viewer"]);

const departmentSchema = z.enum(["fax", "officers", "medical", "students", "education"]);

const permissionLevelSchema = z.enum(["none", "view", "edit"]);

const permissionsSchema = z.object({
  fax: permissionLevelSchema,
  officers: permissionLevelSchema,
  medical: permissionLevelSchema,
  students: permissionLevelSchema,
  education: permissionLevelSchema,
});

export const loginSchema = z.object({
  username: usernameSchema,
  password: passwordSchema,
});

export const createUserSchema = z.object({
  username: usernameSchema,
  password: passwordSchema,
  fullName: z.string().min(2, "Full name must be at least 2 characters").max(100),
  role: roleSchema,
  department: departmentSchema,
  permissions: permissionsSchema,
});

export const updateUserSchema = z.object({
  fullName: z.string().min(2).max(100).optional(),
  role: roleSchema.optional(),
  department: departmentSchema.optional(),
  permissions: permissionsSchema.optional(),
  isActive: z.boolean().optional(),
  isLocked: z.boolean().optional(),
  password: passwordSchema.optional(),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
