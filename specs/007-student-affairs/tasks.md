# Tasks: شئون الطلبة (Student Affairs)

**Input**: Design documents from `/specs/007-student-affairs/`
**Prerequisites**: plan.md ✅, spec.md ✅, research.md ✅, data-model.md ✅, contracts/ ✅

**Tests**: Not requested — no test tasks included.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Model update, validation schemas, and upload directory — all tasks that block every user story.

- [x] T001 Add `status` enum field (active/graduated/inactive/withdrawn) and `status` index to Student model in `next/lib/db/models/Student.ts`
- [x] T002 [P] Create Zod validation schemas (CreateStudent, UpdateStudent, UploadDocument, DeleteDocument) in `next/lib/validations/student.ts`
- [x] T003 [P] Ensure upload directory exists at `public/uploads/students/`

**Checkpoint**: Model updated, schemas ready, file storage configured — API routes can now be built.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Dashboard layout with RBAC guard and shared reusable components. All API routes and pages depend on these.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [x] T004 Create Students section layout with RBAC permission check in `next/app/(dashboard)/students/layout.tsx`
- [x] T005 [P] Add Students sidebar navigation link in `next/app/(dashboard)/layout.tsx` or appropriate sidebar component
- [x] T006 [P] Create StudentList component shell with table, search bar, status filter, pagination, and add button in `next/components/students/StudentList.tsx`
- [x] T007 [P] Create StudentProfile component shell with info display, status badge, and document list section in `next/components/students/StudentProfile.tsx`
- [x] T008 [P] Create StudentForm component shell (add/edit modal with studentId, fullName, enrollDate, notes fields) in `next/components/students/StudentForm.tsx`
- [x] T009 [P] Create DocumentUpload component shell (file picker with drag-drop, name field, type/size validation) in `next/components/students/DocumentUpload.tsx`

**Checkpoint**: Layout, navigation, and all component shells are ready — user story implementation can now proceed in parallel.

---

## Phase 3: User Story 1 - Browse & Search Students (Priority: P1) 🎯 MVP

**Goal**: Employee can view a paginated list of all students, search by name/ID, and filter by status.

**Independent Test**: Navigate to `/students`, verify table renders with Student ID, Name, Enrollment Date columns. Type a search term — results filter. Toggle status filter — list updates.

### Implementation for User Story 1

- [x] T010 [US1] Implement GET list/search API endpoint with pagination, search, and status filter in `next/app/api/students/route.ts`
- [x] T011 [P] [US1] Create student list page wiring StudentList component to API in `next/app/(dashboard)/students/page.tsx`
- [x] T012 [US1] Implement default-active-status filter (FR-016: only active students shown by default) in list API and component

**Checkpoint**: Student list page is fully functional with search and status filtering. Can be tested independently.

---

## Phase 4: User Story 2 - View Student Profile (Priority: P2)

**Goal**: Employee clicks a student row to view their full profile with personal info, notes, and documents list with download.

**Independent Test**: Click any student in the list → profile page opens with correct data. Click a document → it downloads.

### Implementation for User Story 2

- [x] T013 [US2] Implement GET profile API endpoint returning full student object in `next/app/api/students/[id]/route.ts`
- [x] T014 [US2] Create student profile page wiring StudentProfile component to API in `next/app/(dashboard)/students/[id]/page.tsx`
- [x] T015 [US2] Implement document download functionality (link to fileUrl serves file) in profile page

**Checkpoint**: Profile page is fully functional with data display and document download. Can be tested independently.

---

## Phase 5: User Story 3 - Add New Student (Priority: P3)

**Goal**: Employee with edit permission can add a new student via a form/modal. Duplicate Student ID is rejected.

**Independent Test**: Click "إضافة طالب" → form opens → fill required fields → submit → student appears in list. Try duplicate ID → error shown.

### Implementation for User Story 3

- [x] T016 [US3] Implement POST create API endpoint with Zod validation and duplicate studentId check in `next/app/api/students/route.ts`
- [x] T017 [US3] Wire StudentForm create mode (show on add button click, submit to POST API, handle validation errors) in list page
- [x] T018 [US3] Add AuditLog entry on student creation in create API endpoint

**Checkpoint**: Students can be created via the form. Duplicate IDs are rejected. Audit log records creation.

---

## Phase 6: User Story 4 - Upload Documents (Priority: P4)

**Goal**: Employee can upload PDF/image documents (max 10MB) to a student's profile with a document name.

**Independent Test**: Open student profile → click "رفع مستند" → select file → submit → document appears in list. Try invalid type → error. Try >10MB → error.

### Implementation for User Story 4

- [x] T019 [US4] Implement POST document upload API endpoint with MIME/extension/size validation in `next/app/api/students/[id]/documents/route.ts`
- [x] T020 [US4] Wire DocumentUpload component to upload API in student profile page
- [x] T021 [P] [US4] Implement DELETE document removal API endpoint with filesystem cleanup in `next/app/api/students/[id]/documents/route.ts`
- [x] T022 [US4] Add document delete button and confirmation in student profile page

**Checkpoint**: Documents can be uploaded and removed. File type and size validation works. Files stored in `public/uploads/students/`.

---

## Phase 7: User Story 5 - Edit Student (Priority: P5)

