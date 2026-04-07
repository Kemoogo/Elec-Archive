# Tasks: شئون الضباط — Officers Affairs Module

**Input**: Design documents from `/specs/005-officers-affairs/`
**Prerequisites**: `plan.md`, `spec.md`, `research.md`, `data-model.md`, `contracts/officers-api.md`, `quickstart.md`

**Tests**: Automated tests are not explicitly requested in the feature docs. Validation in this task list uses the manual scenarios in `specs/005-officers-affairs/quickstart.md` plus `npm run lint` and `npm run build`.

**Organization**: Tasks are grouped by user story to preserve independent implementation and validation.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no incomplete-task dependency)
- **[Story]**: User story label for traceability (`[US1]`, `[US2]`, etc.)
- Every task includes exact file paths so it can be executed without extra context

## Phase 1: Setup (Shared Scaffolding)

**Purpose**: Capture Stitch-driven UI inputs and create the planned officers module structure before shared logic is added.

- [x] T001 Use Stitch MCP to generate UI designs for all 4 officers screens: run `stitch_create_project` with title "Officers Affairs", then `stitch_generate_screen_from_text` for (1) officers list page, (2) officer detail page, (3) daily rollcall page, (4) leave register page — prompts must reference DESIGN.md context and specify Arabic RTL dark-theme requirements. Save generated layout notes to `specs/005-officers-affairs/stitch/officers-list.md`, `specs/005-officers-affairs/stitch/officer-detail.md`, `specs/005-officers-affairs/stitch/rollcall.md`, and `specs/005-officers-affairs/stitch/leave-register.md`
- [x] T002 Extract design DNA from Stitch-generated screens: run `stitch_list_screens` and `stitch_get_screen` to capture component structure, color tokens, and layout patterns. Record component extraction checklists in the stitch output files created by T001
- [X] T003 Create officers page and API route scaffolding in `next/app/(dashboard)/officers/` and `next/app/api/officers/`
- [X] T004 [P] Create officers component scaffolding in `next/components/officers/OfficersTable.tsx`, `next/components/officers/OfficersPageClient.tsx` (filters integrated), `next/components/officers/OfficerForm.tsx`, `next/components/officers/OfficerDocuments.tsx`, `next/components/officers/RollcallSheet.tsx`, `next/components/officers/RollcallSummary.tsx`, `next/components/officers/LeaveRegister.tsx`, and `next/components/officers/AssignmentTimeline.tsx`
- [X] T005 [P] Create officers helper scaffolding in `next/lib/officers/access.ts`, `next/lib/officers/queries.ts`, `next/lib/officers/reminders.ts`, `next/lib/validations/officers.ts`, and `next/lib/security/rate-limit.ts`
- [X] T006 [P] Create reminder worker scaffolding in `next/scripts/officers-rollcall-reminder.ts`, `docker-compose.yml`, and `next/package.json`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Build the shared models, validation, queries, uploads, rate limiting, and compatibility updates required by every story.

**⚠️ CRITICAL**: No user story work should start until this phase is complete.

- [X] T007 Update officer, rollcall, leave, and assignment schemas plus exports in `next/lib/db/models/Officer.ts`, `next/lib/db/models/DailyRollcall.ts`, `next/lib/db/models/Leave.ts`, `next/lib/db/models/Assignment.ts`, and `next/lib/db/models/index.ts`
- [X] T008 [P] Implement officers request, filter, and payload schemas in `next/lib/validations/officers.ts`
- [X] T009 [P] Implement officers RBAC and commander-view helpers in `next/lib/officers/access.ts`
- [X] T010 [P] Implement officers query, serialization, and detail aggregation helpers in `next/lib/officers/queries.ts`
- [X] T011 [P] Restrict officer PDF uploads with `5 * 1024 * 1024` byte limit (5,242,880 bytes), max 20 docs per officer, and `public/uploads/officers/` storage behavior in `next/lib/uploads/index.ts`
- [X] T012 [P] Implement the shared officers API rate-limiting helper with the defined read/write/upload thresholds and `429` envelope in `next/lib/security/rate-limit.ts`
- [X] T013 [P] Align existing rollcall summary reads with the updated model in `next/app/(dashboard)/page.tsx` and `next/app/api/dashboard/route.ts`

