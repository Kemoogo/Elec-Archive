# عنصر العمل 003: موديل Mission

**المصدر**: `docs/aide/queue/queue-001.md` — Item 003  
**المرحلة**: المرحلة 1 — الأساسات والصلاحيات  
**التاريخ**: 2026-04-10  
**الحالة**: ✅ Complete

---

## الوصف

إنشاء ملف `next/lib/db/models/Mission.ts` يتضمن Mongoose schema للمأموريات العسكرية. هذا الموديل هو بديل عن `Assignment` حيث `type === "mission"`، ويفصل بيانات المأموريات إلى موديل مستقل مع حقول أكثر دقة (`destination` للوجهة بدلاً من الاعتماد على `description` فقط).

الموديل يتبع نفس النمط المعماري المُستخدم في الموديلات الحالية (`PositionAssignment.ts`, `Promotion.ts`, `Leave.ts`):
- استيراد من `mongoose` (`Schema`, `model`, `models`, `Document`, `Types`)
- تعريف `const` arrays + `type` aliases للقيم الثابتة (`MISSION_STATUSES`, `MissionStatus`)
- تعريف `Record<..., string>` labels عربية (`MISSION_STATUS_LABELS`)
- تعريف `interface` يمتد `Document`
- إنشاء `Schema` مع `{ timestamps: true }`
- استخدام `pre("validate")` للتحقق المعقد
- إضافة `indexes` للحقول المطلوبة
- تصدير الموديل بنمط `models.X ?? model<IX>("X", XSchema)`

---

## الحقول

| الحقل | النوع | مطلوب | ملاحظات |
|-------|-------|-------|---------|
| `officerId` | `ObjectId` (ref: `Officer`) | ✅ | الضابط المُكلف بالمأمورية |
| `title` | `string` | ✅ | عنوان/اسم المأمورية |
| `description` | `string` | ❌ | وصف تفصيلي للمأمورية |
| `destination` | `string` | ❌ | الوجهة / مكان المأمورية |
| `startDate` | `Date` | ✅ | تاريخ بداية المأمورية |
| `endDate` | `Date` | ❌ | تاريخ نهاية المأمورية (اختياري — بعض المأموريات مفتوحة) |
| `status` | `MissionStatus` | ✅ | حالة المأمورية (`scheduled` | `active` | `completed` | `cancelled`) — الافتراضي `scheduled` |
| `createdBy` | `ObjectId` (ref: `User`) | ✅ | المستخدم الذي أنشأ السجل |
| `updatedBy` | `ObjectId` (ref: `User`) | ✅ | المستخدم الذي عدّل السجل آخر مرة |
| `createdAt` | `Date` | auto | من `timestamps: true` |
| `updatedAt` | `Date` | auto | من `timestamps: true` |

---

## القيم الثابتة (Enums)

```typescript
export const MISSION_STATUSES = ["scheduled", "active", "completed", "cancelled"] as const;
export type MissionStatus = (typeof MISSION_STATUSES)[number];

export const MISSION_STATUS_LABELS: Record<MissionStatus, string> = {
  scheduled: "مجدولة",
  active: "نشطة",
  completed: "منتهية",
  cancelled: "ملغاة",
};
```

**ملاحظة**: هذه القيم مطابقة لقيم `ASSIGNMENT_STATUSES` في `Assignment.ts` — وهذا متعمد لتسهيل عملية الترحيل لاحقاً (Item 008). ال-labels العربية أيضاً مطابقة لـ `ASSIGNMENT_STATUS_LABELS`.

---

## التحقق (Validation)

### على مستوى Schema (`pre("validate")`)

1. **`endDate >= startDate`**: إذا حُدّد `endDate`، يجب أن يكون بعد أو يساوي `startDate`. رسالة الخطأ: `"تاريخ الانتهاء يجب أن يكون بعد أو يساوي تاريخ البداية"`

**ملاحظة**: هذا نفس نمط التحقق المُستخدم في `PositionAssignment.ts` و `Assignment.ts`. الحقل `endDate` اختياري لأن بعض المأموريات مفتوحة المدة.

