# رؤية فرع أركان الحرب — Staff Operations Module

**التاريخ**: 2026-04-10  
**الحالة**: معتمدة  
**كود الميزة المقترح**: `009-arkan-harb`

---

## نظرة عامة على المشروع

### ما الذي يتم بناؤه؟

إضافة فرع **"أركان حرب" (Staff Operations)** كوحدة جديدة داخل نظام الأرشيف الإلكتروني (Elec-Archive). هذا الفرع هو الذراع التنظيمي والإداري المسؤول عن متابعة الحالة اليومية للضباط ورفع التقارير للقيادة.

### لماذا؟

حالياً، وظائف التمام اليومي والإجازات والمأموريات موجودة ضمن فرع "شئون الضباط" (`005-officers-affairs`). ولكن من الناحية التنظيمية العسكرية، هذه المسؤوليات تقع تحت إشراف **فرع أركان الحرب** وليس شئون الضباط. الهدف هو:

1. **فصل المسؤوليات** بشكل يعكس الهيكل التنظيمي الفعلي للوحدة العسكرية.
2. **إضافة السجل الوظيفي** (Job Positions) كمفهوم جديد لم يكن موجوداً من قبل.
3. **إعادة تنظيم صفحة الضابط** لتعرض ثلاثة سجلات منفصلة: الإجازات، السجل المهني، والسجل الوظيفي.

---

## الأهداف والمخرجات القابلة للقياس

| # | الهدف | مقياس النجاح |
|---|-------|-------------|
| G1 | نقل إدارة التمام اليومي والإجازات والمأموريات تحت فرع أركان الحرب | الصفحات والـ API routes تعمل بشكل كامل تحت `/arkan-harb/` |
| G2 | إضافة نظام السجل الوظيفي (Position Assignments) | إمكانية تعيين ضابط على وظيفة واحدة أو أكثر مع تحديد النوع (أساسي/بديل) |
| G3 | إعادة هيكلة صفحة تفاصيل الضابط بثلاثة سجلات | عرض Tabs: سجل الإجازات، السجل المهني، السجل الوظيفي |
| G4 | الحفاظ على التكامل مع نظام الضباط الحالي | عدم كسر أي وظائف قائمة في `005-officers-affairs` |
| G5 | التوافق الكامل مع الدستور | اجتياز جميع بوابات الجودة الست |

---

## المستخدمون المستهدفون

| الدور | الاستخدام |
|-------|----------|
| **ضابط أركان الحرب** (`employee` بصلاحية `arkan_harb: edit`) | إعداد التمام اليومي، تسجيل الإجازات، إنشاء المأموريات، تعيين الوظائف |
| **القائد** (`commander`) | مراجعة التمام اليومي، الاطلاع على حالة الضباط، الموافقة على الإجازات |
| **مدير النظام** (`admin`) | صلاحيات كاملة على جميع العمليات |
| **موظف شئون الضباط** (`employee` بصلاحية `officers: view/edit`) | الاطلاع على السجلات المهنية والوظيفية من صفحة الضابط (قراءة فقط للسجل الوظيفي إذا لم يكن لديه صلاحية `arkan_harb`) |

---

## الميزات الأساسية (Core Features)

### F1: إدارة التمام اليومي (Daily Rollcall) — نقل وتحسين

**الوصف**: نقل وظائف التمام اليومي الحالية من فرع الضباط إلى فرع أركان الحرب مع الحفاظ على نفس السلوك.

**التفاصيل**:
- صفحة إعداد التمام اليومي (`/arkan-harb/rollcall`)
- حفظ المسودة محلياً (Local Storage Recovery)
- إرسال التمام للقائد مع إشعارات
- عرض ملخص التمام للقائد (قراءة فقط)
- تذكير تلقائي الساعة 09:00 (أيام العمل: الأحد-الخميس)

**القرار المعماري**: إعادة توجيه (Redirect) من `/officers/rollcall` إلى `/arkan-harb/rollcall` للحفاظ على التوافقية العكسية. الموديلات الحالية (`DailyRollcall`) تبقى كما هي بدون تغيير.

