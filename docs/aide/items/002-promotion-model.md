# عنصر العمل 002: موديل Promotion

**المصدر**: `docs/aide/queue/queue-001.md` — Item 002  
**المرحلة**: المرحلة 1 — الأساسات والصلاحيات  
**التاريخ**: 2026-04-10  
**الحالة**: ✅ Complete

---

## الوصف

إنشاء ملف `next/lib/db/models/Promotion.ts` يتضمن Mongoose schema للترقيات. هذا الموديل هو بديل عن `Assignment` حيث `type === "promotion"`، ويفصل بيانات الترقيات إلى موديل مستقل مع حقول أكثر دقة (`fromRank`, `toRank` بدلاً من `title` عام).

الموديل يتبع نفس النمط المعماري المُستخدم في الموديلات الحالية (`Officer.ts`, `Leave.ts`, `PositionAssignment.ts`):
- استيراد من `mongoose` (`Schema`, `model`, `models`, `Document`, `Types`)
- استيراد `OFFICER_RANKS` و `OfficerRank` من `./Officer` (إعادة استخدام enum الرتب الموجود)
- تعريف `interface` يمتد `Document`
- إنشاء `Schema` مع `{ timestamps: true }`
- استخدام `pre("validate")` للتحقق المعقد
- إضافة `indexes` للحقول المطلوبة
- تصدير الموديل بنمط `models.X ?? model<IX>("X", XSchema)`

---

## الحقول

| الحقل | النوع | مطلوب | ملاحظات |
|-------|-------|-------|---------|
| `officerId` | `ObjectId` (ref: `Officer`) | ✅ | الضابط المُرقَّى |
| `fromRank` | `OfficerRank` | ✅ | الرتبة السابقة (من `OFFICER_RANKS` في `Officer.ts`) |
| `toRank` | `OfficerRank` | ✅ | الرتبة الجديدة (من `OFFICER_RANKS` في `Officer.ts`) |
| `effectiveDate` | `Date` | ✅ | تاريخ سريان الترقية |
| `orderNumber` | `string` | ❌ | رقم الأمر الإداري |
| `notes` | `string` | ❌ | ملاحظات إضافية |
| `createdBy` | `ObjectId` (ref: `User`) | ✅ | المستخدم الذي أنشأ السجل |
| `updatedBy` | `ObjectId` (ref: `User`) | ✅ | المستخدم الذي عدّل السجل آخر مرة |
| `createdAt` | `Date` | auto | من `timestamps: true` |
| `updatedAt` | `Date` | auto | من `timestamps: true` |

---

## التحقق (Validation)

### على مستوى Schema (`pre("validate")`)

1. **`toRank !== fromRank`**: الرتبة الجديدة يجب أن تكون مختلفة عن الرتبة السابقة. رسالة الخطأ: `"الرتبة الجديدة يجب أن تكون مختلفة عن الرتبة الحالية"`

**ملاحظة**: لا نتحقق من ترتيب الرتب (أن `toRank` أعلى من `fromRank`) لأن هناك حالات تخفيض رتبة حقيقية في الممارسة العسكرية. التحقق الوحيد هو أن الرتبتين مختلفتان.

---

## الفهارس (Indexes)

```typescript
PromotionSchema.index({ officerId: 1, effectiveDate: -1 });
```

- **`{ officerId: 1, effectiveDate: -1 }`** — للبحث عن ترقيات ضابط مرتبة زمنياً (الأحدث أولاً)

---

## Exported Constants & Types

```typescript
// Re-used from Officer.ts — no new enums needed
import { OFFICER_RANKS, type OfficerRank } from "./Officer";

// Interface
export interface IPromotion extends Document {
  officerId: Types.ObjectId;
  fromRank: OfficerRank;
  toRank: OfficerRank;
  effectiveDate: Date;
  orderNumber?: string;
  notes?: string;
  createdBy: Types.ObjectId;
  updatedBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

// Model
export const Promotion = models.Promotion ?? model<IPromotion>("Promotion", PromotionSchema);
```

---

## معايير القبول (Acceptance Criteria)

