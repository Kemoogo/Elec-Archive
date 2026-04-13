# Work Item 017: صفحة التعيينات الوظيفية (Position Assignments Page)

## الوصف (Description)
بناء واجهة المستخدم لإدارة التعيينات الوظيفية للضباط ضمن مديول أركان Harb. يتضمن ذلك جدولاً لعرض وتصفية العمل، ونموذجاً (Form) لإضافة أو تعديل التعيينات.

## معايير القبول (Acceptance Criteria)
- [ ] إنشاء صفحة `next/app/(dashboard)/arkan-harb/positions/page.tsx` تتبع نظام التصميم (Design System).
- [ ] تنفيذ مكون `PositionAssignmentTable.tsx`:
    - [ ] يعرض المسمى الوظيفي، اسم الضابط، النوع (أساسي/بديل)، تاريخ البداية، والحالة.
    - [ ] إمكانية البحث باسم الضابط أو المسمى الوظيفي.
    - [ ] إمكانية التصفية (Filtering) حسب الحالة (نشط/منتهي) والنوع (أساسي/بديل).
    - [ ] دعم كامل للغة العربية واتجاه RTL.
- [ ] تنفيذ مكون `PositionAssignmentForm.tsx` (يُستخدم داخل Modal):
    - [ ] حقول لـ: اسم الضابط، المسمى الوظيفي، النوع، الضابط الأصلي (في حالة البديل)، تاريخ البداية، تاريخ الانتهاء، رقم الأمر، والملاحظات.
    - [ ] التحقق من البيانات (Validation) باستخدام `createPositionAssignmentSchema`.
    - [ ] قائمة منسدلة لاختيار الضباط من قاعدة البيانات.
- [ ] التكامل مع الـ API:
    - [ ] `GET /api/arkan-harb/positions` للعرض.
    - [ ] `POST /api/arkan-harb/positions` للإنشاء.
    - [ ] `PATCH /api/arkan-harb/positions/[id]` للتحديث.
    - [ ] `DELETE /api/arkan-harb/positions/[id]` للحذف.
- [ ] تمييز مرئي للتعيين من نوع "بديل" (مثال: شارة/Badge خاصة).
- [ ] عرض اسم الضابط الأصلي في حالة كان التعيين "بديل".

## خطوات التنفيذ (Implementation Steps)
1. إنشاء `next/app/(dashboard)/arkan-harb/positions/page.tsx` كصفحة SSR.
2. إنشاء `next/components/arkan-harb/PositionAssignmentTable.tsx` لعرض البيانات.
3. إنشاء `next/components/arkan-harb/PositionAssignmentForm.tsx` للتعامل مع الإدخال.
4. إعداد البحث والترقيم (Pagination) في الجدول.
5. ربط زر "أطافة تعيين جديد" بالنموذج داخل Modal من `shadcn/ui`.
6. التأكد من تعريب كافة المصطلحات وتنسيق التواريخ بشكل مناسب.
7. التحقق من صلاحيات العرض والتعديل على مستوى الواجهة.

## استراتيجية الاختبار (Testing Strategy)
- التحقق اليدوي من عمل الواجهة وسلاستها.
- التأكد من أن التصفية والبحث يعملان بشكل صحيح مع الـ API.
- التأكد من أن التعيين البديل يتطلب اختيار ضابط أصلي (Original Officer).
- التأكد من أن تحديث التعيين ينعكس فوراً في الجدول.

## التبعات (Dependencies)
- مسارات الـ API التي تم إنشاؤها في Item 011.
- مخططات Zod في `next/lib/validations/arkan-harb.ts`.
- موديل الضباط (`Officer`) والـ API الخاص بقائمة الضباط لاستخدامه في الاختيار.

## سجل القرارات والمقايضات (Decisions & Trade-offs)
- **Select Dropdowns:** To allow easy relation linkage, all `active` officers are fetched efficiently on the server side (`page.tsx`) using lean Mongoose projections, and passed down to the components. This avoids multiple clients-side network requests.
- **Form Component:** Uses standard HTML5 validations aligned with the backend `zod` schemas. We use `React.useState` based form control with direct API patches to maintain the simplicity seen in the existing UI codebase.
- **UI Components:** Replaced `accessor: null` with `accessor: undefined` to adhere to exact table type limits. We also created `Button.tsx` inside `ui` since relying on importing non-existent `components/ui/button` was causing build errors across the app.
- **MainTable Indexing:** We deferred to `showSerialNumber={true}` of the shared `MainTable` instead of trying to manually render an `م` column, cleaning up the code nicely.

## تذكير بالإكمال (Completion Reminder)
يجب تحديث `docs/aide/progress.md` (📋 ← 🚧 ← ✅) عند اكتمال هذا البند.

## متطلبات الاختبار (Testing Prerequisites)

**الخدمات المطلوبة**
- MongoDB 7 (Docker: `docker-compose up -d mongo`, المنفذ: 27017)

**إعدادات البيئة**
- `DATABASE_URL` يشير إلى نسخة MongoDB النشطة.
- جلسة مصادقة صالحة بصلاحية `arkan_harb: edit` (أو `admin`).

**قائمة التحقق من التحقق اليدوي**
- [ ] نجاح البناء: `npm run build`
- [ ] الخدمات مفعلة: `docker-compose up -d mongo`
- [ ] التطبيق يعمل: `npm run dev`
- [ ] الميزة محققة:
    - الانتقال إلى `/arkan-harb/positions`.
    - إنشاء تعيين "أساسي" لضابط.
    - إنشاء تعيين "بديل" لضابط آخر (مع اختيار الضابط الأول كـ "بديل عنه").
    - تصفية الجدول حسب "بديل" والتأكد من ظهور السجل الصحيح.
    - تغيير الحالة إلى "منتهي" والتأكد من اختفائه عند تصفية السجلات "النشطة".
- [ ] البيانات محققة: فحص مجموعة `positionassignments` في قاعدة البيانات.

## نتائج التحقق (Validation Results Template)
- [ ] Service started: MongoDB
- [ ] Application started successfully
- [ ] Database tables verified: `positionassignments`
- [ ] Seed data verified: N/A
- [ ] API endpoints verified: `/api/arkan-harb/positions`
- [ ] Screenshots captured: [UI check]
