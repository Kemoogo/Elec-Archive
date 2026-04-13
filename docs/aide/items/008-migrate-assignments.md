# Item 008: سكريبت ترحيل Assignment → 3 موديلات

**المصدر**: `docs/aide/queue/queue-001.md` — Item 008  
**التاريخ**: 2026-04-10  
**الحالة**: ✅ Complete

---

## الوصف

إنشاء سكريبت TypeScript قابل للتشغيل مستقلاً (`next/scripts/migrate-assignments.ts`) يقوم بقراءة جميع سجلات `Assignment` الحالية من قاعدة البيانات وتوزيعها على الموديلات الثلاثة الجديدة بحسب نوع كل سجل:

| نوع Assignment | الموديل الهدف | ملاحظات التحويل |
|----------------|---------------|-----------------|
| `"assignment"` | `PositionAssignment` | كتعيين أساسي (`positionType: "primary"`)، `positionTitle` ← `title`، `startDate` ← `effectiveDate` |
| `"mission"` | `Mission` | `startDate` ← `effectiveDate`، حقل `destination` يبقى فارغاً (غير موجود في Assignment) |
| `"promotion"` | `Promotion` | `effectiveDate` ← `effectiveDate`، يحتاج `fromRank`/`toRank` — يُستخرج من حقل `description` إن أمكن، وإلا يُسجَّل كتحذير |

السكريبت **لا يحذف** السجلات الأصلية ولا يُعدّلها. يدعم `--dry-run` للمعاينة قبل الكتابة الفعلية.

---

## معايير القبول

- [x] السكريبت يعمل بـ `--dry-run` ويطبع تقرير مفصل دون أي كتابة فعلية لقاعدة البيانات
- [x] السكريبت يُحوَّل كل `Assignment` من نوع `"assignment"` إلى `PositionAssignment` بنجاح
- [x] السكريبت يُحوَّل كل `Assignment` من نوع `"mission"` إلى `Mission` بنجاح
- [x] السكريبت يُحاول تحويل كل `Assignment` من نوع `"promotion"` إلى `Promotion` وتحذير إن تعذر
- [x] يطبع ملخصاً نهائياً: (ناجح / مُتخطى / خطأ) لكل نوع
- [x] لا يحذف أي سجل من مجموعة `assignments` (non-destructive بالكامل)
- [x] السجلات المُرحَّلة تجتاز schema validations للموديل الهدف
- [x] `npm run build` و `npm run lint` يمران بلا أخطاء بعد إضافة الملف

---

## خطوات التنفيذ

### 1. بنية الملف

```
next/scripts/migrate-assignments.ts
```

اتّبع النمط الموجود في `next/scripts/seed-admin.ts`:
- استيراد `mongoose` مباشرةً (لا `dbConnect`)
- قراءة `MONGODB_URI` من `process.env`
- الاتصال → الترحيل → قطع الاتصال
- `process.exit(1)` عند الخطأ الفادح

### 2. معالجة `--dry-run`

```typescript
const isDryRun = process.argv.includes("--dry-run");
```

في وضع `--dry-run` يُسجَّل ما كان سيُكتَب لكن لا تُستدعى `save()` أو `insertMany()`.

### 3. تحويل `"assignment"` → `PositionAssignment`

حقول المصدر → حقول الهدف:

| Assignment | PositionAssignment |
|------------|-------------------|
| `officerId` | `officerId` |
| `title` | `positionTitle` |
| `"primary"` (ثابت) | `positionType` |
| `effectiveDate` | `startDate` |
| `endDate` | `endDate` |
| `status` (`active`/`ended`) | `status` — تحويل: `scheduled`→`active`، `completed`→`ended`، `cancelled`→`ended` |
| `createdBy` | `createdBy` |
| `updatedBy` | `updatedBy` |

**ملاحظة**: `substituteForOfficerId` يُترك فارغاً (لا معلومة في النموذج القديم). يُسجَّل كتحذير في التقرير.

### 4. تحويل `"mission"` → `Mission`

حقول المصدر → حقول الهدف:

| Assignment | Mission |
|------------|---------|
| `officerId` | `officerId` |
| `title` | `title` |
| `description` | `description` |
| `effectiveDate` | `startDate` |
| `endDate` | `endDate` |
| `status` | `status` (نفس القيم: `scheduled`/`active`/`completed`/`cancelled`) |
| `createdBy` | `createdBy` |
| `updatedBy` | `updatedBy` |
| — | `destination` = `undefined` (غير متوفر في النموذج القديم) |

### 5. تحويل `"promotion"` → `Promotion`

