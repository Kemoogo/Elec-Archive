# Tasks: قسم الفاكس — Fax Management Module

**Input**: Design documents from `/specs/004-fax-module/`
**Prerequisites**: `plan.md`, `spec.md`, `research.md`, `data-model.md`, `contracts/fax-api.md`, `quickstart.md`

**Tests**: Automated tests are not explicitly requested in the feature docs. Validation in this task list uses the manual scenarios in `specs/004-fax-module/quickstart.md` plus `npm run build`.

**Organization**: Tasks are grouped by user story to preserve independent implementation and validation.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no incomplete-task dependency)
- **[Story]**: User story label for traceability (`[US1]`, `[US2]`, etc.)
- Every task includes exact file paths so it can be executed without extra context

## Phase 1: Setup (Shared Scaffolding)

**Purpose**: Create the planned fax module file structure before shared logic is added.

- [x] T001 Create fax page and API route scaffolding in `next/app/(dashboard)/fax/` and `next/app/api/fax/`
- [x] T002 [P] Create fax component scaffolding in `next/components/fax/FaxTable.tsx`, `next/components/fax/FaxFilters.tsx`, `next/components/fax/FaxUploadForm.tsx`, `next/components/fax/FaxViewer.tsx`, `next/components/fax/CommanderDecision.tsx`, `next/components/fax/FaxThread.tsx`, `next/components/fax/FaxLinkSearch.tsx`, and `next/components/fax/FaxClosureForm.tsx`
- [x] T003 [P] Create shared fax helper scaffolding in `next/lib/validations/fax.ts`, `next/lib/fax/access.ts`, and `next/lib/fax/queries.ts`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Build the shared model, validation, upload, and authorization/query helpers required by every story.

**⚠️ CRITICAL**: No user story work should start until this phase is complete.

- [x] T004 Update fax schema, enums, and indexes in `next/lib/db/models/Fax.ts` and `next/lib/db/models/index.ts`
- [x] T005 [P] Implement shared fax request/query/body schemas in `next/lib/validations/fax.ts`
- [x] T006 [P] Implement fax authorization and closure eligibility helpers in `next/lib/fax/access.ts`
- [x] T007 [P] Implement fax query, pagination, and serialization helpers in `next/lib/fax/queries.ts`
- [x] T008 [P] Restrict fax upload handling and folder behavior in `next/lib/uploads/index.ts`

**Checkpoint**: Shared fax foundations are ready; user stories can now proceed in priority order.

---

## Phase 3: User Story 1 - رفع فاكس جديد (Priority: P1) 🎯 MVP

**Goal**: Allow authorized fax staff to upload a new fax with metadata, local file storage, commander notification, and audit logging.

**Independent Test**: Upload a valid PDF/image with complete metadata and confirm the fax is stored as `pending`, appears in the system, and triggers a commander notification; invalid file types, oversized files, and duplicate `faxNumber + date` combinations must be rejected with Arabic errors.

### Implementation for User Story 1

- [x] T009 [P] [US1] Implement the new fax page shell in `next/app/(dashboard)/fax/new/page.tsx`
- [x] T010 [P] [US1] Build the upload form with Arabic validation states in `next/components/fax/FaxUploadForm.tsx`
- [x] T011 [US1] Implement the POST fax creation handler with auth, RBAC, upload, and duplicate protection in `next/app/api/fax/route.ts`
- [x] T012 [US1] Wire fax creation notifications and audit logging in `next/app/api/fax/route.ts` and `next/lib/notifications/createNotification.ts`
- [x] T013 [US1] Validate upload scenarios from `specs/004-fax-module/quickstart.md` against `next/app/api/fax/route.ts` and `next/components/fax/FaxUploadForm.tsx`

**Checkpoint**: User Story 1 should be fully usable as the MVP upload flow.

---

## Phase 4: User Story 2 - عرض قائمة الفاكسات والبحث فيها (Priority: P1)

**Goal**: Provide an SSR fax list with search, filters, sort, pagination, and a forwarded-to-me view.

**Independent Test**: Open the fax list page, search by fax number/subject/sender, filter by status and date range, sort by supported columns, and paginate through a data set without loading everything at once.

### Implementation for User Story 2

