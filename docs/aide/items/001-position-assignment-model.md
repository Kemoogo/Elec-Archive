# عنصر العمل 001: موديل PositionAssignment

**المصدر**: `docs/aide/queue/queue-001.md` — Item 001  
**المرحلة**: المرحلة 1 — الأساسات والصلاحيات  
**التاريخ**: 2026-04-10  
**الحالة**: ✅ Complete

---

## الوصف

إنشاء ملف `next/lib/db/models/PositionAssignment.ts` يتضمن Mongoose schema للتعيينات الوظيفية (Position Assignments). هذا الموديل يمثل سجلاً لتعيين ضابط في منصب معين (أساسي أو بديل)، ويشمل تاريخ البداية والنهاية ورقم الأمر والملاحظات.

الموديل يتبع نفس النمط المعماري المُستخدم في الموديلات الحالية (`Officer.ts`, `Leave.ts`, `Assignment.ts`):
- استيراد من `mongoose` (`Schema`, `model`, `models`, `Document`, `Types`)
- تعريف `const` arrays مع `as const` للـ enums
- تعريف TypeScript types من الـ arrays
- تعريف Arabic labels كـ `Record`
- تعريف `interface` يمتد `Document`
- إنشاء `Schema` مع `{ timestamps: true }`
- استخدام `pre("validate")` للتحقق المعقد
- إضافة `indexes` للحقول المطلوبة
- تصدير الموديل بنمط `models.X ?? model<IX>("X", XSchema)`

---

## الحقول

| الحقل | النوع | مطلوب | ملاحظات |
|-------|-------|-------|---------|
| `officerId` | `ObjectId` (ref: `Officer`) | ✅ | الضابط المُعيَّن |
| `positionTitle` | `string` | ✅ | عنوان المنصب (مثال: "رئيس قسم الإشارة") |
| `positionType` | `"primary" \| "substitute"` | ✅ | نوع التعيين: أساسي أو بديل |
| `substituteForOfficerId` | `ObjectId` (ref: `Officer`) | ❌ | الضابط الأصلي (مطلوب فقط إذا `positionType === "substitute"`) |
| `startDate` | `Date` | ✅ | تاريخ بداية التعيين |
| `endDate` | `Date` | ❌ | تاريخ نهاية التعيين (null = ساري) |
| `orderNumber` | `string` | ❌ | رقم الأمر الإداري |
| `notes` | `string` | ❌ | ملاحظات إضافية |
| `status` | `"active" \| "ended"` | ✅ | حالة التعيين (default: `"active"`) |
| `createdBy` | `ObjectId` (ref: `User`) | ✅ | المستخدم الذي أنشأ السجل |
| `updatedBy` | `ObjectId` (ref: `User`) | ✅ | المستخدم الذي عدّل السجل آخر مرة |
| `createdAt` | `Date` | auto | من `timestamps: true` |
| `updatedAt` | `Date` | auto | من `timestamps: true` |

---

## التحقق (Validation)

### على مستوى Schema (`pre("validate")`)

1. **`endDate >= startDate`**: إذا كان `endDate` موجوداً، يجب أن يكون بعد أو يساوي `startDate`. رسالة الخطأ: `"تاريخ الانتهاء يجب أن يكون بعد أو يساوي تاريخ البداية"`
2. **`substituteForOfficerId` ممنوع مع `primary`**: إذا كان `positionType === "primary"` و `substituteForOfficerId` موجوداً، يجب إبطال الحقل. رسالة الخطأ: `"لا يمكن تحديد ضابط بديل عنه في تعيين أساسي"`
3. **`substituteForOfficerId` مطلوب مع `substitute`**: إذا كان `positionType === "substitute"` و `substituteForOfficerId` غير موجود، يجب إبطال الحقل. رسالة الخطأ: `"يجب تحديد الضابط الأصلي في التعيين البديل"`

---

## الفهارس (Indexes)

```typescript
PositionAssignmentSchema.index({ officerId: 1, startDate: -1 });
PositionAssignmentSchema.index({ status: 1 });
PositionAssignmentSchema.index({ substituteForOfficerId: 1 }); // للبحث عن بدائل ضابط معين
```

---

## Exported Constants & Types

```typescript
// Enums
export const POSITION_TYPES = ["primary", "substitute"] as const;
export type PositionType = (typeof POSITION_TYPES)[number];

export const POSITION_STATUSES = ["active", "ended"] as const;
export type PositionStatus = (typeof POSITION_STATUSES)[number];

// Arabic Labels
export const POSITION_TYPE_LABELS: Record<PositionType, string> = {
  primary: "أساسي",
  substitute: "بديل",
};

export const POSITION_STATUS_LABELS: Record<PositionStatus, string> = {
  active: "ساري",
  ended: "منتهي",
};

// Interface
export interface IPositionAssignment extends Document { ... }

// Model
export const PositionAssignment = models.PositionAssignment ?? model<IPositionAssignment>("PositionAssignment", PositionAssignmentSchema);
```

---

## معايير القبول (Acceptance Criteria)