**Goal**: Employee with edit permission can modify student name, enrollment date, and notes via an edit form.

**Independent Test**: Open student profile → click "تعديل" → fields become editable → change a value → save → update persists. View-only user sees no edit button.

### Implementation for User Story 5

- [x] T023 [US5] Implement PATCH update API endpoint with partial Zod validation in `next/app/api/students/[id]/route.ts`
- [x] T024 [US5] Wire StudentForm edit mode (pre-fill with current data, submit to PATCH API) in student profile page
- [x] T025 [US5] Add AuditLog entry on student update in update API endpoint

**Checkpoint**: Student information can be edited. View-only users cannot see the edit button.

---

## Phase 8: User Story 6 - Deactivate Student (Priority: P6)

**Goal**: Employee with edit permission can deactivate (soft-delete) a student. Status changes to inactive, documents removed, record preserved. Inactive students hidden by default.

**Independent Test**: Open student profile → click "إيقاف" → confirm → status changes to inactive, documents cleared. Toggle "عرض الموقفين" → inactive student appears with badge.

### Implementation for User Story 6

- [x] T026 [US6] Implement DELETE deactivate API endpoint (set status inactive, delete files, clear documents, log audit) in `next/app/api/students/[id]/route.ts`
- [x] T027 [US6] Add deactivate button with confirmation dialog in student profile page
- [x] T028 [US6] Add "Show Inactive" toggle in StudentList that includes inactive students with status badge

**Checkpoint**: Deactivation works end-to-end. Inactive students are hidden by default and can be revealed via toggle.

---

## Phase 9: Polish & Cross-Cutting Concerns

**Purpose**: Final quality pass, build validation, and integration verification.

- [x] T029 Ensure all API routes enforce JWT auth + RBAC permission check (verify against existing middleware pattern)
- [x] T030 Ensure all API routes log mutations to AuditLog (verify create, update, deactivate, document operations)
- [x] T031 Verify RTL Arabic layout across all student pages (list, profile, forms)
- [x] T032 Run `npm run lint` — fix any linting errors
- [x] T033 Run `npm run build` — fix any build errors (must pass with zero errors)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: No dependencies — can start immediately
- **Phase 2 (Foundational)**: Depends on Phase 1 — BLOCKS all user stories
- **Phase 3-8 (User Stories)**: All depend on Phase 2 completion
  - Stories can proceed in parallel (if staffed) or sequentially in priority order
- **Phase 9 (Polish)**: Depends on all desired user stories being complete

### User Story Dependencies

- **US1 (Browse/Search)**: After Phase 2 — no dependencies on other stories
- **US2 (Profile)**: After Phase 2 — integrates with US1 list but independently testable
- **US3 (Add Student)**: After Phase 2 — adds to US1 list but independently testable
- **US4 (Upload Documents)**: After Phase 2 — uses US2 profile but independently testable
- **US5 (Edit Student)**: After Phase 2 — uses US2 profile but independently testable
- **US6 (Deactivate)**: After Phase 2 — uses US2 profile, affects US1 list filter

### Within Each User Story

- API endpoint before page/component wiring
- Core implementation before integration
- Story complete before moving to next priority

### Parallel Opportunities

- T002, T003 can run in parallel with T001 (different files)
- T005-T009 can all run in parallel (different files)
- T011 can run in parallel with T010 (different files)
- T021 can run in parallel with T019-T020 (different files — documents endpoint is separate)
- Once Phase 2 completes, all user stories (Phase 3-8) can be worked on in parallel by different developers

---

## Parallel Example: Foundational Phase (Phase 2)

```bash
# Launch all component shells together (different files, no dependencies):
Task: "Create StudentList component shell in next/components/students/StudentList.tsx"
Task: "Create StudentProfile component shell in next/components/students/StudentProfile.tsx"
Task: "Create StudentForm component shell in next/components/students/StudentForm.tsx"
Task: "Create DocumentUpload component shell in next/components/students/DocumentUpload.tsx"
Task: "Add Students sidebar navigation link in next/app/(dashboard)/layout.tsx"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (model + schemas + upload dir)
2. Complete Phase 2: Foundational (layout + components)
3. Complete Phase 3: User Story 1 (list + search)
4. **STOP and VALIDATE**: Verify student list renders, search works, status filter works
5. Deploy/demo if ready

### Incremental Delivery

1. Setup + Foundational → Foundation ready
2. Add US1 (Browse/Search) → Test → Deploy/Demo (MVP!)
3. Add US2 (Profile) → Test → Deploy/Demo
4. Add US3 (Add Student) → Test → Deploy/Demo
5. Add US4 (Documents) → Test → Deploy/Demo
6. Add US5 (Edit) → Test → Deploy/Demo
7. Add US6 (Deactivate) → Test → Deploy/Demo
8. Polish → Final build validation

### Parallel Team Strategy

With multiple developers:

1. Team completes Setup + Foundational together
2. Once Foundational is done:
   - Developer A: US1 (List) + US2 (Profile)
   - Developer B: US3 (Create) + US4 (Documents)
   - Developer C: US5 (Edit) + US6 (Deactivate)
3. Merge and run Phase 9 (Polish) together

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- All tasks use existing project patterns: Mongoose models, Zod validation, JWT auth middleware, AuditLog model
- No test tasks included — tests were not requested in the spec
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