- [x] T014 [P] [US2] Implement the SSR fax list page in `next/app/(dashboard)/fax/page.tsx`
- [x] T015 [P] [US2] Build the fax table with status badges and pagination controls in `next/components/fax/FaxTable.tsx`
- [x] T016 [P] [US2] Build search, filter, and sort controls in `next/components/fax/FaxFilters.tsx`
- [x] T017 [US2] Extend `next/app/api/fax/route.ts` with the GET list handler for filtering, sorting, pagination, and `forwardedToMe`
- [x] T018 [US2] Wire list interactions on `next/app/(dashboard)/fax/page.tsx` with `next/components/fax/FaxFilters.tsx` and `next/components/fax/FaxTable.tsx`
- [x] T019 [US2] Validate list and search scenarios from `specs/004-fax-module/quickstart.md` against `next/app/(dashboard)/fax/page.tsx` and `next/app/api/fax/route.ts`

**Checkpoint**: Fax browsing should work independently for users with `view` or `edit` access.

---

## Phase 5: User Story 3 - عرض تفاصيل الفاكس (Priority: P1)

**Goal**: Show the full fax details view with embedded file preview, decision metadata, forwarding details, and related fax thread context.

**Independent Test**: Open a fax from the list and verify the PDF/image viewer, metadata, commander decision, forwarding target, and related fax links all render correctly.

### Implementation for User Story 3

- [x] T020 [P] [US3] Implement the SSR fax detail page in `next/app/(dashboard)/fax/[id]/page.tsx`
- [x] T021 [P] [US3] Build the embedded PDF/image viewer in `next/components/fax/FaxViewer.tsx`
- [x] T022 [P] [US3] Build the related fax timeline display in `next/components/fax/FaxThread.tsx`
- [x] T023 [US3] Implement the GET detail handler with populated decision, forwarding, and thread data in `next/app/api/fax/[id]/route.ts`
- [x] T024 [US3] Wire detail presentation in `next/app/(dashboard)/fax/[id]/page.tsx` with `next/components/fax/FaxViewer.tsx` and `next/components/fax/FaxThread.tsx`
- [x] T025 [US3] Validate detail-view scenarios from `specs/004-fax-module/quickstart.md` against `next/app/(dashboard)/fax/[id]/page.tsx` and `next/app/api/fax/[id]/route.ts`

**Checkpoint**: Users can inspect a fax end-to-end without needing later workflow features.

---

## Phase 6: User Story 4 - اتخاذ قرار القائد على الفاكس (Priority: P2)

**Goal**: Allow commander/admin users to write a decision, forward a pending fax to a user or department, or close it directly.

**Independent Test**: As a commander/admin, open a pending fax, submit a decision with either a user or department target, confirm the fax becomes `forwarded`, and verify that a direct close sets the fax to `closed`; non-commanders must not see or use the decision controls.

### Implementation for User Story 4

- [x] T026 [P] [US4] Build the commander decision form with user-or-department target inputs in `next/components/fax/CommanderDecision.tsx`
- [x] T027 [US4] Implement the commander decision PATCH handler with role checks and state transitions in `next/app/api/fax/[id]/decision/route.ts`
- [x] T028 [US4] Wire decision visibility and mutations in `next/app/(dashboard)/fax/[id]/page.tsx` and `next/components/fax/CommanderDecision.tsx`
- [x] T029 [US4] Extend forwarding and direct-close notifications plus audit entries in `next/app/api/fax/[id]/decision/route.ts` and `next/lib/notifications/createNotification.ts`
- [x] T030 [US4] Validate commander decision scenarios from `specs/004-fax-module/quickstart.md` against `next/app/api/fax/[id]/decision/route.ts` and `next/components/fax/CommanderDecision.tsx`

**Checkpoint**: Commander decision workflow should be functional and independently verifiable.

---

## Phase 7: User Story 5 - ربط الفاكسات بموضوع واحد (Priority: P2)

**Goal**: Support bidirectional fax threading with search-driven linking and unlinking from the detail view.

**Independent Test**: Link two faxes through the UI, verify both detail pages show the relationship in chronological order, then unlink them and confirm the relationship is removed from both sides.

### Implementation for User Story 5

