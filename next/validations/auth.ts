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

const departmentSchema = z.string().min(1, "الفرع / القسم مطلوب").max(100);

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

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "كلمة المرور الحالية مطلوبة"),
    newPassword: passwordSchema,
    confirmPassword: z.string().min(1, "تأكيد كلمة المرور مطلوب"),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "كلمة المرور الجديدة وتأكيدها غير متطابقين",
    path: ["confirmPassword"],
  })
  .refine((data) => data.currentPassword !== data.newPassword, {
    message: "كلمة المرور الجديدة يجب أن تكون مختلفة عن كلمة المرور الحالية",
    path: ["newPassword"],
  });

export type LoginInput = z.infer<typeof loginSchema>;
export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
