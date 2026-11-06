## Merged Features Log

### 010-arkan-harb-upgrade — 2026-10-19
**Branch:** 010-arkan-harb-upgrade
**Spec:** specs/010-arkan-harb-upgrade

**What was added:**
- التكامل الثنائي بين الفاكسات والمأموريات (تحويل مباشر من الفاكس الوارد لمأمورية عمل مع ربط المستند الأصلي وشارة الفاكس المرفق).
- المزامنة التلقائية للراحات الطبية والعيادة وحجز المستشفيات مع كشف التمام اليومي الميداني وقفل الحالة آلياً مع التنبيهات.
- إصدار وطباعة أوامر التحرك العسكرية وخطوط السير الرسمية A4 مع محرك فحص التعارضات الاستباقي لمنع تداخل المأموريات مع الإجازات.
- توثيق إنهاء وإغلاق المأمورية برفع مستندات إخلاء الطرف وتقارير الإنجاز (PDF/JPG/PNG).
- ربط المسمى الوظيفي للضابط ديناميكياً بجدول التسكين وإضافة تبويب متكامل لسجل المأموريات في ملف الضابط بشئون الضباط.
- منظومة جدول النوبتجيات والخدمات الشهرية للضباط مع محرك حساب عدالة التوزيع واختيار البدلاء والربط التلقائي بنوبتجي اليوم بالتمام.
- يومية الحوادث والبلاغات والعمليات الطارئة لتوثيق الإشارات والوقائع وتوجيهات القائد اللحظية.

**New Components & APIs:**
- Components: `DutyRosterTab.tsx`, `IncidentLogTab.tsx`, `TravelOrderSheet.tsx`, `TravelOrderModal.tsx`, `ConvertFaxToMissionModal.tsx`, `OfficerMissionsTab.tsx`.
- Models & Shared: `DutyRoster.ts`, `DutyRoster.shared.ts`, `IncidentLog.ts`, `IncidentLog.shared.ts`.
- Engines: `roster-engine.ts`, updates to `rollcall-engine.ts`.
- APIs: `/api/fax/[id]/convert-to-mission`, `/api/arkan-harb/missions/check-conflict`, `/api/arkan-harb/roster`, `/api/arkan-harb/incidents`.

**Tasks Completed:** 30/30 tasks implemented & verified (100%).

### 009-patient-medical-record — 2026-10-18
**Branch:** polishing
**Spec:** specs/009-patient-medical-record

**What was added:**
- سجل طبي شامل للمريض (Patient Medical Record) بصفحة موحدة تضم تبويبات: الملف الطبي (بيانات الحساسية والأمراض المزمنة)، سجل الزيارات، وتاريخ التشخيصات.
- نموذج إضافة وتعديل الحساسيات (Allergies) والأمراض المزمنة (Chronic Diseases) مع الحفظ التلقائي والتحقق من صحة المدخلات عبر Zod.
- تسجيل أحداث تدقيق النظام (Audit Logging) لكل عمليات الإنشاء والتعديل على السجل الطبي للمريض مع ربط دقيق لـ `targetId` كـ ObjectId.
- تنظيف المكونات القديمة غير المستخدمة وإصلاح نقاط النهاية وتوافق الأنواع (Type-safety) بنسبة 100%.

**New Components & APIs:**
- `PatientProfilePageClient.tsx`, `MedicalDashboard.tsx`, `RecordTab.tsx`.
- APIs: `/api/medical/patients/[patientId]/record`.
- Schemas & Types: `next/lib/validations/patient-record.ts`, `@/types/medical.ts`.

**Tasks Completed:** All tasks implemented & verified.

### 005-officers-affairs (121 PDF Extraction & UI Upgrade) — 2026-07-30
**Branch:** main
**Spec:** specs/005-officers-affairs

**What was added:**
- محرك تحليل واستخراج البيانات من وثائق "121 ش ض" الرسمية (AcroForm Engine) بقراءة حقول (اسم الضابط، رقم الأقدمية، الرقم العسكري، الرقم القومي، الدفعة، الهاتف، تاريخ الميلاد، الرتبة، السلاح، نوع الخدمة، أركان حرب، وتاريخ تحرير الملف).
- إعادة تنظيم خطوات إضافة ضابط بتوفير خيارين مباشرين في الخطوة الأولى (رفع وثيقة 121 ش ض للاستخراج الآلي الفوري أو إدخال رقم الأقدمية يدوياً).
- التحقق التلقائي والفوري من رقم الأقدمية المستخرج من الـ PDF مع توجيه الضابط الجديد لنموذج الحفظ والتوجيه التلقائي للضابط العائد لسجل العودة.
- الرفض الفوري والمنع للملفات غير المطابقة للنموذج المعتمد لـ 121 ش ض.
- استخراج وحفظ تاريخ تحرير الملف (`file121IssueDate`) تلقائياً وإظهاره بشكل أنيق أسفل كلمة "عرض الملف" في صفحة تفاصيل الضابط.
- استبدال تنبيهات الحذف والاستبدال الافتراضية بمودالات تأكيد موحدة وأنيقة (`ModalShell`) مع إظهار مودال تنبيه قبل فتح خيار اختيار الملف عند تحديث المستند.

**New Components & Refactoring:**
- `parseOfficer121PdfAction` & AcroForm PDF parser integration (`pdf-parse/lib/pdf-parse.js`).
- `OfficerForm.tsx` (Step 1 mode selection, seniority auto-check, extraction banner).
- `OfficerDocuments.tsx` (`ModalShell` delete confirmation modal & pre-selection update warning modal).

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