- [x] T031 [P] [US5] Build the fax link autocomplete and action UI in `next/components/fax/FaxLinkSearch.tsx`
- [x] T032 [US5] Implement the lightweight fax lookup endpoint in `next/app/api/fax/search/route.ts`
- [x] T033 [US5] Implement the bidirectional link and unlink handler in `next/app/api/fax/[id]/link/route.ts`
- [x] T034 [US5] Integrate link management into `next/app/(dashboard)/fax/[id]/page.tsx`, `next/components/fax/FaxLinkSearch.tsx`, and `next/components/fax/FaxThread.tsx`
- [x] T035 [US5] Validate threading scenarios from `specs/004-fax-module/quickstart.md` against `next/app/api/fax/search/route.ts` and `next/app/api/fax/[id]/link/route.ts`

**Checkpoint**: Threaded fax relationships should work independently of closure flow.

---

## Phase 8: User Story 6 - Workflow الفاكس الكامل (Priority: P3)

**Goal**: Complete the forwarded-fax lifecycle so assignees can close work, forwarded-to-me views stay accurate, and every state change is auditable.

**Independent Test**: Run the full path from upload → commander decision → forwarded user/department review → closure, confirming authorization, forwarded-to-me visibility, notifications, and audit logging at each step.

### Implementation for User Story 6

- [x] T036 [P] [US6] Build the forwarded fax closure form in `next/components/fax/FaxClosureForm.tsx`
- [x] T037 [US6] Implement forwarded fax closure authorization and state update in `next/app/api/fax/[id]/close/route.ts`
- [x] T038 [US6] Wire forwarded-to-me inbox behavior on `next/app/(dashboard)/fax/page.tsx` and closure actions on `next/app/(dashboard)/fax/[id]/page.tsx`
- [x] T039 [US6] Record closure audit details and any closure-side notification updates in `next/app/api/fax/[id]/close/route.ts` and `next/lib/auth/audit.ts`
- [x] T040 [US6] Validate the end-to-end lifecycle checklist from `specs/004-fax-module/quickstart.md` against `next/app/api/fax/[id]/close/route.ts`, `next/app/api/fax/[id]/decision/route.ts`, and `next/app/(dashboard)/fax/page.tsx`

**Checkpoint**: The complete fax workflow should now be demonstrable end-to-end.

---

## Phase 9: Polish & Cross-Cutting Concerns

**Purpose**: Final consistency, UX, and production-readiness checks across the module.

- [x] T041 [P] Refresh fax dashboard entry points and module summaries in `next/app/(dashboard)/page.tsx` and `next/app/(dashboard)/layout.tsx`
- [x] T042 [P] Run an Arabic RTL and error-copy pass across `next/components/fax/FaxUploadForm.tsx`, `next/components/fax/FaxFilters.tsx`, `next/components/fax/CommanderDecision.tsx`, and `next/components/fax/FaxClosureForm.tsx`
- [x] T043 [P] Reconcile API error messaging and response consistency across `next/app/api/fax/route.ts`, `next/app/api/fax/[id]/route.ts`, `next/app/api/fax/[id]/decision/route.ts`, `next/app/api/fax/[id]/close/route.ts`, `next/app/api/fax/[id]/link/route.ts`, and `next/app/api/fax/search/route.ts`
- [x] T044 Run production validation from `next/package.json` and capture any remaining manual verification notes in `specs/004-fax-module/quickstart.md`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 → Phase 2**: Setup scaffolding must exist before shared logic is added.
- **Phase 2 → Phases 3-8**: Foundational schema, validation, auth, query, and upload helpers block every user story.
- **Phase 9**: Starts after the desired user stories are complete.

### User Story Dependencies

- **US1 (P1)**: Starts immediately after Phase 2 and delivers the MVP upload flow.
- **US2 (P1)**: Starts after Phase 2; depends on shared helpers and benefits from having US1 data available.
- **US3 (P1)**: Starts after Phase 2; depends on stored fax records and can follow US1 in sequence.
- **US4 (P2)**: Depends on US1 and US3 because commanders need existing faxes plus the detail view to act on them.
- **US5 (P2)**: Depends on US1 and US3 because linking is initiated from fax detail pages.
- **US6 (P3)**: Depends on US1, US4, and the relevant detail/list experiences from US2-US3.