**Checkpoint**: Shared officers foundations are ready; user stories can now proceed in priority order.

---

## Phase 3: User Story 1 - إدارة قائمة الضباط (Priority: P1) 🎯 MVP

**Goal**: Provide the officers landing page with searchable, filterable officer rows and a create-officer flow so staff can start building the registry.

**Independent Test**: Create several officers, open `/officers`, search by name or military ID, filter by employment status, and confirm duplicate `militaryId` creation is rejected with an Arabic error.

### Implementation for User Story 1

- [X] T014 [P] [US1] Implement the SSR officers list page using the approved Stitch layout in `next/app/(dashboard)/officers/page.tsx`
- [X] T015 [P] [US1] Build the officers table with rank/status columns and empty states in `next/components/officers/OfficersTable.tsx`
- [X] T016 [P] [US1] Build search, status filter, and create-officer form interactions in `next/components/officers/OfficersPageClient.tsx` and `next/components/officers/OfficerForm.tsx`
- [X] T017 [US1] Implement the GET/POST officers handler with auth, rate limiting, RBAC, duplicate `militaryId` protection, standardized responses, and audit logging in `next/app/api/officers/route.ts`
- [X] T018 [US1] Wire list page data loading and officer creation flows in `next/app/(dashboard)/officers/page.tsx`, `next/components/officers/OfficersTable.tsx`, `next/components/officers/OfficersPageClient.tsx`, and `next/components/officers/OfficerForm.tsx`
- [X] T019 [US1] Validate officers list/search/filter/duplicate-ID plus the SC-001 `<15s` end-to-end target and `<1s` search-result render target from `specs/005-officers-affairs/quickstart.md` against `next/app/(dashboard)/officers/page.tsx` and `next/app/api/officers/route.ts`

**Checkpoint**: User Story 1 should be fully usable as the MVP registry entry point.

---

## Phase 4: User Story 2 - عرض السجل الكامل للضابط (Priority: P1)

**Goal**: Deliver the officer detail file with editable core data, document upload/delete, and clear not-found handling.

**Independent Test**: Open a valid officer record, verify the core data renders, update editable fields, upload/remove a PDF document, and confirm an unknown officer URL shows a clear unavailable state.

### Implementation for User Story 2

- [X] T020 [P] [US2] Implement the SSR officer detail page using the approved Stitch layout with not-found state in `next/app/(dashboard)/officers/[id]/page.tsx`
- [X] T021 [P] [US2] Extend the officer form for detail edit mode and Arabic validation messaging in `next/components/officers/OfficerForm.tsx`
- [X] T022 [P] [US2] Build officer document list, upload, and delete controls in `next/components/officers/OfficerDocuments.tsx`
- [X] T023 [P] [US2] Implement the GET/PATCH officer detail handler with auth, rate limiting, RBAC, standardized responses, and audit logging in `next/app/api/officers/[id]/route.ts`
- [X] T024 [P] [US2] Implement the officer document upload/delete handler with auth, rate limiting, file constraints (PDF only, 5,242,880 bytes max, 20 docs per officer), standardized responses, and audit logging in `next/app/api/officers/[id]/documents/route.ts`
- [X] T025 [US2] Wire officer detail editing and document management in `next/app/(dashboard)/officers/[id]/page.tsx`, `next/components/officers/OfficerForm.tsx`, and `next/components/officers/OfficerDocuments.tsx`
- [X] T026 [US2] Validate officer file, document, and 404 scenarios from `specs/005-officers-affairs/quickstart.md` against `next/app/(dashboard)/officers/[id]/page.tsx`, `next/app/api/officers/[id]/route.ts`, and `next/app/api/officers/[id]/documents/route.ts`

**Checkpoint**: User Stories 1 and 2 should now support daily officer record management independently.

---

