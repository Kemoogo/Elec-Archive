## Merged Features Log

### 005-officers-affairs — 2026-04-10
**Branch:** 005-officers-affairs
**Spec:** specs/005-officers-affairs

**What was added:**
- US1: إدارة قائمة الضباط مع البحث والفلترة.
- US2: عرض السجل الكامل للضابط والمستندات (PDF فقط).
- US3: تسجيل التمام اليومي وإرساله وتخزينه محلياً وصنع مُذكِّر الساعة 09:00.
- US4: متابعة القائد للتمام اليومي بحالة القراءة فقط.
- US5: إدارة الإجازات والغيابات لمنع تضارب الفترات.
- US6: إدارة التكليفات والترقيات والمأموريات.

**New Components & Refactoring (Post-Implementation):**
- Next.js SSR Dashboard pages (`/officers`, `/[id]`, `/rollcall`, `/leaves`)
- Backend robust APIs (`/api/officers/...`)
- Daily Rollcall Worker Service (`docker-compose.yml`, `reminders.ts`)
- **[تعديل لاحق]** تم استخراج نماذج (Modals) متخصصة ومنفصلة عن الجدول (الترقية `OfficerPromoteModal`، النقل `OfficerTransferModal`، والإجازات `LeaveAddModal`) لتوحيد التصميم مع نظام CodeGeex.
- **[تعديل لاحق]** تم تحسين واجهة المستخدم للجدول بجعل الصف بأكمله قابلاً للنقر (Row Click) للوصول للتفاصيل بدلاً من أيقونة العين وحذفها لمنع طفح الشاشة (Horizontal Overflow).
- **[تعديل لاحق]** تم استبدال مكتبة الإشعارات `sonner` بـ `useToast` المحلي، وإضافة زر `ScrollToTop` ليكون متاحاً عالمياً بالـ Layout.

**Tasks Completed:** 56/56 tasks

### 006-medical-point — 2026-04-20
**Branch:** 006-medical-point
**Spec:** specs/006-medical-point

**What was added:**
- وحدة النقطة الطبية كاملة تشمل تسجيل الزيارات وصرف الأدوية.
- نظام إدارة المخزون الدوائي مع تنبيهات الصلاحية والكمية المنخفضة.
- لوحة تحكم إحصائية للزيارات والمخزون.

**New Components:**
- `MedicalDashboard`, `VisitsTable`, `MedicineInventory`, `MedicineForm`.
- **Models:** `Patient`, `Medicine`.

**Tasks Completed:** 35/35 tasks

### 007-student-affairs — 2026-04-20
**Branch:** 007-student-affairs
**Spec:** specs/007-student-affairs

**What was added:**
- وحدة شئون الطلبة كاملة لإدارة بيانات الطلاب ومستنداتهم.
- نظام الحذف الناعم (Soft-delete) للمحافظة على سجلات الطلاب.
- تكامل مع نظام رفع الملفات (PDF وصور) بحد أقصى 10MB.

**New Components:**
- `StudentTable`, `StudentProfile`, `StudentForm`, `DocumentUpload`.
- **Models:** `Student`.

**Tasks Completed:** 32/32 tasks

### 008-education — 2026-04-20
**Branch:** 008-education
**Spec:** specs/008-education

**What was added:**
- وحدة التعليم والدورات التدريبية لإدارة البرامج والمشاركين.
- نظام كتالوج الدورات (Cards) مع تصنيفات الحالة (قادمة/جارية/منتهية).
- إدارة مشاركي الدورات (ضباط وطلبة) مع التحقق من عدم التكرار.

**New Components:**
- `CourseCard`, `CourseCatalog`, `CourseDetail`, `EnrollmentModal`.
- **Models:** `Course`.

**Tasks Completed:** 45/45 tasks

### 009-arkan-harb — 2026-04-20
**Branch:** 009-arkan-harb
**Spec:** docs/aide/vision.md

**What was added:**
- وحدة أركان الحرب كاملة (تمام، إجازات، مأموريات، تعيينات وظيفية).
- إعادة هيكلة صفحة الضابط بنظام التبويبات (Tabs) والجدول الزمني المهني.
- ترحيل البيانات القديمة من موديل `Assignment` إلى الموديلات الجديدة المتخصصة.
- نظام التعيين الوظيفي (أساسي وبديل) مع تتبع تاريخي.

**New Components:**
- `ArkanHarbDashboard`, `MissionsTable`, `PositionAssignmentForm`, `OfficerDetailTabs`, `CareerTimeline`.
- **Models:** `Mission`, `Promotion`, `PositionAssignment`.

**Tasks Completed:** 43/43 tasks (via speckit-aide)