- [ ] ملف `next/lib/db/models/Promotion.ts` موجود ويتبع نمط الموديلات الحالية
- [ ] جميع الحقول المذكورة في الجدول مُعرَّفة بشكل صحيح
- [ ] `fromRank` و `toRank` يستخدمان `OFFICER_RANKS` enum من `Officer.ts`
- [ ] `IPromotion` interface مُعرَّف ويمتد `Document`
- [ ] `pre("validate")` يتحقق من أن `toRank !== fromRank`
- [ ] الفهرس `{ officerId: 1, effectiveDate: -1 }` مُضاف
- [ ] الموديل يُصدَّر بنمط `models.Promotion ?? model<IPromotion>("Promotion", PromotionSchema)`
- [ ] لا أخطاء TypeScript (`tsc --noEmit`)
- [ ] لا تحذيرات ESLint جديدة
- [ ] لا `any` في أي مكان في الملف
- [ ] لا كسر في الاستيرادات الحالية من `Officer.ts`

---

## خطوات التنفيذ (Implementation Steps)

### الخطوة 1: إنشاء ملف الموديل

1. أنشئ `next/lib/db/models/Promotion.ts`
2. استورد من `mongoose`: `Schema`, `model`, `models`, `type Document`, `type Types`
3. استورد من `./Officer`: `OFFICER_RANKS`, `type OfficerRank`

### الخطوة 2: تعريف Interface

1. عرّف `IPromotion extends Document` مع جميع الحقول
2. `officerId`, `createdBy`, `updatedBy` نوعهم `Types.ObjectId`
3. `fromRank`, `toRank` نوعهم `OfficerRank`
4. الحقول الاختيارية (`orderNumber`, `notes`) مع `?`

### الخطوة 3: إنشاء Schema

1. أنشئ `PromotionSchema` مع `{ timestamps: true }`
2. عرّف كل حقل:
   - `officerId`: `{ type: Schema.Types.ObjectId, ref: "Officer", required: true }`
   - `fromRank`: `{ type: String, required: true, enum: OFFICER_RANKS }`
   - `toRank`: `{ type: String, required: true, enum: OFFICER_RANKS }`
   - `effectiveDate`: `{ type: Date, required: true }`
   - `orderNumber`: `{ type: String, trim: true }`
   - `notes`: `{ type: String, trim: true }`
   - `createdBy`: `{ type: Schema.Types.ObjectId, ref: "User", required: true }`
   - `updatedBy`: `{ type: Schema.Types.ObjectId, ref: "User", required: true }`

### الخطوة 4: إضافة Validation

1. أضف `pre("validate")` مع التحقق:
   - إذا `this.toRank === this.fromRank`، استخدم `this.invalidate("toRank", "الرتبة الجديدة يجب أن تكون مختلفة عن الرتبة الحالية")`

### الخطوة 5: إضافة Index

1. `{ officerId: 1, effectiveDate: -1 }` — للبحث عن ترقيات ضابط مرتبة زمنياً

### الخطوة 6: تصدير الموديل

1. صدّر بنمط `models.Promotion ?? model<IPromotion>("Promotion", PromotionSchema)`

---

## استراتيجية الاختبار (Testing Strategy)

### اختبار هيكلي (Structural)
- التحقق من أن الملف يُستورد بنجاح بدون أخطاء
- التحقق من أن جميع الـ exports موجودة (`Promotion`, `IPromotion`)
- التحقق من أن `OFFICER_RANKS` و `OfficerRank` مستوردة بشكل صحيح من `Officer.ts`
- التحقق من أن `npm run build` ينجح

### اختبار وظيفي (Functional — عبر MongoDB)
- إنشاء سجل ترقية بنجاح مع `fromRank !== toRank`
- فشل الإنشاء إذا `toRank === fromRank`
- فشل الإنشاء إذا `fromRank` أو `toRank` خارج `OFFICER_RANKS`
- فشل الإنشاء بدون `officerId` أو `effectiveDate` أو `fromRank` أو `toRank`
- التحقق من أن `timestamps` (`createdAt`, `updatedAt`) تُملأ تلقائياً

---

## الاعتمادات (Dependencies)

| الاعتماد | الوصف |
|-----------|-------|
| `mongoose` | مثبت بالفعل في المشروع |
| `Officer` model | مطلوب لاستيراد `OFFICER_RANKS` و `OfficerRank`، ومطلوب كـ `ref` لحقل `officerId` |
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
- [ ] **الملف موجود**: `next/lib/db/models/Promotion.ts`
- [ ] **TypeScript بدون أخطاء**: لا أخطاء في `Promotion.ts`
- [ ] **الاستيراد يعمل**: الموديل يمكن استيراده من ملف آخر بدون خطأ
- [ ] **استيراد `OFFICER_RANKS` يعمل**: لا كسر في استيرادات `Officer.ts`