---

## الفهارس (Indexes)

```typescript
MissionSchema.index({ officerId: 1, startDate: -1 });
MissionSchema.index({ status: 1 });
```

- **`{ officerId: 1, startDate: -1 }`** — للبحث عن مأموريات ضابط مرتبة زمنياً (الأحدث أولاً)
- **`{ status: 1 }`** — لفلترة المأموريات بالحالة (مثل "جميع المأموريات النشطة")

---

## Exported Constants & Types

```typescript
// Enums
export const MISSION_STATUSES = ["scheduled", "active", "completed", "cancelled"] as const;
export type MissionStatus = (typeof MISSION_STATUSES)[number];

// Labels
export const MISSION_STATUS_LABELS: Record<MissionStatus, string> = {
  scheduled: "مجدولة",
  active: "نشطة",
  completed: "منتهية",
  cancelled: "ملغاة",
};

// Interface
export interface IMission extends Document {
  officerId: Types.ObjectId;
  title: string;
  description?: string;
  destination?: string;
  startDate: Date;
  endDate?: Date;
  status: MissionStatus;
  createdBy: Types.ObjectId;
  updatedBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

// Model
export const Mission = models.Mission ?? model<IMission>("Mission", MissionSchema);
```

---

## معايير القبول (Acceptance Criteria)

- [ ] ملف `next/lib/db/models/Mission.ts` موجود ويتبع نمط الموديلات الحالية
- [ ] جميع الحقول المذكورة في الجدول مُعرَّفة بشكل صحيح
- [ ] `MISSION_STATUSES` معرَّف كـ `const` array مع `as const`
- [ ] `MissionStatus` type معرَّف
- [ ] `MISSION_STATUS_LABELS` معرَّف بالعربية لجميع القيم
- [ ] `IMission` interface مُعرَّف ويمتد `Document`
- [ ] `pre("validate")` يتحقق من أن `endDate >= startDate` عند وجود `endDate`
- [ ] الفهرس `{ officerId: 1, startDate: -1 }` مُضاف
- [ ] الفهرس `{ status: 1 }` مُضاف
- [ ] الموديل يُصدَّر بنمط `models.Mission ?? model<IMission>("Mission", MissionSchema)`
- [ ] `status` له قيمة افتراضية `"scheduled"`
- [ ] لا أخطاء TypeScript (`tsc --noEmit`)
- [ ] لا تحذيرات ESLint جديدة
- [ ] لا `any` في أي مكان في الملف
- [ ] لا كسر في الاستيرادات أو الموديلات الحالية

---

## خطوات التنفيذ (Implementation Steps)

### الخطوة 1: إنشاء ملف الموديل

1. أنشئ `next/lib/db/models/Mission.ts`
2. استورد من `mongoose`: `Schema`, `model`, `models`, `type Document`, `type Types`

### الخطوة 2: تعريف القيم الثابتة

1. عرّف `MISSION_STATUSES` array: `["scheduled", "active", "completed", "cancelled"] as const`
2. عرّف `MissionStatus` type
3. عرّف `MISSION_STATUS_LABELS` record بالعربية

### الخطوة 3: تعريف Interface

1. عرّف `IMission extends Document` مع جميع الحقول
2. `officerId`, `createdBy`, `updatedBy` نوعهم `Types.ObjectId`
3. `status` نوعه `MissionStatus`
4. الحقول الاختيارية (`description`, `destination`, `endDate`) مع `?`

### الخطوة 4: إنشاء Schema

1. أنشئ `MissionSchema` مع `{ timestamps: true }`
2. عرّف كل حقل:
   - `officerId`: `{ type: Schema.Types.ObjectId, ref: "Officer", required: true }`
   - `title`: `{ type: String, required: true, trim: true }`
   - `description`: `{ type: String, trim: true }`
   - `destination`: `{ type: String, trim: true }`
   - `startDate`: `{ type: Date, required: true }`
   - `endDate`: `{ type: Date }`
   - `status`: `{ type: String, required: true, enum: MISSION_STATUSES, default: "scheduled" }`
   - `createdBy`: `{ type: Schema.Types.ObjectId, ref: "User", required: true }`
   - `updatedBy`: `{ type: Schema.Types.ObjectId, ref: "User", required: true }`

