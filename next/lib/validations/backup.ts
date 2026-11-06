import { z } from "zod";

export const RESTORE_CONFIRMATION_PHRASE = "استعادة النسخة الاحتياطية";

export const exportBackupSchema = z.object({
  notes: z.string().max(500, "الملاحظات يجب ألا تزيد عن 500 حرف").optional(),
  isIncremental: z.boolean().optional().default(false),
});

export const quarterlyBackupSchema = z.object({
  quarter: z.string().regex(/^Q[1-4]-\d{4}$/, "صيغة الربع السنوي يجب أن تكون مثل Q1-2026").optional(),
  force: z.boolean().optional().default(false),
});

export const restoreBackupSchema = z.object({
  backupId: z.string().min(1, "معرف النسخة الاحتياطية مطلوب").regex(/^[0-9a-fA-F]{24}$/, "معرف النسخة الاحتياطية غير صالح"),
  adminPassword: z.string().min(1, "كلمة مرور مدير النظام مطلوبة"),
  confirmationPhrase: z.string().refine((val) => val.trim() === RESTORE_CONFIRMATION_PHRASE, {
    message: `يجب كتابة عبارة التأكيد بدقة: "${RESTORE_CONFIRMATION_PHRASE}"`,
  }),
});

export const deleteBackupSchema = z.object({
  id: z.string().min(1, "معرف النسخة مطلوب").regex(/^[0-9a-fA-F]{24}$/, "معرف النسخة غير صالح"),
});

export type ExportBackupInput = z.infer<typeof exportBackupSchema>;
export type QuarterlyBackupInput = z.infer<typeof quarterlyBackupSchema>;
export type RestoreBackupInput = z.infer<typeof restoreBackupSchema>;
export type DeleteBackupInput = z.infer<typeof deleteBackupSchema>;