### النتائج المتوقعة

- ملف `next/lib/db/models/Promotion.ts` موجود (~50-70 سطر)
- الموديل يُصدَّر بشكل صحيح ويمكن استيراده
- `OFFICER_RANKS` مُستخدم كـ `enum` لحقلي `fromRank` و `toRank`
- `npm run build` ينجح بدون أخطاء
- `npm run lint` بدون تحذيرات جديدة
- لا `any` في الملف
- لا كسر في أي موديل أو ملف آخر

---

## توثيق التحقق (Validation Documentation Template)

## نتائج التحقق — عنصر 002
- [x] الملف موجود: `next/lib/db/models/Promotion.ts`
- [x] `tsc --noEmit`: لا أخطاء في `Promotion.ts`
- [x] `npm run lint`: لا تحذيرات جديدة من `Promotion.ts` (التحذيرات الموجودة سابقة)
- [x] الـ exports تعمل: `Promotion`, `IPromotion`
- [x] `OFFICER_RANKS` مُستورد ومُستخدم بنجاح من `Officer.ts`
- [x] Validation: `toRank !== fromRank` يعمل
- [x] Validation: enum constraint على `fromRank`/`toRank` يعمل
- [x] Index `{ officerId: 1, effectiveDate: -1 }` مُضاف
- [x] لا `any` في الملف

---

## القرارات والمفاضلات (Decisions & Trade-offs)

**القرار 1: Guard كلا الحقلين في `pre("validate")`**  
تمت إضافة `this.toRank && this.fromRank &&` قبل المقارنة لتفادي false-positive عند وجود حقل فارغ (يُعالَج أصلاً بـ `required: true` لكن الدفاع في العمق أفضل).

**القرار 2: عدم التحقق من ترتيب الرتب**  
المواصفة تنص صراحةً على أن لا نتحقق من أن `toRank` أعلى من `fromRank` لأن حالات تخفيض الرتبة موجودة فعلاً في الممارسة العسكرية. التحقق الوحيد هو أن الرتبتين مختلفتان.

**القرار 3: الفهرس `{ officerId: 1, effectiveDate: -1 }`**  
الترتيب التنازلي على `effectiveDate` يُمكّن استرجاع آخر ترقية بكفاءة — أكثر حالات الاستخدام تحتاج “آخر ترقية للضابط” وليس الأولى.

**القرار 4: لا `status` field**  
الترقية حدث تاريخي لا رجعة فيه — يُكتفى بـ `effectiveDate`. إضافة حقل حالة ستُعقّد النموذج بدون فائدة.

---

## تعديلات خاصة بالمشروع (Project-Specific Adaptations)

- **إعادة استخدام `OFFICER_RANKS`**: بدلاً من تعريف enum جديد للرتب، يُستورد `OFFICER_RANKS` و `OfficerRank` مباشرة من `./Officer`. هذا يضمن مصدر حقيقة واحد (Single Source of Truth) للرتب العسكرية.
- **لا Arabic Labels جديدة**: الرتب لها labels عربية موجودة فعلاً في `RANK_LABELS` من `Officer.ts`. الموديل لا يحتاج labels خاصة به.
- **`updatedBy` مطلوب**: نفس نمط `PositionAssignment.ts` و `Leave.ts` و `Assignment.ts` — حقل مطلوب للتتبع الكامل.
- **RTL/Arabic**: رسائل التحقق بالعربية (نفس نمط الموديلات الحالية).
- **لا `status` field**: الترقية حدث تاريخي — لا تحتاج حالة (scheduled/active/completed). تاريخ السريان (`effectiveDate`) كافٍ.
- **ملاحظة الصلاحيات**: الترقيات تُدار من شئون الضباط (`officers: edit`) وليس حصرياً أركان الحرب — لكن هذا أمر API route وليس الموديل. الموديل مستقل عن أي صلاحية.

---

## تذكير الإكمال ⚠️

عند إكمال هذا العنصر، يجب تحديث `docs/aide/progress.md`:
- المخرج 1.2 (موديل `Promotion`): 📋 → 🚧 → ✅

---

## الخطوة التالية

ابدأ **جلسة جديدة** وشغّل `/speckit.aide.execute-item` مع رقم العنصر `002` لتنفيذه.