### الخطوة 5: إضافة Validation

1. أضف `pre("validate")` مع التحقق:
   - إذا `this.endDate && this.endDate < this.startDate`، استخدم `this.invalidate("endDate", "تاريخ الانتهاء يجب أن يكون بعد أو يساوي تاريخ البداية")`

### الخطوة 6: إضافة Indexes

1. `{ officerId: 1, startDate: -1 }` — للبحث عن مأموريات ضابط مرتبة زمنياً
2. `{ status: 1 }` — للفلترة بالحالة

### الخطوة 7: تصدير الموديل

1. صدّر بنمط `models.Mission ?? model<IMission>("Mission", MissionSchema)`

---

## استراتيجية الاختبار (Testing Strategy)

### اختبار هيكلي (Structural)
- التحقق من أن الملف يُستورد بنجاح بدون أخطاء
- التحقق من أن جميع الـ exports موجودة (`Mission`, `IMission`, `MISSION_STATUSES`, `MissionStatus`, `MISSION_STATUS_LABELS`)
- التحقق من أن `npm run build` ينجح (لا أخطاء TypeScript جديدة)

### اختبار وظيفي (Functional — عبر MongoDB)
- إنشاء مأمورية بنجاح مع جميع الحقول المطلوبة
- التحقق من أن `status` يُعطَى القيمة الافتراضية `"scheduled"` عند عدم تحديده
- فشل الإنشاء إذا `endDate < startDate`
- فشل الإنشاء إذا `status` خارج `MISSION_STATUSES`
- فشل الإنشاء بدون `officerId` أو `title` أو `startDate`
- النجاح بدون `endDate` (مأمورية مفتوحة المدة)
- النجاح بدون `description` أو `destination` (حقول اختيارية)
- التحقق من أن `timestamps` (`createdAt`, `updatedAt`) تُملأ تلقائياً
- التحقق من أن `trim` يعمل على حقول النص

---

## الاعتمادات (Dependencies)

| الاعتماد | الوصف |
|-----------|-------|
| `mongoose` | مثبت بالفعل في المشروع |
| `Officer` model | مطلوب كـ `ref` لحقل `officerId` |
| `User` model | مطلوب كـ `ref` لحقلي `createdBy` و `updatedBy` |

لا اعتمادات خارجية جديدة مطلوبة. لا استيرادات من موديلات أخرى (بعكس `Promotion.ts` الذي يستورد من `Officer.ts`).

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
- [ ] **الملف موجود**: `next/lib/db/models/Mission.ts`
- [ ] **TypeScript بدون أخطاء**: لا أخطاء في `Mission.ts`
- [ ] **الاستيراد يعمل**: الموديل يمكن استيراده من ملف آخر بدون خطأ
- [ ] **القيم الثابتة مُصدَّرة**: `MISSION_STATUSES`, `MissionStatus`, `MISSION_STATUS_LABELS`

### النتائج المتوقعة

- ملف `next/lib/db/models/Mission.ts` موجود (~70-90 سطر)
- الموديل يُصدَّر بشكل صحيح ويمكن استيراده
- `MISSION_STATUSES` مُستخدم كـ `enum` لحقل `status`
- `MISSION_STATUS_LABELS` يحتوي labels عربية لجميع الحالات الأربع
- `npm run build` ينجح بدون أخطاء جديدة
- `npm run lint` بدون تحذيرات جديدة
- لا `any` في الملف
- لا كسر في أي موديل أو ملف آخر

---

## توثيق التحقق (Validation Documentation Template)

