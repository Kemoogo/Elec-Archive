import { z } from "zod";

export const createBranchSchema = z.object({
  name: z.string().min(2, "اسم الفرع يجب أن يكون حرفين على الأقل").max(100, "اسم الفرع طويل جداً").trim(),
  code: z.string().max(50).optional(),
  description: z.string().max(200).optional(),
  order: z.number().int().optional(),
});

export const updateBranchSchema = createBranchSchema.partial().extend({
  isActive: z.boolean().optional(),
});

export const createDepartmentSchema = z.object({
  name: z.string().min(2, "اسم القسم يجب أن يكون حرفين على الأقل").max(100, "اسم القسم طويل جداً").trim(),
  branchId: z.string().min(1, "الفرع التابع له مطلوب"),
  code: z.string().max(50).optional(),
  description: z.string().max(200).optional(),
  order: z.number().int().optional(),
});

export const updateDepartmentSchema = createDepartmentSchema.partial().extend({
  isActive: z.boolean().optional(),
});

export type CreateBranchInput = z.infer<typeof createBranchSchema>;
export type UpdateBranchInput = z.infer<typeof updateBranchSchema>;
export type CreateDepartmentInput = z.infer<typeof createDepartmentSchema>;
export type UpdateDepartmentInput = z.infer<typeof updateDepartmentSchema>;