هذا النوع هو الأصعب — النموذج القديم لا يخزن `fromRank`/`toRank` بشكل صريح. استراتيجية التعامل:

1. **محاولة استخراجها من `description`**: إذا احتوى `description` على نصوص مثل `"ملازم → نقيب"` يُحاوَل تحليلها.
2. **إذا تعذر الاستخراج**: يُتخطى السجل (`skipped`) ويُسجَّل في التقرير مع رسالة توضيحية تطلب من المستخدم إدخالها يدوياً.
3. **لا يُوقَف السكريبت** — يستمر مع السجل التالي.

خريطة `fromRank`/`toRank` تستخدم `OFFICER_RANKS` enum من `Officer.ts`.

### 6. تقرير الترحيل

يُطبع في نهاية التشغيل:

```
============ تقرير الترحيل ============
وضع: LIVE / DRY-RUN
---------------------------------------
Assignments مُقرَوءة: X
---------------------------------------
PositionAssignments مُنشأة: X (تجاوز: X، خطأ: X)
Missions مُنشأة: X (تجاوز: X، خطأ: X)
Promotions مُنشأة: X (تجاوز: X، خطأ: X)
---------------------------------------
إجمالي ناجح: X  |  تجاوز: X  |  خطأ: X
---------------------------------------
⚠️  لم يُحذف أي سجل من مجموعة assignments الأصلية
===========================================
```

### 7. كيفية تشغيل السكريبت

```bash
# معاينة (بدون كتابة)
cd next
MONGODB_URI=mongodb://localhost:27017/elec-archive npx tsx scripts/migrate-assignments.ts --dry-run

# تشغيل فعلي
cd next
MONGODB_URI=mongodb://localhost:27017/elec-archive npx tsx scripts/migrate-assignments.ts
```

---

## استراتيجية الاختبار

### اختبار وحدة (يدوي)

بما أن المشروع لا يحتوي على إطار اختبارات، يكفي التحقق من:
1. تشغيل `--dry-run` والتأكد من عدم إنشاء أي سجل جديد
2. تشغيل فعلي والتحقق عبر MongoDB (أو Mongo Compass)

### اختبار التحويل

| السيناريو | المدخل | المتوقع |
|-----------|--------|---------|
| assignment عادي | `{type:"assignment", title:"مدير", effectiveDate, status:"active"}` | PositionAssignment مُنشأ بـ `positionTitle:"مدير"`, `positionType:"primary"` |
| مأمورية | `{type:"mission", title:"خارج المنطقة", status:"completed"}` | Mission مُنشأة بـ `status:"completed"` |
| ترقية مع description | `{type:"promotion", description:"ملازم → نقيب"}` | Promotion مُنشأة أو تجاوز مع تحذير |
| ترقية بدون ranks | `{type:"promotion", description:"ترقية عادية"}` | تجاوز مع رسالة في التقرير |
| حالة status قديمة | `{status:"cancelled"}` | Mission/PositionAssignment بـ `status:"cancelled"/"ended"` حسب النوع |

---

## التبعيات

| التبعية | الملف/الموديل | الحالة |
|---------|---------------|--------|
| `Assignment` model | `next/lib/db/models/Assignment.ts` | ✅ موجود |
| `PositionAssignment` model | `next/lib/db/models/PositionAssignment.ts` | ✅ موجود |
| `Mission` model | `next/lib/db/models/Mission.ts` | ✅ موجود |
| `Promotion` model | `next/lib/db/models/Promotion.ts` | ✅ موجود |
| `OFFICER_RANKS` enum | `next/lib/db/models/Officer.ts` | ✅ موجود |
| `tsx` (runner) | مثبت بالفعل (مُستخدَم في `seed-admin.ts`) | ✅ |
| `mongoose` | مثبت | ✅ |

**لا توجد تبعيات جديدة** تحتاج إلى تثبيت.

---

## متطلبات الاختبار

### الخدمات المطلوبة

| الخدمة | الإصدار | الأمر | المنفذ |
|--------|---------|-------|-------|
| MongoDB | 7+ | `docker compose up -d mongo` | 27017 |

### إعداد البيئة

```bash
# تحقق من وجود MONGODB_URI في .env.local
cat next/.env.local | grep MONGODB_URI
```

متغيرات البيئة المطلوبة:
- `MONGODB_URI` — مثال: `mongodb://localhost:27017/elec-archive`

المنافذ المطلوبة:
- `27017` — MongoDB

### قائمة التحقق اليدوي