## نتائج التحقق — عنصر 003
- [x] الملف موجود: `next/lib/db/models/Mission.ts`
- [x] `tsc --noEmit`: لا أخطاء في `Mission.ts`
- [x] `npm run lint`: بدون تحذيرات جديدة من `Mission.ts`
- [x] الـ exports تعمل: `Mission`, `IMission`, `MISSION_STATUSES`, `MissionStatus`, `MISSION_STATUS_LABELS`
- [x] Validation: `endDate >= startDate` يعمل
- [x] Default status: `"scheduled"`
- [x] enum constraint على `status` يعمل
- [x] Indexes: `{ officerId, startDate }` و `{ status }` مُضافة
- [x] لا `any` في الملف

---

## القرارات والمفاضلات (Decisions & Trade-offs)

**القرار 1: لا استيرادات من موديلات أخرى**  
`Mission.ts` يعرّف enum الحالات بنفسه — بعكس `Promotion.ts` الذي يستورد من `Officer.ts`. المأموريات لا تشترك في أي أنواع مع موديلات أخرى، مما يجعلها مستقلة تماماً.

**القرار 2: مطابقة قيم `Assignment.ts` للحالات**  
قيم `MISSION_STATUSES` (`scheduled` | `active` | `completed` | `cancelled`) و labels العربية مطابقة لـ `ASSIGNMENT_STATUSES`. هذا يُبسّط سكريبت الترحيل في Item 008 — لا حاجة لتحويل القيم.

**القرار 3: Guard على `this.endDate` أولاً**  
التحقق `this.endDate && this.endDate < this.startDate` يضمن أن التحقق لا يُشغَّل إلا عند وجود `endDate` — لأن المأموريات المفتوحة المدة صالحة تماماً.

**القرار 4: فهرس `{ officerId: 1, startDate: -1 }` وليس `{ officerId: 1, startDate: 1 }`**  
نفس قرار `PositionAssignment.ts` — الترتيب التنازلي أكثر فائدة لأن حالات الاستخدام الأكثر شيوعاً تريد "آخر مأمورية" وليس الأولى.

---

## تعديلات خاصة بالمشروع (Project-Specific Adaptations)

- **مطابقة قيم `Assignment.ts`**: حالات المأمورية (`scheduled` | `active` | `completed` | `cancelled`) و labels العربية مطابقة تماماً لـ `ASSIGNMENT_STATUSES` و `ASSIGNMENT_STATUS_LABELS`. هذا يسهل عملية الترحيل في Item 008.
- **حقل `destination` إضافي**: غير موجود في `Assignment.ts` الأصلي — أُضيف لأن المأموريات تتطلب عادةً تحديد وجهة. يمكن ملؤه لاحقاً أثناء الترحيل إذا كانت المعلومة متوفرة في `description` الأصلي.
- **لا استيرادات من موديلات أخرى**: بعكس `Promotion.ts` (يستورد `OFFICER_RANKS`)، `Mission.ts` مستقل تماماً — يُعرّف enum خاص به.
- **`updatedBy` مطلوب**: نفس نمط `PositionAssignment.ts` و `Promotion.ts` و `Leave.ts` — حقل مطلوب للتتبع الكامل.
- **RTL/Arabic**: رسائل التحقق و labels بالعربية (نفس نمط الموديلات الحالية).
- **`endDate` اختياري**: بعض المأموريات مفتوحة المدة (مثل "مأمورية حتى إشعار آخر"). نمط مطابق لـ `PositionAssignment.ts`.
- **القيمة الافتراضية `"scheduled"`**: مطابقة لـ `Assignment.ts` — المأمورية تبدأ بحالة "مجدولة" ثم تتحول تلقائياً.

---

## تذكير الإكمال ⚠️

عند إكمال هذا العنصر، يجب تحديث `docs/aide/progress.md`:
- المخرج 1.3 (موديل `Mission`): 📋 → 🚧 → ✅

---

## الخطوة التالية

ابدأ **جلسة جديدة** وشغّل `/speckit.aide.execute-item` مع رقم العنصر `003` لتنفيذه.