## Phase 5: User Story 3 - تسجيل التمام اليومي وإرساله (Priority: P1)

**Goal**: Enable daily rollcall drafting and submission with immutable daily records, local draft recovery, automatic reminders, and notification delivery for authorized staff.

**Independent Test**: Open `/officers/rollcall`, assign one status per active officer, save or submit the day, confirm incomplete submissions are blocked, confirm resubmission is rejected, simulate connection loss to verify draft recovery, verify stale-roster submission is blocked with a clear Arabic conflict message, confirm a realistic roster can be completed within the SC-002 target, and verify the automatic 09:00 reminder worker behavior.

### Implementation for User Story 3

- [X] T027 [P] [US3] Implement the SSR daily rollcall page using the approved Stitch layout in `next/app/(dashboard)/officers/rollcall/page.tsx`
- [X] T028 [P] [US3] Build the rollcall sheet with per-officer status selection, local draft persistence, recovery UX, and submit controls in `next/components/officers/RollcallSheet.tsx`
- [X] T029 [US3] Implement the GET/POST daily rollcall handler with auth, rate limiting, RBAC, draft save, submission-time roster revalidation, completeness checks, duplicate-day protection, submission immutability, standardized responses, Arabic conflict messaging, and audit logging in `next/app/api/officers/rollcall/route.ts`
- [X] T030 [P] [US3] Extend notification storage and creation helpers for officers reminders and rollcall submission alerts in `next/lib/db/models/Notification.ts` and `next/lib/notifications/createNotification.ts`
- [X] T031 [P] [US3] Extend notification APIs and shared bell visibility for officers reminder recipients in `next/app/api/notifications/route.ts`, `next/app/api/notifications/stream/route.ts`, `next/components/dashboard/NotificationBell.tsx`, and `next/app/(dashboard)/layout.tsx` (depends on T030 model changes)
- [X] T032 [P] [US3] Implement the 09:00 Sunday-Thursday reminder job logic and submitted-status messaging in `next/lib/officers/reminders.ts` and `next/scripts/officers-rollcall-reminder.ts`
- [X] T033 [US3] Configure automatic reminder worker execution in `docker-compose.yml` and `next/package.json`
- [X] T034 [US3] Wire rollcall draft/save/submit UX and reminder status messaging in `next/app/(dashboard)/officers/rollcall/page.tsx` and `next/components/officers/RollcallSheet.tsx`
- [X] T035 [US3] Validate rollcall draft/submission/reminder/draft-recovery, stale-roster, and SC-002 `<10 min` scenarios from `specs/005-officers-affairs/quickstart.md` against `next/app/(dashboard)/officers/rollcall/page.tsx`, `next/app/api/officers/rollcall/route.ts`, `next/scripts/officers-rollcall-reminder.ts`, and `docker-compose.yml`

**Checkpoint**: Daily rollcall intake should be complete and independently verifiable for officers staff.

---

## Phase 6: User Story 4 - متابعة القائد للتمام اليومي (Priority: P2)

**Goal**: Give commanders a read-only submitted rollcall summary with totals and a clear "not sent yet" state.

**Independent Test**: Sign in as a commander, open `/officers/rollcall`, verify the submitted summary totals render when a day is submitted, verify a clear waiting state appears when nothing has been submitted yet, and confirm the summary is available within the SC-006 timing target.

### Implementation for User Story 4

- [X] T036 [P] [US4] Build the commander read-only rollcall summary and not-sent state in `next/components/officers/RollcallSummary.tsx`
- [X] T037 [US4] Extend `next/app/api/officers/rollcall/route.ts` with auth, rate limiting, commander summary reads, and `viewedByCommander` tracking
- [X] T038 [US4] Wire commander-only rollcall rendering in `next/app/(dashboard)/officers/rollcall/page.tsx` and `next/components/officers/RollcallSummary.tsx`
- [X] T039 [US4] Validate commander متابعة and SC-006 timing scenarios from `specs/005-officers-affairs/quickstart.md` against `next/app/(dashboard)/officers/rollcall/page.tsx` and `next/app/api/officers/rollcall/route.ts`