- [ ] MongoDB تعمل: `docker compose up -d mongo`
- [ ] `MONGODB_URI` معرَّف في البيئة
- [ ] تشغيل `--dry-run` ومراجعة التقرير: `MONGODB_URI=... npx tsx scripts/migrate-assignments.ts --dry-run`
- [ ] تأكيد عدم إنشاء سجلات في وضع `--dry-run` (عبر Compass أو mongo shell)
- [ ] تشغيل الترحيل الفعلي: `MONGODB_URI=... npx tsx scripts/migrate-assignments.ts`
- [ ] التحقق من `PositionAssignment` collection: عدد السجلات يساوي عدد assignments من نوع "assignment"
- [ ] التحقق من `Mission` collection: عدد السجلات يساوي عدد assignments من نوع "mission"
- [ ] التحقق من `Promotion` collection: عدد السجلات يساوي عدد assignments من نوع "promotion" التي نجح استخراج الرتب منها
- [ ] مجموعة `assignments` الأصلية لم تتغير (نفس العدد)
- [ ] `npm run build` يمر بنجاح
- [ ] `npm run lint` بدون أخطاء جديدة

### النتائج المتوقعة

- **قاعدة البيانات فارغة من Assignment**: التقرير يطبع 0 لجميع الأنواع وينتهي بنجاح
- **بيانات اختبارية**: كل سجل `Assignment` يُحوَّل إلى الموديل المناسب أو يُسجَّل كـ `skipped` مع سبب واضح
- **مجموعة `assignments` الأصلية**: العدد لا يتغير (non-destructive)

### قالب توثيق التحقق

```markdown
## نتائج التحقق

- [ ] MongoDB بدأت: ✅/❌
- [ ] dry-run نجح بدون كتابة: ✅/❌
- [ ] التقرير النهائي (ناجح/تجاوز/خطأ): X / X / X
- [ ] PositionAssignments أُنشئت: X سجل
- [ ] Missions أُنشئت: X سجل
- [ ] Promotions أُنشئت: X سجل (تجاوز بسبب نقص الرتب: X)
- [ ] Assignments الأصلية بقيت: ✅/❌
- [ ] npm run build: ✅/❌
- [ ] npm run lint: ✅/❌
```

---

## القرارات والمقايضات

> تم التحديث أثناء التنفيذ — 2026-04-10

### قرارات مبدئية

1. **Non-destructive بالكامل**: السكريبت لا يحذف ولا يعدّل الـ `Assignment` الأصلية — السبب: الأمان وإمكانية التراجع، إذ يمكن حذف السجلات الأصلية لاحقاً يدوياً بعد التحقق.

2. **التعامل مع ترقيات بدون Ranks**: الخيار الأسلم هو تخطي هذه السجلات (`skipped`) مع توثيق كامل بدلاً من إنشاء بيانات ناقصة أو وهمية.

3. **السكريبت مستقل (standalone)**: يستورد mongoose مباشرةً كما في `seed-admin.ts` بدلاً من `dbConnect` — السبب: السكريبتات يُشغَّل خارج بيئة Next.js.

4. **`updatedBy` للسجلات المُرحَّلة**: يُستخدم `createdBy` من السجل الأصلي لمجال `updatedBy` إن كان الحقل فارغاً في السجل الأصلي.

5. **السكيمات مضمنة في السكريبت**: بدلاً من استيراد الملفات من `lib/db/models/` مباشرةً، تم تعريف السكيمات داخل السكريبت مباشرةً لتجنّب إشكاليات import resolution خارج Next.js ولضمان التوافق مع نمط `seed-admin.ts`.

6. **تحييد status للتعيين الوظيفي**: `PositionAssignment` لا يعرف `"scheduled"`، لذلك يُخطَّط `scheduled → active` بدلاً من إسقاطه أو تخطي السجل— هذا الخيار موثق في دالة `toPositionStatus()`.

### نتائج بوابة الجودة

- `npm run build`: ✅ اجتاز بنجاح — صفر أخطاء، 43 route
- `npm run lint`: ✅ صفر أخطاء جديدة (7 تحذيرات موجودة مسبقاً في LeaveRegister.tsx)

---

## التذكير عند الإكمال

عند إتمام هذا العنصر، يجب تحديث `docs/aide/progress.md`:
- **السطر المقابل للمرحلة 2** (2.1): من `📋 Planned` إلى `✅ Complete`
- **ملخص التقدم** (المرحلة 2): من `0/10` إلى `1/10`
- تحديث حقل `الحالة العامة` إن اقتضى

---

## الخطوة التالية

ابدأ **جلسة جديدة** وشغّل `/speckit.aide.execute-item 008` لتنفيذ هذا العنصر.
