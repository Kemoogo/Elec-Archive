# Item 011: API Routes — التعيينات الوظيفية (Positions)

**المصدر**: `docs/aide/queue/queue-002.md` — Item 011  
**التاريخ**: 2026-04-10  
**الحالة**: 📋 Planned

---

## الوصف

إنشاء API routes تحت `next/app/api/arkan-harb/positions/`:
- `route.ts`: `GET` (قائمة + فلترة بـ `officerId`/`status`) + `POST` (إنشاء)
- `[id]/route.ts`: `PATCH` (تحديث) + `DELETE` (حذف)

كل route يتبع pipeline: `auth → rate-limit → RBAC (arkan_harb: edit) → Zod → DB → audit → response`. يجب إضافة تحقق (Validation) لمنع إنشاء تعيين أساسي إذا كان يوجد تعيين أساسي نشط على نفس `positionTitle` لضابط آخر (يعرض تحذيراً).

---

## معايير القبول

- [ ] `GET /api/arkan-harb/positions` يعرض قائمة التعيينات مع دعم الفلترة بـ `officerId` و `status`
- [ ] `POST /api/arkan-harb/positions` ينشئ تعيين وظيفي جديد ويُرجع `201`
- [ ] `PATCH /api/arkan-harb/positions/[id]` يُحدث تعيين وظيفي موجود
- [ ] `DELETE /api/arkan-harb/positions/[id]` يحذف تعيين وظيفي (مع التحقق من الصلاحيات)
- [ ] جميع routes تتبع pipeline الأمان: `auth → rate-limit → RBAC → Zod → DB → audit → response`
- [ ] منع إنشاء تعيين أساسي (`positionType: "primary"`) إذا كان يوجد تعيين أساسي نشط على نفس `positionTitle` لضابط آخر
- [ ] Audit log يُسجَّل لكل عملية كتابة (CREATE, UPDATE, DELETE)
- [ ] API routes ترفض الطلبات بدون مصادقة (401) وبدون صلاحية (403)
- [ ] لا كسر في API routes الحالية (`/api/officers/*`)
- [ ] `npm run build` و `npm run lint` يمران بنجاح

---

## خطوات التنفيذ

### 1. إنشاء ملف route.ts للمسار العام

إنشاء الملف: `next/app/api/arkan-harb/positions/route.ts`

#### المتطلبات:
- استيراد dependencies اللازمة (م siguiendo نفس نمط missions و promotions)
- تنفيذ دالة GET للتعامل مع طلبات القائمة والفلترة
- تنفيذ دالة POST للتعامل مع إنشاء التعيينات الجديدة
- تطبيق pipeline الأمان الكامل في كلا الدالتين

### 2. إنشاء ملف [id]/route.ts للمسار التفصيلي

إنشاء الملف: `next/app/api/arkan-harb/positions/[id]/route.ts`

#### المتطلبات:
- استيراد dependencies اللازمة
- تنفيذ دالة PATCH للتعامل مع تحديث التعيينات
- تنفيذ دالة DELETE للتعامل مع حذف التعيينات
- تطبيق pipeline الأمان الكامل في كلا الدالتين
- التحقق من وجود التعيين قبل التحديث أو الحذف

### 3. إنشاء Zod schemas للتأكد من صحة البيانات

تحديث أو إنشاء الملف: `next/lib/validations/arkan-harb.ts`

#### المتطلبات:
- إضافة `createPositionAssignmentSchema` لإنشاء التعيينات
- إضافة `updatePositionAssignmentSchema` لتحديث التعيينات
- تضمين validation للتحقق من صحة البيانات مثل `endDate >= startDate`
- تضمين validation خاصة لمنع التعيينات الأساسية المتضاربة

### 4. تنفيذ منطق التحقق من التعيينات الأساسية المتضاربة

في دالة POST في route.ts:
- قبل إنشاء التعيين الجديد، فحص ما إذا كان هناك تعيين أساسي نشط (`positionType: "primary"` و `status: "active"`)
- على نفس `positionTitle` لضابط آخر
- إذا وُجد مثل هذا التعيين، إرجاع استجابة خطأ مناسبة (مثل 409 Conflict) مع رسالة توضيحية

### 5. تنفيذ Audit log لكل عملية كتابة

في الدوال POST, PATCH, DELETE:
- استدعاء `logAuditEvent` بعد كل عملية ناجحة
- تضمين معلومات مفصلة عن العملية المنفذة
- اتباع نفسpattern المستخدم في missions و promotions

### 6. اختبار وتحقق

- تشغيل `npm run build` للتأكد من عدم وجود أخطاء TypeScript
- تشغيل `npm run lint` للتأكد من عدم وجود تحذيرات ESLint جديدة
- اختبار endpoints يدوياً أو عبر أدوات مثل curl أو Postman

---

## استراتيجية الاختبار

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
- [ ] اختبار `GET /api/arkan-harb/positions` بدون filtrage
- [ ] اختبار `GET /api/arkan-harb/positions` مع filtrage بـ `officerId`
- [ ] اختبار `GET /api/arkan-harb/positions` مع filtrage بـ `status`
- [ ] اختبار `POST /api/arkan-harb/positions` لإنشاء تعيين أساسي صالح
- [ ] اختبار `POST /api/arkan-harb/positions` لإنشاء تعيين بديل صالح
- [ ] اختبار `POST /api/arkan-harb/positions` محاولة إنشاء تعيين أساسي متضارب (يجب رفضه)
- [ ] اختبار `PATCH /api/arkan-harb/positions/[id]` لتحديث تعيين موجود
- [ ] اختبار `DELETE /api/arkan-harb/positions/[id]` لحذف تعيين موجود
- [ ] التحقق من أن API routes ترفض الطلبات بدون مصادقة (401)
- [ ] التحقق من أن API routes ترفض الطلبات بدون صلاحية (403)
- [ ] التحقق من تسجيل audit log للعمليات الكتابية
- [ ] التأكد من عدم كسر API routes الحالية (`/api/officers/*`)
- [ ] `npm run build` يمر بنجاح
- [ ] `npm run lint` بدون أخطاء جديدة

### النتائج المتوقعة

- **الفلترة**: استجابة صحيحة عند تطبيق filtrage بـ `officerId` أو `status`
- **الإنشاء**: إنشاء تعيين وظيفي جديد وإرجاع `201` مع معرف التعيين
- **المنع المتضارب**: رفض محاولة إنشاء تعيين أساسي متضارب مع رسالة خطأ مناسبة
- **التحديث**: تحديث تعيين وظيفي موجود بنجاح
- **الحذف**: حذف تعيين وظيفي موجود بنجاح
- **الأمان**: رفض الطلبات غير المصادق عليها (401) والطلبات غير المصرح لها (403)
- **التدقيق**: تسجيل audit log لكل عملية كتابة ناجحة
- **البناء**: `npm run build` و `npm run lint` ללא أخطاء

---

## القرارات والمقايضات

> To be updated during implementation.

---

## التذكير عند الإكمال

عند إتمام هذا العنصر، يجب تحديث `docs/aide/progress.md`:
- **السطر correspondant للمرحلة 2** (2.4): من `📋 Planned` إلى `✅ Complete`
- **ملخص التقدم** (المرحلة 2): من `3/10` إلى `4/10`
- تحديث حقل `الحالة العامة` إن اقتضى

---

## الخطوة التالية

ابدأ **جلسة جديدة** وشغّل `/speckit.aide.execute-item 011` لتنفيذ هذا العنصر.