**Checkpoint**: Commander visibility of submitted rollcall should work without edit access.

---

## Phase 7: User Story 5 - إدارة الإجازات والغيابات (Priority: P2)

**Goal**: Deliver leave/absence registration with category and status controls, date conflict checks, and officer profile integration.

**Independent Test**: Create a leave or absence record for an active officer, verify it appears in `/officers/leaves` and the officer profile, change its allowed status, and confirm invalid or overlapping ranges are rejected with Arabic feedback.

### Implementation for User Story 5

- [X] T040 [P] [US5] Implement the SSR leave register page using the approved Stitch layout in `next/app/(dashboard)/officers/leaves/page.tsx`
- [X] T041 [P] [US5] Build leave list, create form, category selector, and status controls in `next/components/officers/LeaveRegister.tsx`
- [X] T042 [US5] Implement leave list/create logic with auth, rate limiting, RBAC, range validation, overlap checks, standardized responses, and audit logging in `next/app/api/officers/leaves/route.ts`
- [X] T043 [P] [US5] Implement leave update and status-transition logic with auth, rate limiting, RBAC, standardized responses, and audit logging in `next/app/api/officers/leaves/[id]/route.ts`
- [X] T044 [US5] Integrate officer leave history into `next/app/(dashboard)/officers/[id]/page.tsx`, `next/components/officers/LeaveRegister.tsx`, and `next/lib/officers/queries.ts`
- [X] T045 [US5] Validate leave creation, absence creation, conflict, profile-display, and status-transition scenarios from `specs/005-officers-affairs/quickstart.md` against `next/app/(dashboard)/officers/leaves/page.tsx`, `next/app/api/officers/leaves/route.ts`, and `next/app/api/officers/leaves/[id]/route.ts`

**Checkpoint**: Leave and absence workflows should now be independently testable and visible in officer records.

---

## Phase 8: User Story 6 - إدارة التكليفات والترقيات والمأموريات (Priority: P3)

**Goal**: Add the professional timeline for assignments, promotions, and missions with date validation and officer profile rendering.

**Independent Test**: Add assignment, promotion, and mission records to an officer, confirm they appear in chronological order on the officer file, and reject invalid or conflicting mission dates with Arabic errors.

### Implementation for User Story 6

- [X] T046 [P] [US6] Build the assignment, promotion, and mission timeline UI in `next/components/officers/AssignmentTimeline.tsx`
- [X] T047 [US6] Implement assignment list/create logic with auth, rate limiting, RBAC, mission date validation, standardized responses, and audit logging in `next/app/api/officers/assignments/route.ts`
- [X] T048 [P] [US6] Implement assignment update logic with auth, rate limiting, RBAC, conflict handling, standardized responses, and audit logging in `next/app/api/officers/assignments/[id]/route.ts`
- [X] T049 [US6] Integrate assignment timeline data into `next/app/(dashboard)/officers/[id]/page.tsx` and `next/lib/officers/queries.ts`
- [X] T050 [US6] Validate assignment, promotion, and mission timeline scenarios from `specs/005-officers-affairs/quickstart.md` against `next/components/officers/AssignmentTimeline.tsx`, `next/app/api/officers/assignments/route.ts`, and `next/app/api/officers/assignments/[id]/route.ts`

**Checkpoint**: The officer file should now include a complete professional timeline.

---

## Phase 9: Polish & Cross-Cutting Concerns

**Purpose**: Final consistency, security, and production-readiness checks across the officers module.

