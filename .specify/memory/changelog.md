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