### F2: إدارة الإجازات والغيابات (Leaves & Absences) — نقل وتحسين

**الوصف**: نقل إدارة الإجازات من فرع الضباط إلى أركان الحرب.

**التفاصيل**:
- صفحة سجل الإجازات (`/arkan-harb/leaves`)
- إنشاء إجازة جديدة (LeaveAddModal) مع اختيار الضابط والنوع والفترة
- عرض جميع الإجازات مع فلترة بالضابط والنوع والحالة
- منع تضارب فترات الإجازات لنفس الضابط

**القرار المعماري**: إعادة توجيه من `/officers/leaves` → `/arkan-harb/leaves`. الموديل الحالي (`Leave`) يبقى بدون تعديل.

### F3: إدارة المأموريات (Missions) — فصل من Assignment + نقل

**الوصف**: فصل المأموريات من موديل `Assignment` القديم إلى موديل `Mission` مستقل، ونقل إدارتها تحت أركان الحرب.

**التفاصيل**:
- صفحة المأموريات (`/arkan-harb/missions`)
- إنشاء مأمورية جديدة مع ربطها بضابط
- عرض المأموريات في صفحة الضابط ضمن السجل المهني

**موديل جديد — `Mission`** (بديل عن `Assignment` حيث `type === "mission"`):
```
{
  officerId: ObjectId (ref: Officer)
  title: string                  // عنوان المأمورية
  description?: string
  destination?: string           // جهة المأمورية
  startDate: Date
  endDate?: Date
  status: "scheduled" | "active" | "completed" | "cancelled"
  createdBy: ObjectId (ref: User)
  updatedBy: ObjectId (ref: User)
}
```

### F3b: فصل الترقيات (Promotions) — فصل من Assignment

**الوصف**: فصل الترقيات من موديل `Assignment` القديم إلى موديل `Promotion` مستقل.

**موديل جديد — `Promotion`** (بديل عن `Assignment` حيث `type === "promotion"`):
```
{
  officerId: ObjectId (ref: Officer)
  fromRank: OfficerRank          // الرتبة السابقة
  toRank: OfficerRank            // الرتبة الجديدة
  effectiveDate: Date            // تاريخ سريان الترقية
  orderNumber?: string           // رقم الأمر الإداري
  notes?: string
  createdBy: ObjectId (ref: User)
}
```

**ملاحظة**: الترقيات تُدار من فرع شئون الضباط (وليس أركان الحرب)، لكن تُعرض في السجل المهني.

### F3c: Migration Script — ترحيل بيانات Assignment

**الوصف**: سكريبت ترحيل لنقل البيانات من موديل `Assignment` القديم إلى الموديلات الثلاثة الجديدة.

**خطوات الترحيل**:
1. قراءة جميع سجلات `Assignment`
2. `type === "promotion"` → إنشاء سجل في `Promotion`
3. `type === "mission"` → إنشاء سجل في `Mission`
4. `type === "assignment"` → إنشاء سجل في `PositionAssignment` (كوظيفة أساسية)
5. الاحتفاظ بـ `Assignment` القديم كنسخة احتياطية (لا يُحذف)
6. تحديث جميع المكونات لقراءة الموديلات الجديدة

### F4: السجل الوظيفي (Position Assignments) — جديد بالكامل

**الوصف**: نظام جديد لتتبع الوظائف والتعيينات الوظيفية للضابط عبر الزمن.

**المفاهيم الأساسية**:
- **الوظيفة** (Position): وصف وظيفي مرتبط بضابط معين (مثلاً: "مدير إدارة الإشارة"، "قائد سرية أ").
- **نوع التعيين**:
  - `primary` — أساسي: الوظيفة المعيَّن عليها رسمياً
  - `substitute` — بديل: يعمل كبديل لضابط آخر مؤقتاً
- **تعدد الوظائف**: يمكن للضابط أن يكون معيَّناً على **أكثر من وظيفة** في نفس الوقت (أساسية + بديل مثلاً)
- **التاريخ الزمني**: كل تعيين له تاريخ بداية ونهاية (اختيارية)، مما يُشكّل سجلاً تاريخياً كاملاً