- [X] T051 [P] Refresh officers dashboard cards and module navigation summaries in `next/app/(dashboard)/page.tsx`, `next/app/api/dashboard/route.ts`, and `next/app/(dashboard)/layout.tsx`
- [X] T052 [P] Reconcile Arabic RTL empty, error, and success copy across `next/components/officers/OfficersTable.tsx`, `next/components/officers/OfficerForm.tsx`, `next/components/officers/OfficerDocuments.tsx`, `next/components/officers/RollcallSheet.tsx`, `next/components/officers/RollcallSummary.tsx`, `next/components/officers/LeaveRegister.tsx`, and `next/components/officers/AssignmentTimeline.tsx`
- [X] T053 [P] Run a cross-route security and response sweep for defined rate-limit thresholds, audit coverage, `429` handling, and standardized envelopes in `next/app/api/officers/route.ts`, `next/app/api/officers/[id]/route.ts`, `next/app/api/officers/[id]/documents/route.ts`, `next/app/api/officers/rollcall/route.ts`, `next/app/api/officers/leaves/route.ts`, `next/app/api/officers/leaves/[id]/route.ts`, `next/app/api/officers/assignments/route.ts`, `next/app/api/officers/assignments/[id]/route.ts`, and `next/lib/security/rate-limit.ts`
- [X] T053b [P] Record manual performance evidence for SC-001 (`<15s` search), SC-002 (`<10 min` rollcall), and SC-006 (`<30s` commander view) targets with timestamps, device info, and officer count in `specs/005-officers-affairs/quickstart.md`
- [X] T054 Run `npm run lint` and `npm run build` from `next/package.json` and capture final manual and performance verification notes in `specs/005-officers-affairs/quickstart.md`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 -> Phase 2**: Stitch artifacts and scaffolding must exist before shared model, validation, query, rate-limit, and upload logic is added.
- **Phase 2 -> Phases 3-8**: Foundational schema, validation, query, access, upload, dashboard compatibility, and rate-limiting work blocks every user story.
- **Phase 9**: Starts after the desired user stories are complete.

### User Story Dependencies

- **US1 (P1)**: Starts immediately after Phase 2 and delivers the MVP officers registry.
- **US2 (P1)**: Starts after Phase 2; works best after US1 stabilizes because it extends `next/components/officers/OfficerForm.tsx` and uses created officer records.
- **US3 (P1)**: Starts after Phase 2; depends on the shared officer roster and reminder worker foundations from `docker-compose.yml` and `next/scripts/officers-rollcall-reminder.ts`.
- **US4 (P2)**: Depends on US3 because commander review only exists after rollcall submission is implemented.
- **US5 (P2)**: Depends on US2 because leave history is rendered inside the officer detail file.
- **US6 (P3)**: Depends on US2 and US5 because the timeline is rendered inside the officer detail page and mission conflict handling must account for leave periods.

### Within Each User Story

- Build API and persistence behavior before wiring the final interaction points that depend on it.
- Finish the story-specific validation task before declaring the story complete.
- Keep shared-file edits (`next/components/officers/OfficerForm.tsx`, `next/app/(dashboard)/officers/[id]/page.tsx`, `next/app/api/officers/rollcall/route.ts`) in dependency order to avoid merge conflicts.

### Parallel Opportunities

- **Phase 1**: `T004`, `T005`, and `T006` can run in parallel after `T001-T003` establish the design and folder structure.
- **Phase 2**: `T008`, `T009`, `T010`, `T011`, `T012`, and `T013` can run in parallel after `T007` fixes the shared data contracts.
- **US1**: `T014`, `T015`, and `T016` can run in parallel before `T018` wires the end-to-end flow.
- **US2**: `T020`, `T021`, `T022`, `T023`, and `T024` can run in parallel before `T025` integrates them.
- **US3**: `T027`, `T028`, `T030`, `T031`, and `T032` can run in parallel before `T034` completes the interactive flow.
- **US4**: `T036` can run in parallel with the early API work in `T037` once the rollcall response shape is agreed.
- **US5**: `T040`, `T041`, and `T043` can run in parallel before `T044` merges the leave views.
- **US6**: `T046` and `T048` can run in parallel before `T049` integrates the timeline into the profile page.
- **Phase 9**: `T051`, `T052`, and `T053` can run in parallel.

---

## Parallel Example: User Story 1