- [ ] ملف `next/lib/db/models/PositionAssignment.ts` موجود ويتبع نمط الموديلات الحالية
- [ ] جميع الحقول المذكورة في الجدول مُعرَّفة بشكل صحيح
- [ ] `POSITION_TYPES` و `POSITION_STATUSES` مُعرَّفة كـ `const` arrays
- [ ] `POSITION_TYPE_LABELS` و `POSITION_STATUS_LABELS` مُعرَّفة كـ `Record`
- [ ] `IPositionAssignment` interface مُعرَّف ويمتد `Document`
- [ ] `pre("validate")` يتحقق من:
  - `endDate >= startDate`
  - منع `substituteForOfficerId` مع `positionType === "primary"`
  - طلب `substituteForOfficerId` مع `positionType === "substitute"`
- [ ] الفهارس الثلاثة مُضافة (`officerId + startDate`, `status`, `substituteForOfficerId`)
- [ ] الموديل يُصدَّر بنمط `models.X ?? model<IX>("X", XSchema)`
- [ ] لا أخطاء TypeScript (`tsc --noEmit`)
- [ ] لا تحذيرات ESLint جديدة
- [ ] لا `any` في أي مكان في الملف

---

## خطوات التنفيذ (Implementation Steps)

### الخطوة 1: إنشاء ملف الموديل

1. أنشئ `next/lib/db/models/PositionAssignment.ts`
2. استورد من `mongoose`: `Schema`, `model`, `models`, `Document`, `Types`
3. عرّف `POSITION_TYPES` و `POSITION_STATUSES` كـ `const` arrays
4. عرّف TypeScript types: `PositionType`, `PositionStatus`
5. عرّف Arabic labels: `POSITION_TYPE_LABELS`, `POSITION_STATUS_LABELS`

### الخطوة 2: تعريف Interface

1. عرّف `IPositionAssignment extends Document` مع جميع الحقول
2. تأكد من أن `officerId` و `substituteForOfficerId` نوعهم `Types.ObjectId`
3. الحقول الاختيارية (`endDate`, `orderNumber`, `notes`, `substituteForOfficerId`) مع `?`

### الخطوة 3: إنشاء Schema

1. أنشئ `PositionAssignmentSchema` مع `{ timestamps: true }`
2. عرّف كل حقل مع `type`, `required`, `enum`, `ref`, `trim`, `default` حسب الحاجة
3. `status` default: `"active"`
4. `positionType` مع `enum: POSITION_TYPES`

### الخطوة 4: إضافة Validations

1. أضف `pre("validate")` مع التحققات الثلاثة المذكورة
2. استخدم `this.invalidate()` لكل تحقق فاشل (نفس نمط `Assignment.ts` و `Leave.ts`)

### الخطوة 5: إضافة Indexes

1. `{ officerId: 1, startDate: -1 }` — للبحث عن تعيينات ضابط مرتبة زمنياً
2. `{ status: 1 }` — للفلترة بحالة التعيين
3. `{ substituteForOfficerId: 1 }` — للبحث عن بدائل ضابط معين

### الخطوة 6: تصدير الموديل

1. صدّر بنمط `models.PositionAssignment ?? model<IPositionAssignment>("PositionAssignment", PositionAssignmentSchema)`

---

## استراتيجية الاختبار (Testing Strategy)

### اختبار هيكلي (Structural)
- التحقق من أن الملف يُستورد بنجاح بدون أخطاء
- التحقق من أن جميع الـ exports موجودة (`PositionAssignment`, `POSITION_TYPES`, `POSITION_STATUSES`, `POSITION_TYPE_LABELS`, `POSITION_STATUS_LABELS`, `IPositionAssignment`)
- التحقق من أن `npm run build` ينجح

### اختبار وظيفي (Functional — عبر MongoDB)
- إنشاء سجل تعيين أساسي بنجاح
- إنشاء سجل تعيين بديل مع `substituteForOfficerId` بنجاح
- فشل الإنشاء إذا `positionType === "primary"` مع `substituteForOfficerId`
- فشل الإنشاء إذا `positionType === "substitute"` بدون `substituteForOfficerId`
- فشل الإنشاء إذا `endDate < startDate`
- التحقق من أن `timestamps` (`createdAt`, `updatedAt`) تُملأ تلقائياً

---

## الاعتمادات (Dependencies)

| الاعتماد | الوصف |
|-----------|-------|
| `mongoose` | مثبت بالفعل في المشروع |
| `Officer` model | مطلوب كـ `ref` لحقلي `officerId` و `substituteForOfficerId` |
| `User` model | مطلوب كـ `ref` لحقلي `createdBy` و `updatedBy` |

لا اعتمادات خارجية جديدة مطلوبة.

---

## متطلبات الاختبار (Testing Prerequisites)

### الخدمات المطلوبة

| الخدمة | الإصدار | أمر التشغيل | المنفذ |
|--------|---------|-------------|--------|
| MongoDB | 7.x | `docker-compose up -d mongo` | 27017 |

### إعدادات البيئة

- ملف `.env.local` في `next/` يحتوي على:
  ```
  MONGODB_URI=mongodb://localhost:27017/elec-archive
  ```
