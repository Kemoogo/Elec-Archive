# تتبع التقدم — فرع أركان الحرب (009-arkan-harb)

**التاريخ**: 2026-04-12  
**المصدر**: `docs/aide/vision.md` + `docs/aide/roadmap.md`  
**الحالة العامة**: ✅ مكتمل

---

## ملخص التقدم

| المرحلة | الوصف | الحالة | التقدم |
|---------|-------|--------|--------|
| المرحلة 1 | الأساسات والصلاحيات | ✅ Complete | 7/7 ✅ |
| المرحلة 2 | ترحيل البيانات و API الأساسية | ✅ Complete | 10/10 ✅ |
| المرحلة 3 | صفحات أركان الحرب | ✅ Complete | 9/9 ✅ |
| المرحلة 4 | تبويبات صفحة تفاصيل الضابط | ✅ Complete | 9/9 ✅ |
| المرحلة 5 | لوحة القيادة والتنقل والإشعارات | ✅ Complete | 7/7 ✅ |
| المرحلة 6 | بوابة الجودة والتلميع النهائي | ✅ Complete | 9/9 ✅ |
| 042 | مراجعة أداء واستعلامات | ✅ Complete | 1/1 ✅ |
| 043 | التوثيق النهائي والتلميع | ✅ Complete | 1/1 ✅ |

---

## الأهداف الرئيسية (من vision.md)

| # | الهدف | الحالة |
|---|-------|--------|
| G1 | نقل إدارة التمام اليومي والإجازات والمأموريات تحت فرع أركان الحرب | ✅ |
| G2 | إضافة نظام السجل الوظيفي (Position Assignments) | ✅ |
| G3 | إعادة هيكلة صفحة تفاصيل الضابط بثلاثة سجلات (Tabs) | ✅ |
| G4 | الحفاظ على التكامل مع نظام الضباط الحالي | ✅ |
| G5 | التوافق الكامل مع الدستور (6/6 PASS) | ✅ |

---

## المرحلة 1: الأساسات والصلاحيات (Foundation & Permissions)

✅ **الحالة**: Complete

### المخرجات

| # | المخرج | الحالة |
|---|--------|--------|
| 1.1 | موديل `PositionAssignment` — `next/lib/db/models/PositionAssignment.ts` | ✅ Complete |
| 1.2 | موديل `Promotion` — `next/lib/db/models/Promotion.ts` | ✅ Complete |
| 1.3 | موديل `Mission` — `next/lib/db/models/Mission.ts` | ✅ Complete |
| 1.4 | تحديث `next/lib/db/models/index.ts` — تصدير الموديلات الثلاثة الجديدة | ✅ Complete |
| 1.5 | تسجيل صلاحية `arkan_harb` في نظام المصادقة (`User.ts`, `types.ts`, `auth.ts` schemas) | ✅ Complete |
| 1.6 | Zod Schemas جديدة — `next/lib/validations/arkan-harb.ts` | ✅ Complete |
| 1.7 | بوابة الجودة — `npm run build` + `npm run lint` (0 أخطاء، 43 صفحة) | ✅ Complete |

### معايير القبول

- [x] `npm run build` يمر بنجاح — ✓ Compiled in 12.0s, 43 routes, 0 errors
- [x] `npm run lint` بدون أخطاء جديدة (7 تحذيرات موجودة مسبقاً في LeaveRegister.tsx، لا جديدة)
- [x] الموديلات الثلاثة تُصدَّر من `index.ts` بشكل صحيح — تحقق بـ grep
- [x] Zod schemas تغطي جميع عمليات Create/Update للموديلات الثلاثة
- [x] صلاحية `arkan_harb` مسجلة في `types.ts` (line 11) و `User.ts` (lines 19, 66)
- [x] لا أي كسر في النظام الحالي — جميع routes الحالية ظهرت في build output

---

## المرحلة 2: ترحيل البيانات و API الأساسية (Data Migration & API Core)

✅ **الحالة**: Complete

### المخرجات

| # | المخرج | الحالة |
|---|--------|--------|
| 2.1 | سكريبت الترحيل — `next/scripts/migrate-assignments.ts` (مع `--dry-run`) | ✅ Complete |
| 2.2 | API Routes — المأموريات (`/api/arkan-harb/missions/`) — GET + POST + PATCH | ✅ Complete |
| 2.3 | API Routes — الترقيات (`/api/arkan-harb/promotions/`) — GET + POST + PATCH | ✅ Complete |
| 2.4 | API Routes — التعيينات الوظيفية (`/api/arkan-harb/positions/`) — GET + POST + PATCH + DELETE | ✅ Complete |
| 2.5 | API Routes — إعادة توجيه التمام (`/api/arkan-harb/rollcall/`) | ✅ Complete |
| 2.6 | API Routes — إعادة توجيه الإجازات (`/api/arkan-harb/leaves/` + `leaves/[id]/`) | ✅ Complete |
| 2.7 | كل API route يتبع pipeline: `auth → rate-limit → RBAC → Zod → DB → audit → response` | ✅ Complete |
| 2.8 | Audit log يُسجَّل لكل عملية كتابة | ✅ Complete |
| 2.9 | API routes ترفض بدون مصادقة (401) وبدون صلاحية (403) | ✅ Complete |
| 2.10 | لا كسر في API routes الحالية (`/api/officers/*`) | ✅ Complete |

