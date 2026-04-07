# Tasks: التعليم (Education & Courses)

**Input**: Design documents from `/specs/008-education/`
**Prerequisites**: plan.md ✅, spec.md ✅, research.md ✅, data-model.md ✅, contracts/ ✅

**Tests**: Not requested — no test tasks included.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Validation schemas and upload directory — all tasks that block every user story. Course model already exists.

- [x] T001 Create Zod validation schemas (CreateCourse, UpdateCourse, CourseListQuery, AddParticipant, RemoveParticipant) in `next/lib/validations/education.ts`
- [x] T002 [P] Ensure upload directory exists at `public/uploads/courses/`

**Checkpoint**: Schemas ready, file storage configured — API routes can now be built.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Dashboard layout with RBAC guard and shared reusable components. All API routes and pages depend on these.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [x] T003 Create Education section layout with RBAC permission check in `next/app/(dashboard)/education/layout.tsx`
- [x] T004 [P] Create CourseCard component in `next/components/education/CourseCard.tsx`
- [x] T005 [P] Create CourseGrid component with status filter in `next/components/education/CourseGrid.tsx`
- [x] T006 [P] Create CourseDetail component with info display, participant list, and documents in `next/components/education/CourseDetail.tsx`
- [x] T007 [P] Create CourseForm component (create/edit modal) in `next/components/education/CourseForm.tsx`
- [x] T008 [P] Create ParticipantPicker component (searchable selector) in `next/components/education/ParticipantPicker.tsx`
- [x] T009 [P] Create CourseDocumentUpload component in `next/components/education/CourseDocumentUpload.tsx`

**Checkpoint**: Layout and all component shells are ready — user story implementation can now proceed.

---

## Phase 3: User Story 1 - Browse & Filter Courses (Priority: P1) 🎯 MVP

**Goal**: Employee can view a card-based catalog of all courses, filter by status, and search by title.

**Independent Test**: Navigate to `/education`, verify cards render with title, dates, status badge, participant count. Filter by status — list updates.

### Implementation for User Story 1

- [x] T010 [US1] Implement GET list API endpoint with status filter, search, and pagination in `next/app/api/education/route.ts`
- [x] T011 [US1] Create education catalog page wiring CourseGrid component to API in `next/app/(dashboard)/education/page.tsx`

**Checkpoint**: Course catalog is fully functional with search and status filtering.

---

## Phase 4: User Story 2 - View Course Details (Priority: P2)

**Goal**: Employee clicks a course card to view full detail with participant list and downloadable documents.

**Independent Test**: Click any course card → detail page opens with correct data. Participant list shows names. Documents downloadable.

### Implementation for User Story 2

- [x] T012 [US2] Implement GET detail API endpoint returning populated course with participants in `next/app/api/education/[id]/route.ts`
- [x] T013 [US2] Create course detail page wiring CourseDetail component to API in `next/app/(dashboard)/education/[id]/page.tsx`
- [x] T014 [US2] Implement document download functionality (link to fileUrl) in detail page

**Checkpoint**: Course detail page is fully functional with data display and document download.

---

## Phase 5: User Story 3 - Create New Course (Priority: P3)

**Goal**: Employee with edit permission can create a new course via a form. End date must be >= start date.

**Independent Test**: Click "إضافة دورة" → form opens → fill fields → submit → course appears in catalog with status "قادمة".

### Implementation for User Story 3

- [x] T015 [US3] Implement POST create API endpoint with Zod validation and date range check in `next/app/api/education/route.ts`
- [x] T016 [US3] Wire CourseForm create mode (submit to POST API, handle validation errors) in catalog page
- [x] T017 [US3] Add AuditLog entry on course creation in create API endpoint

**Checkpoint**: Courses can be created via the form. Date validation works.

---

## Phase 6: User Story 4 - Manage Course Participants (Priority: P4)

**Goal**: Employee can add/remove participants (officers or students) from a course. Duplicate enrollment is prevented.

**Independent Test**: Open course detail → add participant → appears in list. Try duplicate → error. Remove participant → gone.

### Implementation for User Story 4

- [x] T018 [US4] Implement POST add participant API endpoint with duplicate check and type validation in `next/app/api/education/[id]/participants/route.ts`
- [x] T019 [US4] Wire ParticipantPicker component to add API in course detail page
- [x] T020 [P] [US4] Implement DELETE remove participant API endpoint in `next/app/api/education/[id]/participants/route.ts`
- [x] T021 [US4] Add remove participant button with confirmation in course detail page

**Checkpoint**: Participants can be added and removed. Duplicates are prevented.

---

## Phase 7: User Story 5 - Upload Course Documents (Priority: P5)

**Goal**: Employee can upload PDF/image documents (max 10MB) to a course.

**Independent Test**: Open course detail → upload document → appears in list. Try invalid type → error. Try >10MB → error.

### Implementation for User Story 5

- [x] T022 [US5] Implement POST document upload API endpoint with MIME/extension/size validation in `next/app/api/education/[id]/documents/route.ts`
- [x] T023 [US5] Wire CourseDocumentUpload component to upload API in course detail page
- [x] T024 [P] [US5] Implement DELETE document removal API endpoint in `next/app/api/education/[id]/documents/route.ts`
- [x] T025 [US5] Add document delete button in course detail page

