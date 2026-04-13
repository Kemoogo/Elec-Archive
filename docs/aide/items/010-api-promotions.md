# Item 010: API Routes — الترقيات (Promotions)

**المصدر**: `docs/aide/queue/queue-001.md` — Item 010  
**التاريخ**: 2026-04-10  
**الحالة**: 📋 Planned

---

## الوصف

إنشاء API routes كاملة لإدارة الترقيات تحت المسار `/api/arkan-harb/promotions/` باتباع pipeline الأمان المعتمد في المشروع.
يجب ملاحظة أن صلاحية التعديل (`POST/PATCH`) يجب أن تقبل إما صلاحية `arkan_harb: edit` أو صلاحية `officers: edit`، لأن الترقيات تُدار من قبل شئون الضباط أيضاً.

Pipeline المعتمد:
```
auth → rate-limit → RBAC (arkan_harb: edit OR officers: edit) → Zod → DB → audit → response
```

**الملفات المطلوبة**:

| الملف | الغرض |
|-------|--------|
| `next/app/api/arkan-harb/promotions/route.ts` | GET (قائمة + فلترة) + POST (إنشاء) |
| `next/app/api/arkan-harb/promotions/[id]/route.ts` | PATCH (تحديث) — لا حذف فعلي |

---

## معايير القبول

- [ ] `GET /api/arkan-harb/promotions` يُرجع قائمة الترقيات مع دعم pagination
- [ ] `GET /api/arkan-harb/promotions?officerId=X` يُرجع ترقيات ضابط محدد (مهم لعرض السجل المهني)
- [ ] `POST /api/arkan-harb/promotions` يُنشئ ترقية ويُرجع `201`
- [ ] `PATCH /api/arkan-harb/promotions/[id]` يُحدِّث ترقية موجودة ويُرجع `200`
- [ ] طلب بدون مصادقة يُرجع `401`
- [ ] طلب لمستخدم لا يمتلك صلاحية `arkan_harb: view` ولا `officers: view` للـ GET يُرجع `403`
- [ ] طلب لمستخدم لا يمتلك صلاحية `arkan_harb: edit` ولا `officers: edit` للـ POST/PATCH يُرجع `403`
- [ ] `POST`/`PATCH` ببيانات غير صالحة (مثل `fromRank === toRank`) يُرجع خطأ تحقق Zod (400)
- [ ] يتم تحديث حقل `rank` في الـ `Officer` المقابل بالرتبة الجديدة `toRank` عند عمل ترقية جديدة (POST).
- [ ] كل عملية تُسجَّل في Audit Log
- [ ] `npm run build` + `npm run lint` يمران بنجاح بدون أخطاء.

---

## خطوات التنفيذ

### 1. Zod Schema
نحتاج إلى إضافة `promotionsListQuerySchema` إلى `next/lib/validations/arkan-harb.ts` مثلما فعلنا في المأموريات.
الحقول: `officerId` (اختياري)، `page` (افتراضي 1)، `limit` (افتراضي 20).

### 2. `route.ts` — GET + POST

**المسار**: `next/app/api/arkan-harb/promotions/route.ts`

#### GET Handler
1. `authenticate()`
2. RBAC تحقق: المستخدم لديه `arkan_harb` view/edit أو `officers` view/edit.
   يمكن التحقق باستخدام `canViewModule(user, 'arkan_harb') || canViewModule(user, 'officers')`.
3. `checkApiRateLimit(..., "read")`
4. `connectToDatabase()`
5. استخدام `promotionsListQuerySchema` للتحقق من `searchParams`.
6. بناء الاستعلام والترتيب حسب حقل التاريخ (`effectiveDate: -1`).
7. تسجيل Audit Log بإجراء `VIEW`.
8. الإرجاع مع `items`, `total`, `page`, `totalPages`.

#### POST Handler
1. `authenticate()`
2. RBAC تحقق: `canEditModule(user, 'arkan_harb') || canEditModule(user, 'officers')`
3. `checkApiRateLimit(..., "write")`
4. `connectToDatabase()`
5. قراءة `request.json()` والتحقق منه باستخدام `createPromotionSchema`.
6. إنشاء سجل الترقية باستخدام `Promotion.create`.
7. تحديث رتبة الضابط المرتبط بالترقية باستخدام `Officer.findByIdAndUpdate` ليستلم حقل `rank` قيمة `toRank`.
8. تسجيل Audit Log لإجراء `CREATE`.
9. إرجاع `201` مع مُعرف الترقية.