### Within Each User Story

- Build data/API behavior before wiring the final interaction points that depend on it.
- Finish the story-specific validation task before declaring the story complete.
- Keep cross-story edits minimal until the owning story is stable.

### Parallel Opportunities

- **Phase 1**: `T002` and `T003` can run in parallel after `T001` starts the structure.
- **Phase 2**: `T005`, `T006`, `T007`, and `T008` can run in parallel after `T004` locks the model contract.
- **US1**: `T009` and `T010` can run in parallel before they are wired to `T011`.
- **US2**: `T014`, `T015`, and `T016` can run in parallel before `T018`.
- **US3**: `T020`, `T021`, and `T022` can run in parallel before `T024`.
- **US4**: `T026` can run in parallel with early API work in `T027` if the request contract from `next/lib/validations/fax.ts` is stable.
- **US5**: `T031` can run in parallel with `T032`, then both feed `T034`.
- **US6**: `T036` can run in parallel with `T037`, then both feed `T038`.
- **Phase 9**: `T041`, `T042`, and `T043` can run in parallel.

---

## Parallel Example: User Story 1

```bash
Task: "T009 [US1] Implement the new fax page shell in next/app/(dashboard)/fax/new/page.tsx"
Task: "T010 [US1] Build the upload form with Arabic validation states in next/components/fax/FaxUploadForm.tsx"
```

## Parallel Example: User Story 2

```bash
Task: "T014 [US2] Implement the SSR fax list page in next/app/(dashboard)/fax/page.tsx"
Task: "T015 [US2] Build the fax table with status badges and pagination controls in next/components/fax/FaxTable.tsx"
Task: "T016 [US2] Build search, filter, and sort controls in next/components/fax/FaxFilters.tsx"
```

## Parallel Example: User Story 3

```bash
Task: "T020 [US3] Implement the SSR fax detail page in next/app/(dashboard)/fax/[id]/page.tsx"
Task: "T021 [US3] Build the embedded PDF/image viewer in next/components/fax/FaxViewer.tsx"
Task: "T022 [US3] Build the related fax timeline display in next/components/fax/FaxThread.tsx"
```

## Parallel Example: User Story 4

```bash
Task: "T026 [US4] Build the commander decision form with user-or-department target inputs in next/components/fax/CommanderDecision.tsx"
Task: "T027 [US4] Implement the commander decision PATCH handler in next/app/api/fax/[id]/decision/route.ts"
```

## Parallel Example: User Story 5

```bash
Task: "T031 [US5] Build the fax link autocomplete and action UI in next/components/fax/FaxLinkSearch.tsx"
Task: "T032 [US5] Implement the lightweight fax lookup endpoint in next/app/api/fax/search/route.ts"
```

## Parallel Example: User Story 6

```bash
Task: "T036 [US6] Build the forwarded fax closure form in next/components/fax/FaxClosureForm.tsx"
Task: "T037 [US6] Implement forwarded fax closure authorization and state update in next/app/api/fax/[id]/close/route.ts"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup.
2. Complete Phase 2: Foundational prerequisites.
3. Complete Phase 3: User Story 1.
4. Validate `T013` against `specs/004-fax-module/quickstart.md`.
5. Demo the upload flow before expanding scope.

### Incremental Delivery

1. Setup + Foundational create the shared fax platform.
2. Deliver US1 for upload and intake.
3. Deliver US2 and US3 for discoverability and detail inspection.
4. Deliver US4 and US5 for decisioning and threading.
5. Deliver US6 for complete lifecycle closure.
6. Finish with Phase 9 polish and build validation.

### Parallel Team Strategy

1. One developer finishes Phase 1-2 shared foundations.
2. After that checkpoint:
   - Developer A: US1 / US2
   - Developer B: US3 / US5
   - Developer C: US4 / US6
3. Merge once each story-level validation task passes.

---

## Notes

- `[P]` tasks target different files or stable contracts and are safe parallel candidates.
- User story labels map directly to the six stories in `specs/004-fax-module/spec.md`.
- Manual validation tasks are included because the feature docs specify scenario-based verification rather than automated TDD.
- Keep API routes aligned with the project rule: auth → RBAC/role check → Zod validation → operation → audit log → response.
