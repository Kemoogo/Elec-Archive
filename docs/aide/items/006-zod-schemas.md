# Item 006: Zod Schemas لأركان الحرب

## Overview

إنشاء ملف `next/lib/validations/arkan-harb.ts` يحتوي على جميع Zod schemas اللازمة للتحقق من صحة بيانات الموديلات الجديدة (`Mission`, `Promotion`, `PositionAssignment`) واستخدامها لاحقاً في API Routes والواجهات.

## Description

إنشاء ملف يُعرّف مخططات Zod الخاصة بإنشاء وتحديث السجلات المرتبطة بالنماذج التي تمت إضافتها مسبقاً. يجب أن يعكس كل schema حقول الموديل الخاص به ويتضمن عمليات التحقق الأساسية مثل `endDate >= startDate` و `toRank !== fromRank`.

يجب توفير الـ Schemas التالية:
- `createMissionSchema` و `updateMissionSchema`
- `createPromotionSchema` و `updatePromotionSchema`
- `createPositionAssignmentSchema` و `updatePositionAssignmentSchema`

## Dependencies

- ✅ استكمال Item 001 (`PositionAssignment` Model)
- ✅ استكمال Item 002 (`Promotion` Model)
- ✅ استكمال Item 003 (`Mission` Model)
- الموديلات والمصادقات من المراحل السابقة.

## Implementation Steps

1. إنشاء ملف `next/lib/validations/arkan-harb.ts`.
2. استيراد المراجع وأنواع البيانات اللازمة من المشروع (مثل `OfficerRank` إن كان مستخدما أو تعريفه عبر `z.enum`).
3. تعريف **PositionAssignment Schemas**:
   - `createPositionAssignmentSchema`: يحتوي على `officerId` (ObjectId)، `positionTitle`، `positionType` (إما `primary` أو `substitute`)، `substituteForOfficerId` (اختياري)، `startDate`، `endDate` (اختياري)، `orderNumber` (اختياري)، و`notes` (اختياري).
   - توفير التحقق الذي يمنع وضع `substituteForOfficerId` إذا كان `positionType === 'primary'`.
   - توفير التحقق لضمان `endDate >= startDate` (عند توفر النهاية).
   - `updatePositionAssignmentSchema`: يقبل تحديثات جزئية بنفس شروط التحقق.
4. تعريف **Promotion Schemas**:
   - `createPromotionSchema`: يحتوي على `officerId` (ObjectId)، `fromRank`، `toRank`، `effectiveDate`، `orderNumber`، و `notes`.
   - توفير تحقق لضمان أن `toRank` لا يساوي `fromRank`.
   - `updatePromotionSchema`: تحديث جزئي للمجالات المسموحة.
5. تعريف **Mission Schemas**:
   - `createMissionSchema`: يحتوي على `officerId` (ObjectId)، `title`، `description`، `destination`، `startDate`، `endDate`، و `status` (`scheduled`, `active`, `completed`, `cancelled`).
   - توفير التحقق لضمان `endDate >= startDate`.
   - `updateMissionSchema`: لتحديث المأموريات بشكل جزئي.
6. تصدير جميع Schemas جنباً إلى جنب مع نظائر من أنواع TypeScript المرجعية (Infer Types) لتعزيز الـ Type Safety في Frontend و Backend.

## Acceptance Criteria

- [ ] يوجد ملف `next/lib/validations/arkan-harb.ts` ويُصدّر الـ 6 مخططات المطلوبة وأنواعها.
- [ ] قواعد التحقق المخصصة (`endDate >= startDate`، `toRank !== fromRank`، منع `substituteForOfficerId` إذا كان النوع `primary`) مُلباة بنجاح، وتُخرج رسائل خطأ مناسبة.
- [ ] جميع الأنواع مرتبطة بتوافق تام مع حقول الـ Mongoose Models المقابلة.
- [ ] عملية `npm run lint` تمر بدون تحذيرات جديدة، أو أخطاء TypeScript.
- [ ] `npm run build` ينجح بالكامل.

## Testing Strategy

- إنشاء وتصدير الـ Schemas بصورة صحيحة بدون أخطاء TypeScript (Validation Types).
- تنفيذ إنشاء Dummy Objects ومحاولة تمريرها عبر كل من الدالات الصالحة والخاطئة (باستخدام `.safeParse()`) للتحقق من أن رسائل الـ validation تتم كما هو متوقع في الـ Error cases و الـ happy paths.

## Testing Prerequisites

**Required Services**
- لا حواضن خارجية كـ Database مطلوبة للـ Zod Validation فقط (بافتراض أن الاختبار يتم بمعزل، ولكن إقلاع التطبيق والتأكد من نجاح الـ build ضروري).

**Environment Configuration**
- وجود بيئة Next.js عاملة مع `npm run dev` للتأكد من عدم وجود مشاكل في الاستيرادات.
- الأوامر الاساسية: `npm run lint`، `npm run build`.

**Manual Validation Checklist**
- [ ] Build succeeds (`npm run build`)
- [ ] Zod schema verification: test with a scratch validation script testing rules that ensure `fromRank !== toRank`, `endDate >= startDate`, and restricted `substituteForOfficerId`.

**Expected Outcomes**
- كود آمن للاستخدام من قبل الـ API Routes في الخطوات القادمة للمشروع، يسهل معه التحقق من سلامة الطلبات.

## Decisions & Trade-offs

- Created `createPositionAssignmentSchema`, `updatePositionAssignmentSchema`, `createPromotionSchema`, `updatePromotionSchema`, `createMissionSchema`, and `updateMissionSchema` as requested.
- Required `startDate` and `endDate` to be verified properly within `superRefine`: if `endDate` doesn't exist, ignore; but if both exist, verify that `endDate` >= `startDate`. Safe checks added `new Date(data.endDate) < new Date(data.startDate)` only when both exist to prevent `Invalid Date` false-positive execution for partial queries.
- Ensured `substituteForOfficerId` is forbidden for `primary` and required for `substitute` tasks via the `superRefine` method.
- Passed all type safety and validation gates. build completed gracefully.

## Completion Reminder

ملاحظة لمطوري التنفيذ: يرجى تحديث `docs/aide/progress.md` (تغيير الحالة من 📋 ← 🚧 ← ✅) عند الانتهاء من التنفيذ.