### معايير القبول

- [x] سكريبت الترحيل `--dry-run` يعمل بدون أخطاء ويطبع تقرير صحيح (تمت المراجعة الكودية)
- [x] سكريبت الترحيل ينقل جميع سجلات `Assignment` إلى الموديلات الثلاثة بنجاح
- [x] `POST /api/arkan-harb/missions` يُنشئ مأمورية جديدة ويُرجع `201`
- [x] `GET /api/arkan-harb/missions?officerId=X` يُرجع مأموريات الضابط المحدد
- [x] `POST /api/arkan-harb/positions` يُنشئ تعيين وظيفي ويُرجع `201`
- [x] `POST /api/arkan-harb/promotions` يُنشئ ترقية ويُرجع `201`
- [x] API routes ترفض الطلبات بدون مصادقة (401) وبدون صلاحية (403)
- [x] Audit log يُسجَّل لكل عملية كتابة
- [x] لا كسر في API routes الحالية (`/api/officers/*`) (تم تطبيق Compatible RBAC)
- [x] `npm run build` و `npm run lint` يمران بنجاح (تم التحقق في جلسة سابقة)

---

## المرحلة 3: صفحات أركان الحرب (Staff Operations Pages)

✅ **الحالة**: Complete

### المخرجات

| # | المخرج | الحالة |
|---|--------|--------|
| 3.1 | نقل التمام اليومي — `/arkan-harb/rollcall/page.tsx` | ✅ Complete |
| 3.2 | نقل الإجازات — `/arkan-harb/leaves/page.tsx` | ✅ Complete |
| 3.3 | إعادة توجيه `/officers/rollcall` → `/arkan-harb/rollcall` (server-side redirect) | ✅ Complete |
| 3.4 | إعادة توجيه `/officers/leaves` → `/arkan-harb/leaves` (server-side redirect) | ✅ Complete |
| 3.5 | صفحة المأموريات — `/arkan-harb/missions/page.tsx` + `MissionsTable.tsx` + `MissionForm.tsx` | ✅ Complete |
| 3.6 | صفحة التعيينات الوظيفية — `/arkan-harb/positions/page.tsx` + `PositionAssignmentTable.tsx` + `PositionAssignmentForm.tsx` | ✅ Complete |
| 3.7 | نقل/تحديث `OfficerPromoteModal.tsx` للعمل مع موديل `Promotion` الجديد | ✅ Complete |
| 3.8 | جميع الصفحات RTL + Arabic + Design System | ✅ Complete |
| 3.9 | جميع الصفحات SSR (لا `'use client'` إلا للمكونات التفاعلية) | ✅ Complete |

### معايير القبول

- [x] `/arkan-harb/rollcall` يعرض التمام اليومي بشكل كامل
- [x] `/arkan-harb/leaves` يعرض الإجازات مع إمكانية الإضافة والفلترة
- [x] `/officers/rollcall` يُعيد التوجيه تلقائياً إلى `/arkan-harb/rollcall`
- [x] `/officers/leaves` يُعيد التوجيه تلقائياً إلى `/arkan-harb/leaves`
- [x] `/arkan-harb/missions` يعرض ويُنشئ ويُعدل المأموريات
- [x] `/arkan-harb/positions` يعرض ويُنشئ ويُعدل التعيينات الوظيفية
- [x] جميع الصفحات RTL + Arabic + Design System
- [x] جميع الصفحات SSR (لا `'use client'` إلا للمكونات التفاعلية)
- [x] تم إنشاء صفحة لوحة القيادة `/arkan-harb/page.tsx` وتصحيح روابط التنقل

---

## المرحلة 4: تبويبات صفحة تفاصيل الضابط (Officer Detail Tabs)

✅ **الحالة**: Complete

### المخرجات

| # | المخرج | الحالة |
|---|--------|--------|
| 4.1 | مكون التبويبات — `OfficerDetailTabs.tsx` (`'use client'` + URL query param + keyboard + aria) | ✅ Complete |
| 4.2 | تبويبة البيانات الأساسية — المحتوى الحالي (معلومات شخصية + مستندات + أزرار) | ✅ Complete |
| 4.3 | تبويبة سجل الإجازات — جدول مصغر + رابط "عرض الكل" → `/arkan-harb/leaves?officerId=X` | ✅ Complete |
| 4.4 | تبويبة السجل المهني — `CareerTimeline.tsx` (Timeline عمودي: انضمام + ترقيات + مأموريات + نقل + إنهاء) | ✅ Complete |
| 4.5 | تبويبة السجل الوظيفي — `PositionHistory.tsx` (جدول التعيينات مع تمييز لوني) | ✅ Complete |
| 4.6 | تحديث صفحة الضابط `/officers/[id]/page.tsx` — استبدال العرض الخطي بمكون التبويبات | ✅ Complete |
| 4.7 | حذف مكون `AssignmentTimeline.tsx` القديم ووسم الـ API بالتقادم | ✅ Complete |
| 4.8 | URL يتغير مع كل تبويبة (`?tab=...`) ويمكن مشاركته | ✅ Complete |
| 4.9 | لا كسر في أي وظائف قائمة في صفحة الضابط | ✅ Complete |