**موديل جديد — `PositionAssignment`**:
```
{
  officerId: ObjectId (ref: Officer)
  positionTitle: string          // مسمى الوظيفة
  positionType: "primary" | "substitute"
  substituteForOfficerId?: ObjectId  // في حالة البديل: مَن يُبدَل
  startDate: Date
  endDate?: Date                 // null = لا يزال في الوظيفة
  orderNumber?: string           // رقم الأمر الإداري (اختياري)
  notes?: string
  status: "active" | "ended"
  createdBy: ObjectId (ref: User)
}
```

**صفحات ومكونات**:
- صفحة إدارة التعيينات الوظيفية (`/arkan-harb/positions`)
- عرض في صفحة الضابط ضمن تبويبة "السجل الوظيفي"

### F5: السجل المهني في صفحة الضابط (Career Record Tab) — جديد

**الوصف**: تبويبة جديدة في صفحة تفاصيل الضابط تعرض المسار المهني بشكل Timeline.

**العناصر المعروضة** (مرتبة زمنياً):
- 📅 **الانضمام للوحدة** — من `officer.joinDate`
- ⬆️ **الترقيات** — من موديل `Promotion` الجديد
- 🔀 **النقل من الوحدة** — من `officer.employmentStatus === "inactive"` 
- 🏁 **إنهاء الخدمة** — من `officer.employmentStatus === "retired"`

**القرار المعماري**: هذه التبويبة هي عرض مُجمَّع (Aggregated View) للبيانات الموجودة فعلاً. لا تحتاج موديل جديد. تُقرأ من `Officer` + `Promotion`.

### F6: السجل الوظيفي في صفحة الضابط (Positions Tab) — جديد

**الوصف**: تبويبة جديدة في صفحة تفاصيل الضابط تعرض جميع الوظائف التي شغلها أو يشغلها.

**العرض**:
- جدول/Timeline يعرض كل تعيين وظيفي
- تمييز الوظائف الأساسية عن وظائف البديل بلون مختلف
- عرض حالة التعيين (نشط/منتهي)
- اسم الضابط المُبدَل (في حالة البديل)
- التاريخ والأمر الإداري

### F7: إعادة هيكلة صفحة تفاصيل الضابط (Officer Detail Tabs)

**الوصف**: تحويل صفحة تفاصيل الضابط الحالية من عرض خطي (Linear) إلى عرض بتبويبات (Tabs).

**التبويبات**:
1. **البيانات الأساسية** — العرض الحالي (المعلومات الشخصية + المستندات)
2. **سجل الإجازات** — الجدول الحالي للإجازات (مع رابط كامل لـ `/arkan-harb/leaves`)
3. **السجل المهني** — Timeline الانضمام والترقيات والنقل (من `Promotion`)
4. **السجل الوظيفي** — جدول الوظائف من `PositionAssignment`

---

## الهندسة المعمارية (Technical Architecture)

### التقنيات المستخدمة (بلا تغيير عن المشروع)

| الطبقة | التقنية |
|--------|---------|
| Frontend + Backend | Next.js 16 (App Router, React 19) |
| Database | MongoDB 7 via Mongoose 9.x |
| Styling | Tailwind CSS 4 + shadcn/ui |
| Validation | Zod 4 |
| Auth | JWT HttpOnly + RBAC |
| Language | TypeScript 5.x (strict mode, `any` ممنوع) |

### هيكلة الملفات المقترحة

