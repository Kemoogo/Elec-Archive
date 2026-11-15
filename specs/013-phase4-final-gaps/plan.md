# Implementation Plan: استكمال النواقص النهائية للمرحلة الرابعة وأرشفتها

**Branch**: `feature/phase4-final-gaps` (Spec Dir: `013-phase4-final-gaps`) | **Date**: 2026-11-14 | **Spec**: [spec.md](file:///home/karim/projects/Elec-Archive/specs/013-phase4-final-gaps/spec.md)

**Input**: Feature specification from `specs/013-phase4-final-gaps/spec.md`

## Summary

تهدف هذه الخطة إلى إغلاق ومواءمة النواقص المتبقية من المرحلة الرابعة في `PRD.md` وفق المخرجات المعتمدة في جلسة التوضيح:
1. **`FR-06.1` (`FEAT-STU-06`)**: مسار `PUT /api/students/stages/[id]/classifications` وواجهة التعديل الفوري في `CurrentStageTab.tsx` لتعديل مسمى التصنيف التخصصي وتحديث `Student.classificationName` مع إبقاء سجلات التمام اليومي التاريخية ثابتة.
2. **`FR-07.4` (`FEAT-SYS-01`)**: دعم رفع واستعادة أرشيف `.tar.gz` / `.tgz` خارجي في `RestoreModal.tsx` و`BackupManagementClient.tsx` و`POST /api/admin/backup/restore` مع فرض حد الحجم (`2 GiB`)، فحص المساحة الحرة (`checkDiskSpaceSufficient`)، البث المباشر للقرص دون استهلاك الذاكرة، إعادة تثبيت `BackupRecord` بعد الاستعادة الكاملة وتطبيق سياسة أحدث 4 نسخ (`enforceRetentionPolicy`)، والتنظيف التلقائي عند الفشل.
3. **أرشفة المرحلة 4**: اعتماد الحالة `COMPLETED` في `PRD.md` وتوثيقها في `.specify/memory/changelog.md` و`AGENTS.md`.

## Technical Context

**Language/Version**: TypeScript 5.x (Strict Mode, no `any`)  
**Primary Dependencies**: Next.js 16+ (App Router, React 19), Mongoose 9.x, Zod 4, Lucide React, Tailwind CSS 4  
**Storage**: MongoDB 7 (local container) + local filesystem (`public/uploads/backups/`)  
**Testing**: TypeScript strict check (`npx tsc --noEmit`), ESLint (`npm run lint`), Next.js production build (`npm run build`), `graphify auto-update .`, and manual verification scenarios (`quickstart.md`)  
**Target Platform**: Linux / Windows Server offline intranet container runtime (Podman / Docker)  
**Project Type**: Full-stack Next.js Web Application (`next/`)  
**Performance Goals**: بث مباشر لملفات الأرشيف المرفوعة دون تخزينها بالكامل في RAM (`<= 2 GiB`)؛ استجابة فورية لتحديث التصنيف والطلاب  
**Constraints**: Offline-first (Air-gapped Intranet)، RTL عربي كامل، التحقق الأمني المزدوج للاستعادة، قفل تزامن (`acquireLock`)، وسياسة 4 نسخ كحد أقصى  
**Scale/Scope**: 10–30 مستخدم متزامن على شبكة داخلية؛ تعديل 6 ملفات مصدرية و3 ملفات توثيقية

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| المبدأ الدستوري | التقييم قبل التصميم وبعده | آلية الامتثال |
| :--- | :---: | :--- |
| **I. Security-First** | PASS | `authenticate()` + `hasModuleAccess(..., "students", "edit")` في `PUT /classifications`؛ `requireAdmin()` + تحقق كلمة مرور المدير + عبارة التأكيد في `POST /restore`؛ تسجيل `AuditLog` في كل نجاح وفشل مصادقة. |
| **II. SSR-First** | PASS | الإبقاء على الصفحات كـ RSC وحصر التعديل التفاعلي داخل leaf client components (`CurrentStageTab.tsx`، `RestoreModal.tsx`، `BackupManagementClient.tsx`). |
| **III. Offline-First** | PASS | تخزين الأرشيفات محلياً في `public/uploads/backups/` عبر Node `fs` و`tar` بدون أي خدمات خارجية أو CDNs. |
| **IV. Type Safety & Validation** | PASS | Strict TypeScript بدون `any`، والتحقق من المدخلات عبر Zod (`updateBatchClassificationSchema`، `restoreUploadBackupSchema`) وفحص الصيغة والحجم (`<= 2 GiB`) على الخادم. |
| **V. Quality Gates & Main Branch Protection** | PASS | العمل حصرياً على فرع `feature/phase4-final-gaps`؛ التحقق بـ `tsc --noEmit` و`npm run lint` و`npm run build` و`graphify auto-update .`. |
| **VI. Design-Driven UI (Sapphire Archive)** | PASS | استخدام `ModalShell` (`overlayClassName="bg-black/40"` بدون `backdrop-blur`) و`ModalActions` وألوان النظام (`--color-primary`، `--app-muted-foreground`، `btn-destructive` فقط لزر الاستعادة). |
| **VII. Operational Personnel Isolation** | N/A (غير متأثر) | لا يعرض أو يعالج قوائم الضباط التشغيلية؛ يقتصر على تصنيفات مراحل الطلاب والنسخ الاحتياطي الإداري. |

## Project Structure

### Documentation (this feature)

```text
specs/013-phase4-final-gaps/
├── spec.md                              # المواصفة المعتمدة بعد Clarifications
├── checklists/
│   └── requirements.md                  # قائمة تحقق جودة المواصفة
├── plan.md                              # هذا الملف
├── research.md                          # مخرجات Phase 0
├── data-model.md                        # مخرجات Phase 1
├── quickstart.md                        # دليل التحقق والاختبار
└── contracts/
    └── phase4-final-gaps-api.md         # عقود APIs والواجهة
```

### Source Code (repository root)

```text
next/
├── app/api/
│   ├── admin/backup/restore/route.ts               # دعم multipart + 2GiB limit + disk check + streaming + post-restore retention
│   └── students/stages/[id]/classifications/route.ts # مسار PUT لتعديل مسمى التصنيف ومزامنة الطلاب
├── components/
│   ├── admin/backup/
│   │   ├── BackupManagementClient.tsx              # زر "استعادة من أرشيف خارجي"
│   │   └── RestoreModal.tsx                        # تبويب رفع الأرشيف الخارجي والتحقق من الحجم <= 2GiB
│   └── students/
│       └── CurrentStageTab.tsx                     # التعديل الفوري للتصنيفات داخل نافذة التصنيفات
└── lib/
    ├── backup/
    │   ├── disk-space.ts                           # checkDiskSpaceSufficient (مستخدم قبل الرفع والاستعادة)
    │   ├── retention-manager.ts                    # enforceRetentionPolicy (مستخدم بعد الاستعادة الخارجية)
    │   └── restore-engine.ts                       # executeRestore وتحديث RestoreOperation بـ upsert
    └── validations/
        ├── backup.ts                               # MAX_EXTERNAL_RESTORE_BYTES و restoreUploadBackupSchema
        └── student.ts                              # updateBatchClassificationSchema
```

**Structure Decision**: استخدام البنية المعتمدة لتطبيق Next.js App Router في `next/` دون استحداث طبقات أو مجلدات خارج الاتفاقية، مع حصر فجوات المواءمة الناتجة عن التوضيحات (`FR-005` و`FR-006`) في `next/lib/validations/backup.ts` و`next/app/api/admin/backup/restore/route.ts` و`next/components/admin/backup/RestoreModal.tsx`.

## Gap Alignment Plan (Post-Clarification Updates for `/speckit-implement`)

رغم أن معظم بنود `FR-06.1` و`FR-07.4` وأرشفة `PRD.md` و`changelog.md` منفذة مسبقاً على الفرع، كشفت جلسة التوضيح والتحقق المعماري عن فجوتين تقنيتين تتطلبان الاستكمال في مرحلة التنفيذ:
1. **`FR-005` (حد 2 GiB + فحص المساحة + البث المباشر)**:
   - إضافة `MAX_EXTERNAL_RESTORE_BYTES = 2 * 1024 * 1024 * 1024` في `next/lib/validations/backup.ts`.
   - التحقق في `RestoreModal.tsx` و`POST /api/admin/backup/restore` من أن `file.size <= MAX_EXTERNAL_RESTORE_BYTES`.
   - استدعاء `checkDiskSpaceSufficient(backupStorageDir, file.size)` قبل كتابة الملف، واستخدام `Readable.fromWeb` + `pipeline` لبث الملف إلى القرص بدلاً من `file.arrayBuffer()`.
2. **`FR-006` (ترسيخ سجل الأرشيف الخارجي بعد الاستعادة وتطبيق قاعدة 4 نسخ)**:
   - في `POST /api/admin/backup/restore`: بعد نجاح `executeRestore` في وضع `external_upload`، إعادة تثبيت `BackupRecord` للأرشيف الخارجي (`findOneAndUpdate({ filename }, ..., { upsert: true })`) مع تحديث `collectionsCount` و`documentsCount`، ثم استدعاء `enforceRetentionPolicy({ userId, userName, ipAddress })` لتطبيق سقف أحدث 4 نسخ.

## Complexity Tracking

لا توجد أي مخالفات دستورية؛ كافة المكونات والمسارات تتبع الأنماط القائمة في المنظومة.