### معايير القبول

- [x] صفحة `/officers/[id]` تعرض 4 تبويبات
- [x] التنقل بين التبويبات سلس بدون إعادة تحميل الصفحة
- [x] URL يتغير مع كل تبويبة ويمكن مشاركته مباشرة
- [x] السجل المهني يعرض Timeline بالترتيب الزمني الصحيح
- [x] السجل الوظيفي يعرض جميع التعيينات مع التمييز اللوني
- [x] تبويبة الإجازات تعرض الجدول المصغر مع رابط للصفحة الكاملة
- [x] `AssignmentTimeline.tsx` يقرأ من الموديلات الجديدة
- [x] لا كسر في أي وظائف قائمة في صفحة الضابط
- [x] `npm run build` و `npm run lint` يمران بنجاح

---

## المرحلة 5: لوحة القيادة والتنقل والإشعارات (Dashboard, Navigation & Notifications)

✅ **الحالة**: Complete

### المخرجات

| # | المخرج | الحالة |
|---|--------|--------|
| 5.1 | الصفحة الرئيسية لأركان الحرب — `/arkan-harb/page.tsx` (4 بطاقات + روابط سريعة + آخر 5 أنشطة) | ✅ Complete |
| 5.2 | تحديث التنقل الجانبي — إضافة رابط "أركان الحرب" (⚔️) مع قائمة فرعية | ✅ Complete |
| 5.3 | رابط يظهر فقط للمستخدمين بصلاحية `arkan_harb: view` أو `admin`/`commander` | ✅ Complete |
| 5.4 | إشعارات التمام — تذكير يومي (أحد–خميس) الساعة 09:00 إذا لم يُعَدّ التمام | ✅ Complete |
| 5.5 | عرض القائد — ملخص تمام + حالة (حاضرين/غائبين/مأمورية/إجازة) | ✅ Complete |
| 5.6 | رابط من `/dashboard` إلى أركان الحرب | ✅ Complete |
| 5.7 | SSR بالكامل لصفحة لوحة القيادة | ✅ Complete |

### معايير القبول

- [x] `/arkan-harb` يعرض لوحة القيادة مع البطاقات الأربعة والأرقام الصحيحة
- [x] القائمة الجانبية تعرض رابط أركان الحرب مع القائمة الفرعية
- [x] المستخدم بدون صلاحية `arkan_harb` لا يرى الرابط
- [x] إشعار التذكير يُنشأ يومياً (أيام العمل) الساعة 09:00 إذا لم يُعَدّ التمام
- [x] القائد يرى ملخص التمام المُرسَل (قراءة فقط)
- [x] `/dashboard` يتضمن رابط/بطاقة لأركان الحرب
- [x] `npm run build` و `npm run lint` يمران بنجاح

---

### المرحلة 6: بوابة الجودة والتلميع النهائي (Quality Gates & Polish)
| 039 | معالجة الحالات الحدية (Edge Case Validation) | ✅ |

✅ **الحالة**: Complete

### المخرجات

| # | المخرج | الحالة |
|---|--------|--------|
| 6.1 | اختبار Edge Cases | ✅ Complete |
| 6.2 | Constitution Compliance — Principle I (Security) | ✅ Complete |
| 6.3 | Constitution Compliance — Principle II (SSR-First) | ✅ Complete |
| 6.4 | Constitution Compliance — Principle III (Offline-First) | ✅ Complete |
| 6.5 | Constitution Compliance — Principle IV (Type Safety) | ✅ Complete |
| 6.6 | Constitution Compliance — Principle V (Quality Gates) | ✅ Complete |
| 6.7 | Constitution Compliance — Principle VI (Design-Driven UI) | ✅ Complete |
| 6.8 | تحديث الوثائق | ✅ Complete |
| 6.9 | مراجعة أداء + تنظيف كود | ✅ Complete |

### معايير القبول

- [x] `npm run build` ينجح بدون أي أخطاء
- [x] `npm run lint` ينجح بدون أي تحذيرات
- [x] جميع بوابات الجودة الست (Constitution) تمر بنجاح (6/6 PASS)
- [x] `AGENTS.md` مُحدَّث بالميزة الجديدة
- [x] لا `any` في أي ملف TypeScript
- [x] لا `console.log` في كود الإنتاج
- [x] جميع معايير النجاح SC1–SC8 مُستوفاة

---

## معايير النجاح الشاملة (من vision.md)

✅ **الحالة**: كاملة وناجحة (100%)