**Checkpoint**: Documents can be uploaded and removed. File validation works.

---

## Phase 8: User Story 6 - Edit & Update Course (Priority: P6)

**Goal**: Employee can modify course info and update status (e.g., mark as completed).

**Independent Test**: Open course → edit → change status → save → badge updates. View-only user sees no edit button.

### Implementation for User Story 6

- [x] T026 [US6] Implement PATCH update API endpoint with partial Zod validation in `next/app/api/education/[id]/route.ts`
- [x] T027 [US6] Wire CourseForm edit mode (pre-fill, submit to PATCH API) in course detail page
- [x] T028 [US6] Add AuditLog entry on course update in update API endpoint
- [x] T029 [US6] Implement DELETE course API endpoint (blocked if participants enrolled) in `next/app/api/education/[id]/route.ts`
- [x] T030 [US6] Add delete course button with participant check in course detail page

**Checkpoint**: Course editing and deletion work. Deletion blocked with enrolled participants.

---

## Phase 9: Polish & Cross-Cutting Concerns

**Purpose**: Final quality pass, build validation, and integration verification.

- [x] T031 Ensure all API routes enforce JWT auth + RBAC permission check
- [x] T032 Ensure all API routes log mutations to AuditLog
- [x] T033 Verify RTL Arabic layout across all education pages
- [x] T034 Run `npm run lint` — fix any linting errors
- [x] T035 Run `npm run build` — fix any build errors (must pass with zero errors)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: No dependencies — can start immediately
- **Phase 2 (Foundational)**: Depends on Phase 1 — BLOCKS all user stories
- **Phase 3-8 (User Stories)**: All depend on Phase 2 completion
- **Phase 9 (Polish)**: Depends on all desired user stories being complete

### User Story Dependencies

- **US1 (Browse/Filter)**: After Phase 2 — no dependencies on other stories
- **US2 (Detail)**: After Phase 2 — integrates with US1 list but independently testable
- **US3 (Create)**: After Phase 2 — adds to US1 catalog but independently testable
- **US4 (Participants)**: After Phase 2 — uses US2 detail but independently testable
- **US5 (Documents)**: After Phase 2 — uses US2 detail but independently testable
- **US6 (Edit/Delete)**: After Phase 2 — uses US2 detail but independently testable

### Parallel Opportunities

- T002 can run in parallel with T001
- T004-T009 can all run in parallel (different files)
- T011 can run in parallel with T010
- T020 can run in parallel with T018-T019
- T024 can run in parallel with T022-T023
- Once Phase 2 completes, all user stories (Phase 3-8) can be worked on in parallel

---

## Parallel Example: Foundational Phase (Phase 2)

```bash
# Launch all component shells together (different files, no dependencies):
Task: "Create CourseCard component in next/components/education/CourseCard.tsx"
Task: "Create CourseGrid component in next/components/education/CourseGrid.tsx"
Task: "Create CourseDetail component in next/components/education/CourseDetail.tsx"
Task: "Create CourseForm component in next/components/education/CourseForm.tsx"
Task: "Create ParticipantPicker component in next/components/education/ParticipantPicker.tsx"
Task: "Create CourseDocumentUpload component in next/components/education/CourseDocumentUpload.tsx"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (schemas + upload dir)
2. Complete Phase 2: Foundational (layout + components)
3. Complete Phase 3: US1 (catalog + filter)
4. **STOP and VALIDATE**: Verify catalog renders, filter works
5. Deploy/demo if ready

### Incremental Delivery

1. Setup + Foundational → Foundation ready
2. Add US1 (Catalog) → Test → Deploy/Demo (MVP!)
3. Add US2 (Detail) → Test → Deploy/Demo
4. Add US3 (Create) → Test → Deploy/Demo
5. Add US4 (Participants) → Test → Deploy/Demo
6. Add US5 (Documents) → Test → Deploy/Demo
7. Add US6 (Edit/Delete) → Test → Deploy/Demo
8. Polish → Final build validation

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Course model already exists — no model update tasks needed
- Sidebar already includes "التعليم" link — no navigation task needed
- All tasks use existing project patterns: Mongoose, Zod, JWT auth, AuditLog
- No test tasks included — tests were not requested in the spec
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently

---

## Tech Debt Tasks (Generated by /speckit.cleanup)

**Generated**: 2026-04-04
**Source**: Post-implementation cleanup of التعليم (Education & Courses)
**Priority**: Address before next feature iteration

### Detected Issues

- [x] TD001 [P2] Replace `alert()` in CourseDetail.tsx:51 with proper inline error UI component — currently uses browser alert for delete error messages
- [x] TD002 [P2] Refactor CourseForm.tsx:100 to use proper form submission pattern — currently manually constructs fake FormEvent instead of using `<form>` submit
- [x] TD003 [P3] Use `escapeRegex` utility in education/page.tsx:36 for search query — currently passes raw search string to MongoDB regex which could enable ReDoS
- [x] TD004 [P3] Add proper type validation for external API response in ParticipantPicker.tsx:31 — currently assumes response structure without validation