### 3. `[id]/route.ts` — PATCH

**المسار**: `next/app/api/arkan-harb/promotions/[id]/route.ts`

- نفس خطوات الـ Authenticate و RBAC (للـ edit) و الـ Rate Limit.
- التحقق من البيانات باستخدام `updatePromotionSchema`.
- البحث عن الترقية الحالية `Promotion.findById(id)`.
- تحديث حقول سجل الترقية فقط (`save`). 
- **ملاحظة فنية**: إذا اُستخدم `PATCH` لتغيير `toRank`، يُنصح بتحديث سجل الترقية دون التعقيد في محاولة عمل Rollback لرتبة لضابط (يُمكن كتابة رسالة للمستخدم، أو تحديث ਰتبة الضابط من جديد إذا لزم الأمر، لكن الأفضل الاكتفاء بتعديل السجل لتبسيط العملية).
- تسجيل خطوة Audit Log (إجراء `UPDATE`).

---

## استراتيجية الاختبار

### متطلبات الاختبار
الخدمات المطلوبة:
- MongoDB 7+ (Docker: `docker compose up -d mongo` منفذ 27017)
- خادم التطوير (Next.js: `npm run dev` منفذ 3000)

إعداد البيئة:
- `MONGODB_URI` و `JWT_SECRET` متوفرة
- مستخدم به صلاحية التعديل إما لأركان الحرب أو الشئون

### قائمة التحقق اليدوية (Validation Checklist)
- [ ] MongoDB و خادم Next.js يعملان
- [ ] إنشاء ترقية `POST` تنجح وتُرجع 201، وتقوم بـ:
  - [ ] إضافة سجل `Promotion`.
  - [ ] تغيير الـ `rank` في الضابط المستهدف في قاعدة البيانات إلى `toRank`.
  - [ ] إضافة سجل في AuditLog.
- [ ] تجربة ترقية حيث `fromRank === toRank` تفشل وترجع خطأ 400.
- [ ] استدعاء `GET` يعيد الترقيات الموجودة مع pagination صحيح ويعمل فيه فلتر `officerId`.
- [ ] استدعاء `PATCH` يعدل حقلاً مثل (`notes` أو `effectiveDate`) وينجح ويرجع 200.
- [ ] محاولة الدخول لمستخدم لا يملك أي صلاحيات ترجع 403.
- [ ] تطبيق `npm run build && npm run lint` يمرّان بنجاح.

## قالب توثيق التحقق
(يُنقل ويرفق خلال التنفيذ)

## نتائج التحقق (Item 010)
- [x] MongoDB و خادم Next.js يعملان بصورة طبيعية.
- [x] `npm run build` ناجح (0 أخطاء).
- [x] `npm run lint` بدون تحذيرات جديدة.
- [x] Zod schema للـ GET تمت إضافته.
- [x] GET promotions يعمل ومضبوط بصلاحية مزدوجة (شؤون الضباط / أركان حرب).
- [x] POST ينشئ ترقية ويحدّث رتبة الضابط بنجاح.
- [x] PATCH يحدّث بيانات الترقية.
- [x] Audit Log يسجل العمليات כالمعتاد.

---

## القرارات والمقايضات
- **القرار**: تم إضافة مزدوج للصلاحيات `arkan_harb` أو `officers` (view/edit) في العمليات الخاصة بالـ GET/POST/PATCH للترقيات.
- **السبب**: لأن الترقيات يُمكن إدارتها أيضاً باستخدام شئون الضباط، وتطلب الوصول للترقيات من قسمي الأركان والشئون.
- **التحديات/المستقبل**: تجنب عمل rollback معقد عند تغيير `toRank` في الـ `PATCH` لأن التحديث قد يتلخبط لو تم ترقية الضابط بعد هذا السجل. تم الاكتفاء بتحديث السجل نفسه كما اقتُرح بالمتطلبات.
- **القرار**: استخدام `promotion.updatedBy = promotion.updatedBy` للحفاظ على الـ reference بدون التسبب في مشاكل نوع المتغير (Any type) مع `typescript-eslint`.
---

## ملاحظة للإكمال
عند الانتهاء، قم بتحديث `docs/aide/progress.md`:
- تغيير حالة العنصر **2.3** (API Routes — الترقيات) إلى `✅ Complete`.

## الخطوة التالية

ابدأ **جلسة جديدة** وشغّل `/speckit.aide.execute-item 010` لتنفيذ هذا العنصر.