```text
next/
├── app/
│   ├── (dashboard)/
│   │   └── arkan-harb/                   # صفحات أركان الحرب
│   │       ├── page.tsx                  # الصفحة الرئيسية (Dashboard)
│   │       ├── rollcall/
│   │       │   └── page.tsx              # التمام اليومي (نُقل من officers)
│   │       ├── leaves/
│   │       │   └── page.tsx              # الإجازات (نُقل من officers)
│   │       ├── missions/
│   │       │   └── page.tsx              # المأموريات
│   │       └── positions/
│   │           └── page.tsx              # التعيينات الوظيفية (جديد)
│   └── api/
│       └── arkan-harb/
│           ├── rollcall/route.ts         # (redirect أو نسخ من officers)
│           ├── leaves/route.ts           # (redirect أو نسخ من officers)
│           ├── leaves/[id]/route.ts
│           ├── missions/route.ts         # GET list, POST create
│           ├── missions/[id]/route.ts    # PATCH update
│           ├── promotions/route.ts       # GET list, POST create
│           ├── promotions/[id]/route.ts  # PATCH update
│           ├── positions/route.ts        # GET list, POST create
│           └── positions/[id]/route.ts   # PATCH update, DELETE
├── components/
│   ├── arkan-harb/
│   │   ├── RollcallSheet.tsx             # (نُقل أو يُشارك مع officers)
│   │   ├── StaffOpsLeaveRegister.tsx
│   │   ├── MissionsTable.tsx
│   │   ├── PromotionForm.tsx             # نموذج ترقية (جديد)
│   │   ├── PositionAssignmentForm.tsx    # نموذج تعيين وظيفة (جديد)
│   │   └── PositionAssignmentTable.tsx   # جدول التعيينات الوظيفية (جديد)
│   └── officers/
│       ├── OfficerDetailTabs.tsx          # مكون التبويبات الجديد
│       ├── CareerTimeline.tsx             # السجل المهني (Timeline)
│       └── PositionHistory.tsx            # السجل الوظيفي (Table)
├── lib/
│   ├── db/models/
│   │   ├── PositionAssignment.ts         # موديل جديد — الوظائف
│   │   ├── Promotion.ts                  # موديل جديد — الترقيات (بديل Assignment type=promotion)
│   │   └── Mission.ts                    # موديل جديد — المأموريات (بديل Assignment type=mission)
│   ├── arkan-harb/
│   │   ├── access.ts                     # صلاحيات أركان الحرب
│   │   └── queries.ts                    # استعلامات مشتركة
│   └── validations/
│       └── arkan-harb.ts                 # Zod schemas جديدة
├── scripts/
│   └── migrate-assignments.ts            # سكريبت ترحيل بيانات Assignment → 3 موديلات
```

### تعديلات على النظام الحالي

| الملف | التعديل |
|-------|---------|
| `User.ts` (permissions) | إضافة `arkan_harb: ModulePermission` |
| `validations/auth.ts` | إضافة `arkan_harb` للـ `permissionsSchema` |
| `lib/auth/types.ts` | إضافة `arkan_harb` للـ `ModulePermissions` |
| `lib/auth/authorization.ts` | يعمل تلقائياً — لا تعديل مطلوب |
| `officers/[id]/page.tsx` | استبدال العرض الخطي بمكون التبويبات |
| `components/officers/AssignmentTimeline.tsx` | استبدال بقراءة `Promotion` + `Mission` بدل `Assignment` |
| `(dashboard)/layout.tsx` | إضافة navigation link لأركان الحرب |
| `AGENTS.md` | إضافة `arkan_harb` في Active Technologies |
| `Assignment.ts` | يُبقى كنسخة احتياطية — لا يُحذف حتى اكتمال الترحيل |

### إعادة التوجيه (Backwards Compatibility)

| المسار القديم | التوجيه الجديد |
|-------------|--------------|
| `/officers/rollcall` | → `/arkan-harb/rollcall` |
| `/officers/leaves` | → `/arkan-harb/leaves` |

---

## المتطلبات غير الوظيفية

### الأمان (Principle I)
- جميع الـ API routes تتبع: `auth → rate-limit → RBAC → Zod → DB → audit → response`
- صلاحية `arkan_harb` مطلوبة للوصول لصفحات أركان الحرب
- القائد يرى التمام (قراءة فقط)

### SSR-First (Principle II)
- جميع الصفحات الرئيسية SSR
- التبويبات (Tabs) في صفحة الضابط: `'use client'` leaf component
- النماذج (Modals): `'use client'` leaf components

