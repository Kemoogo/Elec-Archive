# Tasks: استكمال النواقص النهائية للمرحلة الرابعة وأرشفتها

**Input**: Design documents from `/specs/013-phase4-final-gaps/`
**Prerequisites**: `plan.md`, `spec.md`, `research.md`, `data-model.md`, `contracts/phase4-final-gaps-api.md`

**Tests**: لم تُطلب اختبارات آلية مسبقة في المواصفة؛ يعتمد التحقق على الفحص الساكن الصارم والبناء وسيناريوهات `quickstart.md`.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: يمكن تنفيذ المهمة بالتوازي (ملفات مختلفة دون تعارض اعتمادية)
- **[Story]**: ربط المهمة بقصة المستخدم المقابلة (`[US1]`, `[US2]`, `[US3]`)
- تتضمن كل مهمة المسار الفعلي للملف المستهدف

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: التحقق من جاهزية فرع التطوير ووثائق التصميم المعتمدة

- [x] T001 التحقق من فرع `feature/phase4-final-gaps` وبنية ملفات المواصفة والتصميم في `specs/013-phase4-final-gaps/plan.md`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: مخططات التحقق الأساسية وثوابت الحدود القصوى المشتركة بين الواجهة والخادم

- [x] T002 [P] إضافة مخطط التحقق `updateBatchClassificationSchema` لتعديل مسمى التصنيف في `next/lib/validations/student.ts`
- [x] T003 [P] إضافة مخطط التحقق الأمني المزدوج `restoreUploadBackupSchema` (عبارة التأكيد الدقيقة وكلمة مرور مدير النظام) في `next/lib/validations/backup.ts`
- [x] T004 [P] تعريف ثابت الحد الأقصى لحجم الأرشيف الخارجي المرفوع `MAX_EXTERNAL_RESTORE_BYTES` (2 جيجابايت) في `next/lib/validations/backup.ts`

**Checkpoint**: مخططات التحقق والثوابت جاهزة — يمكن مواصلة قصص المستخدم بشكل مستقل

---

## Phase 3: User Story 1 - تعديل مسمى التصنيف التخصصي لطلاب الدفعة (Priority: P1) 🎯 MVP

**Goal**: تمكين ضابط شئون الطلاب من تعديل مسمى أي تصنيف تخصصي قائم في المرحلة وتحديث كافة طلاب المرحلة المرتبطين به فوراً مع حفظ سجلات التمام اليومي التاريخية ثابتة.

**Independent Test**: فتح نافذة إدارة التصنيفات في تبويب المرحلة الحالية (`/students`)، تعديل مسمى تصنيف مرتبط بطلاب، التحقق من تحديث المسمى في الدفعة وفي جدول الطلاب ومنع الأسماء الفارغة والمكررة وتوثيق الحدث في سجل التدقيق.

### Implementation for User Story 1

- [x] T005 [US1] تنفيذ مسار `PUT` لتعديل مسمى التصنيف التخصصي في المرحلة مع تهيئة التصنيفات الافتراضية ومنع التكرار وتحديث `Student.classificationName` دون المساس بسجلات التمام اليومي التاريخية وتسجيل `AuditLog` في `next/app/api/students/stages/[id]/classifications/route.ts`
- [x] T006 [US1] تنفيذ واجهة التعديل الفوري للتصنيف التخصصي (حفظ، إلغاء، اختصارات لوحة المفاتيح، تصفير الحالة عند الإغلاق، وتنبيهات النجاح والرفض) في `next/components/students/CurrentStageTab.tsx`

**Checkpoint**: قصة المستخدم 1 مكتملة وقابلة للاختبار المستقل (`FR-001`, `FR-002`, `FR-003`, `FR-007`)

---

## Phase 4: User Story 2 - استعادة المنظومة من ملف أرشيف خارجي (Priority: P1)

**Goal**: تمكين مدير النظام من رفع واستعادة أرشيف `.tar.gz` / `.tgz` خارجي (حتى 2 جيجابايت) مع فحص المساحة الحرة والتحقق الأمني المزدوج وحفظ النسخة المرفوعة وتطبيق سياسة أحدث 4 نسخ والتنظيف عند الفشل.

**Independent Test**: فتح `/admin/backup` والنقر على زر "استعادة من أرشيف خارجي"، التحقق من رفض الامتدادات غير الصالحة والملفات الفارغة أو المتجاوزة 2 جيجابايت وعبارات التأكيد/كلمات المرور الخاطئة، ثم إتمام الاستعادة من أرشيف صالح والتحقق من تثبيت السجل وتطبيق سقف 4 نسخ وتوثيق `AuditLog`.

### Implementation for User Story 2

