import { z } from "zod";

const usernameSchema = z
  .string()
  .min(3, "اسم المستخدم يجب أن يكون 3 أحرف على الأقل")
  .max(50, "اسم المستخدم يجب أن لا يزيد عن 50 حرفاً")
  .regex(/^[a-zA-Z0-9_]+$/, "اسم المستخدم يمكن أن يحتوي فقط على أحرف وأرقام وشرطة سفلية")
  .trim()
  .toLowerCase();

const passwordSchema = z
  .string()
  .min(8, "كلمة المرور يجب أن تكون 8 أحرف على الأقل")
  .regex(/[a-zA-Z]/, "يجب أن تحتوي على حرف واحد على الأقل")
  .regex(/[0-9]/, "يجب أن تحتوي على رقم واحد على الأقل");

const roleSchema = z.enum(["admin", "commander", "employee", "viewer"]);

const departmentSchema = z.enum(["fax", "officers", "medical", "students", "education", "arkan_harb"]);

const permissionLevelSchema = z.enum(["none", "view", "edit"]);

const permissionsSchema = z.object({
  fax: permissionLevelSchema,
  officers: permissionLevelSchema,
  medical: permissionLevelSchema,
  students: permissionLevelSchema,
  education: permissionLevelSchema,
  arkan_harb: permissionLevelSchema,
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
