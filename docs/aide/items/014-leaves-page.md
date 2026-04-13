# Item 014: نقل سجل الإجازات (Leaves Page)

## Description
This work item focuses on creating the Leaves (سجل الإجازات) page for the Arkan Harb (Staff Operations) module at `next/app/(dashboard)/arkan-harb/leaves/page.tsx`. It involves migrating and adapting the existing `LeaveRegister.tsx` and `LeaveAddModal.tsx` components to work fully under the Arkan Harb route namespace, ensuring that filtering by officer, type, and status operates correctly, while also enforcing standard Arkan Harb permissions (`arkan_harb: view`, `arkan_harb: edit`).

## Acceptance Criteria
- [ ] The Leaves page is accessible at `/arkan-harb/leaves`.
- [ ] Only users with `arkan_harb: view` or admin/commander access can view the page.
- [ ] Users can view the leave register with filtering by officer, type, and status.
- [ ] Users with `arkan_harb: edit` can add new leaves using the `LeaveAddModal.tsx`.
- [ ] The page adheres to Server-Side Rendering (SSR) principles as much as possible, executing React Server Components with `'use client'` only on necessary interactive boundaries.
- [ ] UI maintains the project's RTL standard, styling (Tailwind CSS, shadcn/ui), and dark mode.

## Implementation Steps
1. **Create Directory & Page File**: Create `next/app/(dashboard)/arkan-harb/leaves/page.tsx`.
2. **Implement Page Logic**:
   - Verify user authentication and `arkan_harb: view` permissions on the server.
   - Fetch the necessary data (list of officers for filtering, leaves based on query parameters).
3. **Integrate Existing Components**:
   - Embed the existing `LeaveRegister` component to display the list of leaves. Update its data-fetching logic if necessary to handle the context of `arkan-harb` API endpoints.
   - Embed the `LeaveAddModal` component. Ensure that adding a leave correctly targets the new backwards-compatible or shared API routes.
4. **Wire Filtering Logic**: Map URL search parameters (like `officerId`, `type`, `status`) to database queries to filter the displayed leaves effectively.
5. **Quality Checks**: Ensure the page operates correctly regarding the `npm run build` step and has no linting errors.

## Testing Strategy
- **Permissions**: Log in with an account having `arkan_harb: view` and ensure the page loads. Log in without the permission to ensure a 403/redirect occurs. Let users with `edit` add leaves, and assert non-edit users cannot.
- **UI Functionality**: Test filtering by officer, leave type, and status through the UI fields and check if URL updates and results reflect the filter.
- **Form Submission**: Open the `LeaveAddModal`, insert valid leave data, save, and ensure it correctly creates the leave, updates the list, and triggers no browser console errors.

## Dependencies
- Item 005 (Arkan Harb Permission) for access control.
- Item 012 (API Backwards Compatibility) for the shared/backward compatible `/api/arkan-harb/leaves/` endpoint infrastructure.

## Decision Log
- **استخدام مكونات موجودة**: استخدمنا مكونات `LeaveRegister` و `LeaveAddModal` الموجودة في `/components/officers/` لتجنب تكرار الكود وضمان التوافق مع النظام الحالي.
- **تحديث مسارات API**: عدّلنا مسارات الاستدعاء في المكونات من `/api/officers/leaves` إلى `/api/arkan-harb/leaves` للاستفادة من مسارات التوافقية التي أنشأناها في العنصر 012.
- **المنح والصلاحيات**: استخدمنا دوال `canViewModule` و `canEditModule` من نظام التفويض الموحد للتحقق من صلاحيات `arkan_harb: view` و `arkan_harb: edit` بدلاً من صلاحيات الضباط القديمة.
- **التحميل من الخادم مع تفاعل العميل**: جعلنا الصفحة كمكون عميل (`use client`) بسبب استخدامنا لحالة React (`useState`, `useEffect`) ومكونات تفاعلية، مع الحفاظ على جلب البيانات من الخادم في تأثيرات الاستخدام.
- **منطق التصفية**: لم ننفذ منطق التصفية المعامل في هذه المرحلة (معاملات البحث مثل `officerId`, `type`, `status') وتركناه للتطوير المستقبلي كما هو موضح في ملاحظات التنفيذ. حاليًا، نعرض جميع الإجازات بدون تصفية.

## Completion Reminder
When this item is completed, do not forget to update the `docs/aide/progress.md` file:
Change the status of Output `3.2 | نقل الإجازات — /arkan-harb/leaves/page.tsx` from 📋 Planned to 🚧 In Progress, and then ✅ Complete once finished.

## Testing Prerequisites

**Required Services**
- MongoDB 7.x (Docker: `docker-compose up -d mongo`, Port: 27017)

**Environment Configuration**
- `DATABASE_URL` pointing to the local MongoDB instance.
- Authentication secrets established.

**Manual Validation Checklist**
- [ ] Application runs (e.g., `npm run dev`).
- [ ] Navigate to `/arkan-harb/leaves` as an authorized user.
- [ ] Observe the list of current leaves and verify that filters function as designed.
- [ ] Click the "إضافة إجازة" (Add Leave) button, complete the modal form, and verify that the newly added leave reflects in the UI immediately without requiring a manual refresh.

**Expected Outcomes**
- A functional Leaves page under the `arkan-harb` route acting smoothly with current components.

## Validation Results
- [ ] MongoDB started.
- [ ] Application started successfully.
- [ ] Page loaded at `/arkan-harb/leaves` with valid data.
- [ ] Leave added via Modal verified.
- [ ] Unauthorized access denied correctly.