- لا متغيرات بيئة جديدة مطلوبة لهذا العنصر

### قائمة التحقق اليدوي

- [ ] **البناء ينجح**: `cd next && npm run build`
- [ ] **الفحص ينجح**: `cd next && npm run lint`
- [ ] **الخدمات تعمل**: `docker-compose up -d mongo`
- [ ] **التطبيق يعمل**: `cd next && npm run dev`
- [ ] **الملف موجود**: `next/lib/db/models/PositionAssignment.ts`
- [ ] **TypeScript بدون أخطاء**: لا أخطاء في `PositionAssignment.ts`
- [ ] **الاستيراد يعمل**: الموديل يمكن استيراده من ملف آخر بدون خطأ

### النتائج المتوقعة

- ملف `next/lib/db/models/PositionAssignment.ts` موجود (~80-120 سطر)
- الموديل يُصدَّر بشكل صحيح ويمكن استيراده
- `npm run build` ينجح بدون أخطاء
- `npm run lint` بدون تحذيرات جديدة
- لا `any` في الملف
- لا كسر في أي موديل أو ملف آخر

---

## توثيق التحقق (Validation Documentation Template)

```markdown
## نتائج التحقق — عنصر 001
- [ ] MongoDB يعمل (Port 27017)
- [ ] التطبيق يعمل بنجاح
- [ ] الملف موجود: `next/lib/db/models/PositionAssignment.ts`
- [ ] `npm run build` يمر بنجاح
- [ ] `npm run lint` بدون تحذيرات جديدة
- [ ] لا أخطاء TypeScript
- [ ] الـ exports تعمل: PositionAssignment, POSITION_TYPES, POSITION_STATUSES, IPositionAssignment
- [ ] Validation: endDate >= startDate يعمل
- [ ] Validation: substituteForOfficerId ممنوع مع primary يعمل
- [ ] Validation: substituteForOfficerId مطلوب مع substitute يعمل
```

---

## القرارات والمفاضلات (Decisions & Trade-offs)

سيتم تحديثه أثناء التنفيذ.

### القرارات المتخذة

1. **نمط الاستيراد**: اتبعنا بالضبط نمط `Assignment.ts` — استيراد `type Document` و`type Types` كـ type-only imports لتجنب side-effects غير ضرورية.

2. **`pre("validate")` بدون `next`**: استخدمنا `function()` بدون استدعاء `next()` وهو النمط الموجود في `Assignment.ts` و `Leave.ts` (Mongoose يدعم this automatically).

3. **`substituteForOfficerId` اختياري في Schema**: عُرِّف الحقل بدون `required: true` في Schema لأن الـ validation المركب (primary vs substitute) يُعالَج عبر `pre("validate")`، وهو أكثر مرونة ويُنتج رسائل خطأ عربية واضحة.

4. **لا `unique` index على `officerId + positionTitle`**: قرار متعمد — الضابط يمكن أن يُعيَّن في نفس المنصب في فترات مختلفة (مثال: تعيين، إنهاء، ثم إعادة تعيين). الـ uniqueness تُضبط منطقياً عبر `status`.

5. **`endDate` غير مطلوب**: التعيين الساري لا يملك `endDate`، وهذا يعكس الواقع العملي حيث التعيين ينتهي لاحقاً بتغيير `status` إلى `"ended"` وإضافة `endDate`.

6. **الـ indexes الثلاثة**: اتبعنا المواصفة بالضبط — `{ officerId, startDate }` للبحث الزمني، `{ status }` للفلترة، `{ substituteForOfficerId }` لإيجاد جميع حالات البديل لضابط معين.

### النتائج
- `tsc --noEmit`: لا أخطاء جديدة (الخطأ الموجود في `OfficersPageClient.tsx` كان موجوداً قبل التنفيذ)
- `eslint lib/db/models/PositionAssignment.ts`: صفر تحذيرات/أخطاء
- لا `any` في الملف
- ~100 سطر (ضمن النطاق المتوقع 80-120 سطر)

---

## تعديلات خاصة بالمشروع (Project-Specific Adaptations)

- **نمط الموديل**: يتبع بالضبط نمط `Assignment.ts` و `Leave.ts` (imports, const arrays, types, labels, interface, schema, pre-validate, indexes, export)
- **RTL/Arabic**: جميع رسائل التحقق بالعربية (نفس نمط الموديلات الحالية)
- **`updatedBy`**: مُضاف كحقل مطلوب (نفس نمط `Assignment.ts` و `Leave.ts`) للتتبع الكامل
- **لا حذف فعلي**: لا يوجد حقل `isDeleted`؛ يتم إنهاء التعيين بتغيير `status` إلى `"ended"` وملء `endDate`

---

## تذكير الإكمال ⚠️

عند إكمال هذا العنصر، يجب تحديث `docs/aide/progress.md`:
- المخرج 1.1 (موديل `PositionAssignment`): 📋 → 🚧 → ✅

---

## الخطوة التالية

ابدأ **جلسة جديدة** وشغّل `/speckit.aide.execute-item` مع رقم العنصر `001` لتنفيذه.