- [x] T007 [US2] ضمان تثبيت سجل `RestoreOperation` عبر `findByIdAndUpdate` مع `upsert: true` بعد استعادة مجموعات قاعدة البيانات في `next/lib/backup/restore-engine.ts`
- [x] T008 [US2] دعم طلبات `multipart/form-data` لرفع ملف أرشيف خارجي مضغوط (`.tar.gz` / `.tgz`) غير فارغ والتحقق من كلمة مرور مدير النظام وعبارة التأكيد وتسجيل `AuditLog` وتنظيف الملفات المؤقتة عند الفشل في `next/app/api/admin/backup/restore/route.ts`
- [x] T009 [P] [US2] تحديث نافذة الاستعادة للتبديل بين نسخة محفوظة على الخادم ورفع ملف أرشيف خارجي مع التحقق من الصيغة وعبارة التأكيد وكلمة المرور في `next/components/admin/backup/RestoreModal.tsx`
- [x] T010 [P] [US2] إضافة زر مدخل مباشر "استعادة من أرشيف خارجي" في شريط أدوات إدارة النسخ الاحتياطي في `next/components/admin/backup/BackupManagementClient.tsx`
- [x] T011 [US2] مواءمة ضوابط التوضيح (`FR-005`, `FR-006`): التحقق من حد 2 جيجابايت (`MAX_EXTERNAL_RESTORE_BYTES`)، فحص المساحة الحرة (`checkDiskSpaceSufficient`)، بث الملف للقرص دون تخزينه بالذاكرة، إعادة تثبيت `BackupRecord` بعد `executeRestore`، وتطبيق `enforceRetentionPolicy` (أحدث 4 نسخ فقط) في `next/app/api/admin/backup/restore/route.ts`
- [x] T012 [P] [US2] إضافة فحص حد الحجم الأقصى (2 جيجابايت) للملف المرفوع وإظهار رسالة خطأ واضحة قبل الإرسال في `next/components/admin/backup/RestoreModal.tsx`

**Checkpoint**: قصة المستخدم 2 مكتملة ومتوافقة بالكامل مع جميع ضوابط التوضيح (`FR-004`, `FR-005`, `FR-006`, `FR-007`)

---

## Phase 5: User Story 3 - إغلاق وأرشفة المرحلة الرابعة في الوثائق المرجعية (Priority: P2)

**Goal**: اعتماد حالة المرحلة الرابعة كـ `COMPLETED` في وثيقة متطلبات المنتج وتوثيق المنجزات في سجل التغييرات.

**Independent Test**: مراجعة وثيقة متطلبات المنتج وسجل التغييرات والتأكد من تحديث حالة المرحلة الرابعة إلى `COMPLETED` وإدراج البندين المنجزين.

### Implementation for User Story 3

- [x] T013 [P] [US3] تحديث حالة المرحلة الرابعة إلى `COMPLETED` وإدراج بنود `FR-06.1` و`FR-07.4` في `PRD.md`
- [x] T014 [P] [US3] أرشفة وتوثيق إغلاق المرحلة الرابعة (`phase-4-completion`) في `.specify/memory/changelog.md` و`AGENTS.md`

**Checkpoint**: الوثائق المرجعية متطابقة مع الواقع التشغيلي (`FR-008`)

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: التحقق النهائي من الجودة الصارمة وبناء الإنتاج وتحديث فهرس التنقل

- [x] T015 تشغيل فحص الأنواع (`npx tsc --noEmit`) و`ESLint` (`npm run lint`) وبناء الإنتاج (`npm run build`) في `next/` بعد إتمام مهام المواءمة النهائية
- [x] T016 تحديث فهرس البنية (`graphify auto-update .`) والتحقق من سيناريوهات الدليل الإرشادي في `specs/013-phase4-final-gaps/quickstart.md` (تم تحديث `graphify` بنجاح؛ سيناريوهات الاختبار اليدوي في `quickstart.md` جاهزة للتحقق التفاعلي على الخادم الحي)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: مكتمل.
- **Foundational (Phase 2)**: `T004` يجب أن تسبق `T011` و`T012`.
- **User Story 1 (Phase 3)**: مكتملة (`T005`, `T006`).
- **User Story 2 (Phase 4)**: `T011` و`T012` تعتمدان على `T004` ويمكن تنفيذهما بالتوازي لاختلاف ملفاتهما.
- **User Story 3 (Phase 5)**: مكتملة (`T013`, `T014`).
- **Polish (Phase 6)**: `T015` و`T016` بعد إتمام `T011` و`T012`.

### Parallel Example: Remaining Alignment Tasks

```bash
# بعد إتمام T004 في next/lib/validations/backup.ts:
Task: "T011 [US2] مواءمة مسار POST /api/admin/backup/restore في next/app/api/admin/backup/restore/route.ts"
Task: "T012 [P] [US2] فحص حد 2 جيجابايت في next/components/admin/backup/RestoreModal.tsx"
```

---

## Implementation Strategy

- **MVP (US1)**: مكتمل بالكامل (`T005`–`T006`).
- **Incremental Delivery (US2 Remaining)**: تنفيذ `T004` ثم `T011` و`T012` بالتوازي لإتمام مواءمة ضوابط التوضيح (`FR-005`, `FR-006`)، ثم `T015` و`T016` للتحقق النهائي.
