# Research & Technical Decisions: استكمال النواقص النهائية للمرحلة الرابعة وأرشفتها

**Feature**: `013-phase4-final-gaps` | **Date**: 2026-11-14

## 1. تعديل مسمى التصنيف التخصصي وتناسق البيانات (`FR-06.1`)

- **Decision**: تعديل المسمى يتم عبر `PUT /api/students/stages/[id]/classifications` بالاعتماد على المعرف الثابت للتصنيف (`id`) داخل `StudentBatch.classifications`، مع تحديث `classificationName` جماعياً في وثيقة `Student` لنفس `mrhla`، وإبقاء سجلات `StudentRollcall` التاريخية غير معدلة.
- **Rationale**:
  - `Student.classificationId` يرتبط بمعرف التصنيف الثابت، لذا فإن تحديث `name` داخل `StudentBatch.classifications` وتحديث `Student.classificationName` عبر `updateMany({ mrhla, classificationId }, { $set: { classificationName } })` يحافظ على مرجعية كافة الطلاب دون الحاجة لإعادة تسكينهم.
  - إذا كانت المرحلة تحتوي على طلاب مستوردين دون وجود وثيقة `StudentBatch` بعد (حالة يغطيها `GET /api/students/stages` بإرجاع `DEFAULT_BATCH_CLASSIFICATIONS`)، يتم استدعاء `getOrCreateStudentBatch(mrhla, true)` لإنشاء وثيقة المرحلة بالبيانات الافتراضية تلقائياً قبل التعديل بدلاً من إرجاع 404 خاطئ.
  - سجلات `StudentRollcall` تمثل لقطة تاريخية ليوم التمام ولا ينبغي تعديلها بأثر رجعي (وفق قرار التوضيح Q2).
- **Alternatives considered**:
  - تعديل `StudentRollcall` بأثر رجعي: مرفوض لأنه يغير السجل التاريخي الرسمي للتمام اليومي.
  - ربط الطلاب بالاسم فقط دون `id`: مرفوض لتعارضه مع مرونة تعديل المسمى.

## 2. رفع واستعادة ملف أرشيف خارجي وحد الحجم والمساحة (`FR-07.4`, `FR-005`, `FR-006`)

- **Decision**:
  1. دعم `multipart/form-data` في `POST /api/admin/backup/restore` بجانب `application/json`.
  2. فرض حد أقصى لحجم الملف المرفوع قدره `2 GiB` (`2 * 1024 * 1024 * 1024` bytes) على الخادم والمتصفح مع رفض الملفات الفارغة (`file.size === 0`) أو غير المنتهية بـ `.tar.gz` / `.tgz`.
  3. كتابة ملف الرفع عبر التدفق (`Readable.fromWeb` + `pipeline`) بدلاً من `file.arrayBuffer()` لتفادي استهلاك الذاكرة العشوائية عند أحجام تقارب 2 جيجابايت.
  4. فحص المساحة الحرة مسبقاً عبر `checkDiskSpaceSufficient(backupStorageDir, file.size)` قبل كتابة الملف وفك الضغط (مع اشتراط 20% مساحة حرة وضعف حجم الأرشيف).
  5. بعد نجاح `executeRestore`، إعادة تثبيت/ترسيخ سجل `BackupRecord` للأرشيف الخارجي المرفوع عبر `BackupRecord.findOneAndUpdate(..., { upsert: true })` (لأن استعادة قاعدة البيانات الكاملة تستبدل مجموعة `backuprecords` بمحتوى الأرشيف)، ثم استدعاء `enforceRetentionPolicy` لحفظ أحدث 4 نسخ فقط. وفي حالة فشل الاستعادة، حذف الملف المرفوع وسجل `BackupRecord` المؤقت تلقائياً.
- **Rationale**:
  - في قرار التوضيح Q1 اختير حفظ الأرشيف المرفوع كنسخة دائمة مع إخضاعها لقاعدة أحدث 4 نسخ. وبما أن `executeRestore` في الوضع الكامل ينفذ `collection.deleteMany({})` على كافة المجموعات الواردة في `manifest.json` (ومنها `backuprecords`)، فإن إنشاء السجل قبل `executeRestore` وحده سيؤدي لاختفاء السجل من قاعدة البيانات بعد الاستعادة وبقاء ملف يتيم على القرص. لذا يجب إعادة تثبيت السجل بعد `executeRestore` (كما يفعل `restore-engine.ts` مع `RestoreOperation`) ثم تطبيق `enforceRetentionPolicy`.
  - البث المباشر للقرص (`Readable.fromWeb` -> `createWriteStream`) يمنع استنفاد RAM عند معالجة ملفات تصل إلى 2GB داخل حاوية Next.js.
- **Alternatives considered**:
  - استخدام `file.arrayBuffer()`: مقبول للملفات الصغيرة فقط، لكنه محفوف بمخاطر OOM عند اقتراب الحجم من 2GB.
  - حذف الملف الخارجي بعد الاستعادة: تم استبعاده صراحةً بناءً على اختيار المستخدم (Q1 = Option B).

## 3. تصميم الواجهات والالتزام بنظام Sapphire Archive

- **Decision**:
  - تعديل مسمى التصنيف يتم فورياً (Inline Edit) داخل نافذة إدارة التصنيفات في `CurrentStageTab.tsx` مع أزرار حفظ/إلغاء ودعم `Enter`/`Escape`، وإعادة ضبط حالة التعديل عند إغلاق النافذة.
  - وضع الاستعادة من أرشيف خارجي يُدمج داخل `RestoreModal.tsx` عبر تبويبي مصدر (`نسخة محفوظة على الخادم` / `رفع أرشيف خارجي (.tar.gz)`) مع زر دخول مباشر في `BackupManagementClient.tsx` وإظهار رسائل التحقق من الامتداد والحجم (<= 2GB).
- **Rationale**: يحافظ على `ModalShell` (`overlayClassName="bg-black/40"` بدون `backdrop-blur`)، وألوان النظام (`--color-primary`, `--app-muted-foreground`, `--app-surface-container`)، وقيود الأزرار الحمراء على `btn-destructive` فقط.