### Offline-First (Principle III)
- لا تبعيات خارجية
- استمرار حفظ مسودة التمام في Local Storage

### Type Safety (Principle IV)
- TypeScript strict mode بدون `any`
- Zod schemas لجميع inputs/outputs الجديدة

### Quality Gates (Principle V)
- `npm run build` بدون أخطاء
- `npm run lint` بدون تحذيرات
- Edge cases: تعيين مزدوج، تضارب وظائف، ضابط غير موجود، صلاحيات غير كافية

### Design-Driven UI (Principle VI)
- استخدام نظام التصميم الموجود (`DESIGN.md`)
- واجهة عربية RTL بالكامل
- توافق مع نمط الـ Modals والجداول الحالي

---

## القيود والافتراضات

### القيود
- **لا كسر للسلوك الحالي**: جميع وظائف فرع الضباط يجب أن تستمر في العمل
- **نفس قاعدة البيانات**: لا تغيير في بنية MongoDB أو Docker
- **نفس نظام المصادقة**: استخدام نظام JWT و RBAC الحالي مع إضافة صلاحية جديدة فقط
- **10-30 مستخدم متزامن**: نفس متطلبات الأداء الحالية

### افتراضات
- الموديلات الحالية (`DailyRollcall`, `Leave`) لا تحتاج تعديل بنيوي
- موديل `Assignment` القديم يتم **فصله بالكامل** إلى 3 موديلات: `Promotion`, `Mission`, `PositionAssignment`
- سكريبت ترحيل يُنقل البيانات الحالية من `Assignment` إلى الموديلات الجديدة
- موديل `Assignment` القديم يُبقى كنسخة احتياطية ولا يُحذف
- السجل المهني هو عرض مُجمَّع (View) يقرأ من `Officer` + `Promotion`
- السجل الوظيفي يحتاج موديل جديد `PositionAssignment`

---

## خارج النطاق (Out of Scope)

| العنصر | السبب |
|--------|-------|
| حذف صفحات الضباط القديمة | نُبقي على إعادة التوجيه فقط؛ الحذف يُقرر لاحقاً |
| نظام موافقات متسلسل للإجازات | يمكن إضافته كميزة مستقلة لاحقاً |
| تقارير PDF | يمكن إضافتها لاحقاً كميزة منفصلة |
| إدارة المناوبات (Shifts) | خارج نطاق أركان الحرب حالياً |
| ربط الوظائف بجدول تنظيمي (Org Chart) | معقد جداً؛ يُؤجل لمرحلة لاحقة |

---

## معايير النجاح

| # | المعيار | طريقة القياس |
|---|--------|-------------|
| SC1 | صفحات أركان الحرب تعمل بالكامل | تصفح `/arkan-harb/*` بدون أخطاء |
| SC2 | السجل الوظيفي يعمل | إنشاء تعيين وظيفي وعرضه في صفحة الضابط |
| SC3 | التبويبات في صفحة الضابط تعمل | التنقل بين التبويبات الأربعة بسلاسة |
| SC4 | إعادة التوجيه | `/officers/rollcall` و `/officers/leaves` يُحوَّلان تلقائياً |
| SC5 | عدم كسر الوظائف الحالية | جميع اختبارات `005-officers-affairs` تمر بنجاح |
| SC6 | ترحيل البيانات | سكريبت Migration ينقل بيانات `Assignment` بنجاح |
| SC7 | الدستور | اجتياز `Constitution Check` بالكامل (6/6 PASS) |
| SC8 | البناء | `npm run build` + `npm run lint` بدون أخطاء |

---

## الخطوة التالية

بعد مراجعة واعتماد هذه الرؤية:
1. بدء جلسة جديدة وتشغيل `/speckit.aide.create-roadmap` لإنشاء خارطة الطريق المرحلية
2. إنشاء فرع ميزة: `git checkout -b 009-arkan-harb`
3. البدء بالتنفيذ مرحلياً وفق خارطة الطريق
