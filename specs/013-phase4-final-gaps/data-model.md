# Data Model & State Transitions: استكمال النواقص النهائية للمرحلة الرابعة

**Feature**: `013-phase4-final-gaps` | **Date**: 2026-11-14

## 1. Existing Entities & Field Impact

### 1.1 `StudentBatch` (`next/lib/db/models/StudentBatch.ts`)
لا توجد تغييرات على بنية الـ Schema؛ التعديل يستهدف تحديث عناصر مصفوفة `classifications`:
- `classifications[].id`: `string` (المعرف الثابت للتصنيف — مفتاح التطابق في `PUT`).
- `classifications[].name`: `string` (مطلوب، غير فارغ، فريد داخل الدفعة عند المقارنة بعد `trim().toLowerCase()`).
- `classifications[].description`: `string` (اختياري).

### 1.2 `Student` (`next/lib/db/models/Student.ts`)
تحديث تزامني غير مكرر المرجع (Denormalized Sync):
- عند تغيير `classifications[i].name` للتصنيف ذي المعرف `classId` في مرحلة `mrhla`:
  - يتم تنفيذ `Student.updateMany({ mrhla, classificationId: classId }, { $set: { classificationName: newName.trim() } })`.
- تبقى سجلات `StudentRollcall.entries[].classificationName` التاريخية غير معدلة (Snapshot ثابت).

### 1.3 `BackupRecord` (`next/lib/db/models/BackupRecord.ts`)
يُستخدم لتوثيق الأرشيف الخارجي المرفوع أثناء الاستعادة:
- `filename`: `external-restore-<ISO-timestamp>-<sanitizedOriginalName>`
- `filePath`: `public/uploads/backups/<filename>`
- `fileSizeBytes`: الحجم الفعلي بالبايت (`0 < size <= 2 GiB`).
- `backupType`: `"manual_export"`
- `status`: `"completed"` (أو `"deleted"` إذا تم تدويره لاحقاً عبر `enforceRetentionPolicy`).
- `collectionsCount`, `documentsCount`: تُستكمل من نتيجة الاستعادة (`RestoreResult`) بعد انتهائها.
- `checksumSha256`: البصمة المحسوبة فور اكتمال حفظ الملف.

### 1.4 `RestoreOperation` (`next/lib/db/models/RestoreOperation.ts`)
يُحدّث عبر `findByIdAndUpdate(..., { upsert: true })` داخل `restore-engine.ts` لضمان بقاء سجل عملية الاستعادة حتى بعد استبدال مجموعات قاعدة البيانات أثناء الاستعادة الكاملة.

## 2. Validation Schemas (`next/lib/validations/`)

### `next/lib/validations/student.ts`
- `updateBatchClassificationSchema`:
  - `id`: `z.string().min(1).trim()`
  - `name`: `z.string().min(1).max(100).trim()`
  - `description`: `z.string().max(500).optional()`

### `next/lib/validations/backup.ts`
- `MAX_EXTERNAL_RESTORE_BYTES = 2 * 1024 * 1024 * 1024` (2 GiB)
- `restoreUploadBackupSchema`:
  - `adminPassword`: `z.string().min(1)`
  - `confirmationPhrase`: مطابقة تامة لعبارة `RESTORE_CONFIRMATION_PHRASE`

## 3. State Lifecycle for External Archive Restore

1. **Upload Validation**: التحقق من وجود الملف، الامتداد (`.tar.gz` / `.tgz`)، الحجم (`0 < size <= 2 GiB`)، عبارة التأكيد، كلمة مرور المدير، وتوفر مساحة قرص كافية (`checkDiskSpaceSufficient`).
2. **Staging Write & Record Creation**: بث الملف إلى `public/uploads/backups/`، حساب `SHA-256`، وإنشاء `BackupRecord`.
3. **Atomic Restore (`executeRestore`)**: قفل التزامن، التحقق من `SHA-256`، فك الضغط، قراءة `manifest.json`، استعادة المجموعات والمرفقات.
4. **Post-Restore Persistence & Retention (`FR-006`)**:
   - **عند النجاح**: إعادة تثبيت `BackupRecord` للأرشيف الخارجي في قاعدة البيانات المستعادة (`upsert`) ثم تشغيل `enforceRetentionPolicy` لحفظ أحدث 4 نسخ فقط + تسجيل `AuditLog`.
   - **عند الفشل**: حذف الملف المرفوع من القرص وحذف أي سجل مؤقت غير مكتمل دون المساس بقاعدة البيانات أو النسخ السابقة.