```bash
Task: "T014 [US1] Implement the SSR officers list page using the approved Stitch layout in next/app/(dashboard)/officers/page.tsx"
Task: "T015 [US1] Build the officers table with rank/status columns and empty states in next/components/officers/OfficersTable.tsx"
Task: "T016 [US1] Build search, status filter, and create-officer form interactions in next/components/officers/OfficersPageClient.tsx and next/components/officers/OfficerForm.tsx"
```

## Parallel Example: User Story 2

```bash
Task: "T020 [US2] Implement the SSR officer detail page using the approved Stitch layout in next/app/(dashboard)/officers/[id]/page.tsx"
Task: "T021 [US2] Extend the officer form for detail edit mode in next/components/officers/OfficerForm.tsx"
Task: "T022 [US2] Build officer document list, upload, and delete controls in next/components/officers/OfficerDocuments.tsx"
```

## Parallel Example: User Story 3

```bash
Task: "T027 [US3] Implement the SSR daily rollcall page using the approved Stitch layout in next/app/(dashboard)/officers/rollcall/page.tsx"
Task: "T028 [US3] Build the rollcall sheet with local draft persistence in next/components/officers/RollcallSheet.tsx"
Task: "T032 [US3] Implement the 09:00 reminder job logic in next/lib/officers/reminders.ts and next/scripts/officers-rollcall-reminder.ts"
```

## Parallel Example: User Story 4

```bash
Task: "T036 [US4] Build the commander read-only rollcall summary in next/components/officers/RollcallSummary.tsx"
Task: "T037 [US4] Extend next/app/api/officers/rollcall/route.ts with commander summary reads"
```

## Parallel Example: User Story 5

```bash
Task: "T040 [US5] Implement the SSR leave register page using the approved Stitch layout in next/app/(dashboard)/officers/leaves/page.tsx"
Task: "T041 [US5] Build leave list, create form, category selector, and status controls in next/components/officers/LeaveRegister.tsx"
Task: "T043 [US5] Implement leave update and status-transition logic in next/app/api/officers/leaves/[id]/route.ts"
```

## Parallel Example: User Story 6

```bash
Task: "T046 [US6] Build the assignment, promotion, and mission timeline UI in next/components/officers/AssignmentTimeline.tsx"
Task: "T048 [US6] Implement assignment update logic with conflict handling in next/app/api/officers/assignments/[id]/route.ts"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup.
2. Complete Phase 2: Foundational prerequisites.
3. Complete Phase 3: User Story 1.
4. Validate `T019` against `specs/005-officers-affairs/quickstart.md`.
5. Demo the officers registry before expanding scope.

### Incremental Delivery

1. Setup + Foundational create the shared officers platform.
2. Deliver US1 for officer registry and search.
3. Deliver US2 for full officer records and documents.
4. Deliver US3 for daily rollcall intake, draft recovery, and reminders.
5. Deliver US4 for commander visibility.
6. Deliver US5 for leave and absence management.
7. Deliver US6 for assignments, promotions, and missions.
8. Finish with Phase 9 polish and build validation.

### Parallel Team Strategy

1. One developer completes Phase 1-2 shared foundations.
2. After that checkpoint:
   - Developer A: US1 -> US2
   - Developer B: US3 -> US4
   - Developer C: US5 -> US6
3. Merge once each story-level validation task passes.

---

## Notes

- `[P]` tasks target different files or stable contracts and are safe parallel candidates.
- User story labels map directly to the six stories in `specs/005-officers-affairs/spec.md`.
- Manual validation tasks are included because the feature docs specify scenario-based verification rather than automated TDD.
- Keep every officers API route aligned with the project rule: auth -> rate limit -> RBAC/role check -> Zod validation -> operation -> audit log -> response.
- Stitch prompt/output notes are required inputs for the final UI implementation, not optional documentation.

---

## Tech Debt Tasks (Generated by /speckit.cleanup)

**Generated**: 2026-04-04
**Source**: Post-implementation cleanup across all specs
**Priority**: Address before next feature iteration

### Detected Issues

- [x] TD001 Replace `alert()` calls in LeaveRegister.tsx:110,116 with inline error UI — resolved in `next/components/officers/LeaveRegister.tsx`
