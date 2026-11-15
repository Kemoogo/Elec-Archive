# API & UI Contracts: استكمال النواقص النهائية للمرحلة الرابعة

**Feature**: `013-phase4-final-gaps` | **Date**: 2026-11-14

## 1. `PUT /api/students/stages/[id]/classifications`

- **Auth & RBAC**: `authenticate()` + `hasModuleAccess(auth.user, "students", "edit")` (`401` / `403`).
- **Route Param**: `id` = كود المرحلة التجنيدية (`mrhla`).
- **Request Body (`application/json`)**:
  ```json
  {
    "id": "string (required)",
    "name": "string (required, 1..100 chars)",
    "description": "string (optional, max 500 chars)"
  }
  ```
- **Behavior**:
  1. التحقق من صحة المدخلات عبر `updateBatchClassificationSchema` (`400` عند الخطأ).
  2. استرجاع وثيقة `StudentBatch` أو تهيئتها بالتصنيفات الافتراضية إذا وُجد طلاب للمرحلة؛ وإرجاع `404` إذا لم توجد المرحلة ولا أي طلاب بها.
  3. التحقق من وجود التصنيف المطلوب (`404` إذا غير موجود) وعدم تطابق اسمه مع تصنيف آخر في نفس الدفعة (`400`).
  4. تحديث التصنيف في `StudentBatch` وتحديث `Student.classificationName` لجميع طلاب المرحلة المرتبطين بالمعرف `id`.
  5. تسجيل حدث `UPDATE` في `AuditLog` (`module: "students"`, `targetId: batch._id.toString()`).
- **Success Response (`200`)**:
  ```json
  {
    "success": true,
    "message": "تم تعديل مسمى التصنيف بنجاح وتحديث بيانات الطلاب",
    "data": [ /* IBatchClassification[] */ ]
  }
  ```

---

## 2. `POST /api/admin/backup/restore` (JSON & Multipart External Upload)

- **Auth & RBAC**: `requireAdmin()` (`401` / `403`).
- **Supported Content-Types**:
  1. `application/json` (الاستعادة من نسخة محفوظة على الخادم): `{ backupId, adminPassword, confirmationPhrase }`
  2. `multipart/form-data` (الاستعادة من أرشيف خارجي مرفوع):
     - `file`: ملف `.tar.gz` أو `.tgz` (الحجم `> 0` و `<= 2 GiB`).
     - `adminPassword`: كلمة مرور مدير النظام.
     - `confirmationPhrase`: `"استعادة النسخة الاحتياطية"`.
- **Multipart Validation & Flow**:
  1. فحص وجود الملف، الامتداد (`.tar.gz` / `.tgz`)، الحجم (`file.size === 0` -> `400`، `file.size > 2 GiB` -> `413` أو `400`).
  2. التحقق من `restoreUploadBackupSchema` (`400`).
  3. التحقق من كلمة مرور المدير (`401` + تسجيل حدث `LOCK` في `AuditLog`).
  4. فحص المساحة الحرة عبر `checkDiskSpaceSufficient(backupStorageDir, file.size)` (`507` / `400` عند عدم الكفاية).
  5. حفظ الملف عبر البث المباشر (`Readable.fromWeb` + `pipeline`)، حساب `SHA-256`، وإنشاء `BackupRecord`.
  6. تنفيذ `executeRestore` (`409` عند تعارض القفل، `400`/`500` عند تلف الأرشيف مع تنظيف الملف والسجل المؤقت).
  7. إعادة تثبيت `BackupRecord` للأرشيف الخارجي بعد استعادة قاعدة البيانات، وتنفيذ `enforceRetentionPolicy` لحفظ أحدث 4 نسخ فقط.
  8. تسجيل حدث `UPDATE` في `AuditLog`.
- **Success Response (`200`)**:
  ```json
  {
    "success": true,
    "message": "تمت استعادة المنظومة وقاعدة البيانات والمرفقات بنجاح",
    "data": {
      "restoredCollectionsCount": 0,
      "restoredDocumentsCount": 0,
      "durationSeconds": 0
    }
  }
  ```

---

## 3. UI Contracts

- **`CurrentStageTab.tsx`**:
  - زر تعديل (`Pencil`) بجانب كل تصنيف في نافذة إدارة التصنيفات، يتحول لحقل نصي مع أزرار حفظ (`Check`) وإلغاء (`X`) واختصارات `Enter` / `Escape`، مع تصفير حالة التعديل عند إغلاق النافذة.
- **`BackupManagementClient.tsx` & `RestoreModal.tsx`**:
  - زر `"استعادة من أرشيف خارجي"` في شريط الأدوات يفتح `RestoreModal` على وضع `"external_upload"`.
  - دعم التبديل بين `"نسخة محفوظة على الخادم"` و`"رفع أرشيف خارجي (.tar.gz)"` مع التحقق المبدئي من الصيغة والحجم (`<= 2 GiB`) وعبارة التأكيد وكلمة المرور.
