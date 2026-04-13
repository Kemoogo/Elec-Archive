# قائمة العمل — الدفعة 001

**التاريخ**: 2026-04-10  
**المصدر**: `docs/aide/roadmap.md` (المرحلة 1 + بداية المرحلة 2)  
**النطاق**: المرحلة 1 بالكامل (الأساسات والصلاحيات) + سكريبت الترحيل من المرحلة 2  
**الحجم المُقدَّر**: ~أسبوع واحد

---

## العناصر

### Item 001: موديل PositionAssignment

إنشاء ملف `next/lib/db/models/PositionAssignment.ts` يتضمن Mongoose schema للتعيينات الوظيفية. الحقول: `officerId`, `positionTitle`, `positionType` (`primary` | `substitute`), `substituteForOfficerId?`, `startDate`, `endDate?`, `orderNumber?`, `notes?`, `status` (`active` | `ended`), `createdBy`. إضافة indexes على `officerId + startDate` و `status`. إضافة validation: `endDate >= startDate`، ومنع `substituteForOfficerId` إذا `positionType === "primary"`. التأكد من أن الموديل يتبع نمط الموديلات الحالية في المشروع (مثل `Officer.ts`, `Leave.ts`).

### Item 002: موديل Promotion

إنشاء ملف `next/lib/db/models/Promotion.ts` يتضمن Mongoose schema للترقيات. الحقول: `officerId`, `fromRank` (OfficerRank enum), `toRank` (OfficerRank enum), `effectiveDate`, `orderNumber?`, `notes?`, `createdBy`. إضافة index على `officerId + effectiveDate`. إضافة validation: `toRank !== fromRank`. استخدام نفس OfficerRank enum الموجود في المشروع.

### Item 003: موديل Mission

إنشاء ملف `next/lib/db/models/Mission.ts` يتضمن Mongoose schema للمأموريات. الحقول: `officerId`, `title`, `description?`, `destination?`, `startDate`, `endDate?`, `status` (`scheduled` | `active` | `completed` | `cancelled`), `createdBy`, `updatedBy`. إضافة indexes على `officerId + startDate` و `status`. إضافة validation: `endDate >= startDate`.

### Item 004: تصدير الموديلات الجديدة من index.ts

تحديث ملف `next/lib/db/models/index.ts` لتصدير الموديلات الثلاثة الجديدة (`PositionAssignment`, `Promotion`, `Mission`). التأكد من أن الاستيرادات تعمل بشكل صحيح ولا تكسر التصديرات الحالية.

### Item 005: تسجيل صلاحية arkan_harb في نظام المصادقة

تحديث ثلاثة ملفات لتسجيل صلاحية `arkan_harb` الجديدة:
1. `next/lib/db/models/User.ts` — إضافة `arkan_harb: ModulePermission` لكائن `permissions`
2. `next/lib/auth/types.ts` — إضافة `arkan_harb` لنوع `ModulePermissions`
3. `next/lib/validations/auth.ts` (أو ملف schemas المقابل) — إضافة `arkan_harb` لـ Zod schema

التحقق من أن الصلاحية تظهر في لوحة إدارة المستخدمين عند إنشاء/تعديل مستخدم. التأكد من أن نظام `authorization.ts` يعمل تلقائياً مع الصلاحية الجديدة بدون تعديل إضافي.

### Item 006: Zod Schemas لأركان الحرب

إنشاء ملف `next/lib/validations/arkan-harb.ts` يحتوي على جميع Zod schemas اللازمة:
- `createMissionSchema` + `updateMissionSchema`
- `createPromotionSchema` + `updatePromotionSchema`
- `createPositionAssignmentSchema` + `updatePositionAssignmentSchema`

كل schema يتوافق مع حقول الموديل المقابل ويتضمن التحقق من صحة البيانات (مثل `endDate >= startDate`, `toRank !== fromRank`). استخدام أنماط Zod الموجودة في المشروع كمرجع.

### Item 007: بناء واختبار المرحلة 1

تنفيذ `npm run build` و `npm run lint` للتأكد من أن جميع التغييرات في المرحلة 1 (الموديلات + الصلاحيات + Zod schemas) تمر بنجاح. التحقق من:
- الموديلات الثلاثة تُصدَّر من `index.ts` بشكل صحيح
- صلاحية `arkan_harb` مسجلة في النظام
- لا أي كسر في سلوك النظام الحالي
- لا أخطاء TypeScript أو تحذيرات ESLint جديدة

### Item 008: سكريبت ترحيل Assignment → 3 موديلات

إنشاء ملف `next/scripts/migrate-assignments.ts` لترحيل بيانات `Assignment` القديم إلى الموديلات الثلاثة الجديدة:
- `type === "promotion"` → إنشاء سجل `Promotion` مع ملء `fromRank`/`toRank`
- `type === "mission"` → إنشاء سجل `Mission`
- `type === "assignment"` → إنشاء سجل `PositionAssignment` (كتعيين أساسي)

يجب دعم `--dry-run` flag لمعاينة التغييرات بدون كتابة. طباعة تقرير الترحيل (عدد السجلات لكل نوع + الأخطاء). عدم حذف سجلات `Assignment` الأصلية.

### Item 009: API Routes — المأموريات (Missions)

إنشاء API routes تحت `next/app/api/arkan-harb/missions/`:
- `route.ts`: `GET` (قائمة + فلترة بـ `officerId`/`status`) + `POST` (إنشاء مأمورية جديدة)
- `[id]/route.ts`: `PATCH` (تحديث مأمورية) — لا حذف فعلي

كل route يتبع pipeline: `auth → rate-limit → RBAC (arkan_harb: edit) → Zod → DB → audit → response`. التأكد من: رفض بدون مصادقة (401)، رفض بدون صلاحية (403)، Audit log لكل عملية كتابة.

### Item 010: API Routes — الترقيات (Promotions)

إنشاء API routes تحت `next/app/api/arkan-harb/promotions/`:
- `route.ts`: `GET` (قائمة + فلترة بـ `officerId`) + `POST` (إنشاء ترقية جديدة)
- `[id]/route.ts`: `PATCH` (تحديث ترقية)

ملاحظة: `POST` يقبل أيضاً صلاحية `officers: edit` (الترقيات تُدار من شئون الضباط أيضاً). كل route يتبع نفس pipeline الأمان. التأكد من Audit log لكل عملية كتابة.

---

## الخطوة التالية

اختر عنصراً من القائمة وابدأ **جلسة جديدة**. شغّل `/speckit.aide.create-item` مع وصف العنصر لإنشاء مواصفات تفصيلية.
