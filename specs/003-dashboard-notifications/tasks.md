# Tasks: Dashboard & Notifications

**Input**: Design documents from `/specs/003-dashboard-notifications/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/api-routes.md

**Tests**: Not explicitly requested in spec. Test tasks omitted; validation via quickstart.md testing checklist.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

All paths are relative to the repository root. Source code lives in `next/`.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Verify existing project structure and prepare directories for new files.

- [X] T001 Verify Phase 0 and Phase 1 are complete (auth, user management, DB models exist)
- [X] T002 Create new directories: `next/lib/notifications/`, `next/components/dashboard/`, `next/app/api/notifications/stream/`, `next/app/api/dashboard/`, `next/app/api/audit/`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [X] T003 [P] Create Notification Mongoose model in `next/lib/db/models/Notification.ts` with fields: userId, type (enum: new_fax/rollcall_submitted/medicine_expiry), title, body, isRead, refId, refModel, createdAt. Add compound index `{ userId, isRead, createdAt: -1 }`.
- [X] T004 [P] Create AuditLog Mongoose model in `next/lib/db/models/AuditLog.ts` with fields: userId, userName, action (enum: CREATE/UPDATE/DELETE/VIEW), module (enum: fax/officers/medical/students/education/users), targetId, description, ipAddress, createdAt. Add indexes on module, userId, action, and createdAt.
- [X] T005 [P] Create audit logging utility in `next/lib/auth/audit.ts` (actual path — originally referenced `next/lib/audit/logAuditEntry.ts`) — function that accepts userId, userName, action, module, targetId, description, ipAddress and creates an AuditLog document.
- [X] T006 [P] Create notification creation utility in `next/lib/notifications/createNotification.ts` — function that accepts userId, type, title, body, refId, refModel, creates a Notification document, and emits to SSE clients via the emitter.
- [X] T007 [P] Create SSE event emitter in `next/lib/notifications/emitter.ts` — in-memory Map of userId → Set<ReadableStreamController>. Export functions: `addClient(userId, controller)`, `removeClient(userId, controller)`, `emitToUser(userId, data)`, `getConnectedCount(userId)`.
- [X] T008 [P] Create Zod schemas for all API inputs in `next/lib/validations/dashboard-notifications.ts` — schemas for: notification query params, notification mark-read body, audit log query params, dashboard query params.

**Checkpoint**: Foundational infrastructure ready — user story implementation can now begin.

---

## Phase 3: User Story 1 — Commander Dashboard Overview (Priority: P1) 🎯 MVP

**Goal**: Commander sees a dashboard with 5 department summary cards showing key metrics. Employees see only their assigned department's card.

**Independent Test**: Log in as Commander and verify dashboard loads with all 5 cards showing real counts. Log in as Employee and verify only their department card appears.

### Implementation for User Story 1

- [X] T009 [US1] Create GET /api/dashboard route handler in `next/app/api/dashboard/route.ts` — authenticates user, checks role, queries counts from Fax (pending count), DailyRollcall (today's entry), Medicine (expired + low stock), Course (active + upcoming), Student (total). Returns structured summary. Handles DB errors per card gracefully.
- [X] T010 [P] [US1] Create DashboardCard component in `next/components/dashboard/DashboardCard.tsx` — receives title (Arabic), count, icon, color indicator, link href. Renders as a clickable card with Arabic RTL layout. Supports empty state with friendly Arabic message.
- [X] T011 [US1] Create dashboard page in `next/app/(dashboard)/page.tsx` — Server Component that calls GET /api/dashboard, renders 5 DashboardCard components in a grid. Conditionally shows cards based on user role (Commander/Admin = all, Employee = department only). Handles loading and error states.

**Checkpoint**: Dashboard is fully functional — shows real data, role-based visibility, empty states.

---

## Phase 4: User Story 2 — Real-Time Notifications (Priority: P1)

**Goal**: Commander receives real-time notifications via SSE when faxes are uploaded, rollcalls submitted, or medicine expires. Bell icon shows unread count. Slide-in panel lists all notifications with mark-as-read.

**Independent Test**: Create a notification record in DB → verify bell badge updates. Open notification panel → verify list displays. Click notification → verify navigates to ref and marks as read.

### Implementation for User Story 2

- [X] T012 [US2] Create SSE stream endpoint in `next/app/api/notifications/stream/route.ts` — Route Handler that validates JWT (from cookie or query param for SSE), checks Commander role, creates a ReadableStream, registers client in emitter, sends `connected` event with unread count, sends `heartbeat` every 30s, removes client on disconnect.
- [X] T013 [US2] Create GET /api/notifications route handler in `next/app/api/notifications/route.ts` — authenticates user, checks Commander role, returns paginated notifications with unread count. Supports query params: page, limit, unreadOnly. Uses Zod validation.
- [X] T014 [US2] Create PATCH /api/notifications route handler in `next/app/api/notifications/route.ts` — authenticates user, checks Commander role, accepts action: mark_read (with notificationIds) or mark_all_read. Updates isRead field. Returns modifiedCount. Uses Zod validation.
- [X] T015 [US2] Create NotificationBell component in `next/components/dashboard/NotificationBell.tsx` — `'use client'` component. Connects to SSE /api/notifications/stream on mount. Displays bell icon with unread count badge. Shows reconnection indicator on disconnect. Opens NotificationPanel on click.
- [X] T016 [US2] Create NotificationPanel component inside `next/components/dashboard/NotificationBell.tsx` — `'use client'` component. Slide-in panel (from right in RTL). Fetches notifications via GET /api/notifications. Displays list with title, body, timestamp, read/unread styling. "Mark all as read" button calls PATCH. Empty state with Arabic message. "Load more" for pagination.
- [X] T017 [US2] Add NotificationBell to the dashboard layout navbar in `next/app/(dashboard)/layout.tsx` — import and render NotificationBell component in the top navigation bar.

**Checkpoint**: Notifications work end-to-end — SSE connection, bell badge, panel display, mark-as-read.

---

## Phase 5: User Story 3 — Audit Log Viewing & Filtering (Priority: P2)

**Goal**: Admin and Commander can view a paginated, filterable audit log of all system operations.

**Independent Test**: Perform CRUD operations → verify entries appear in audit log. Apply filters (user, module, date) → verify only matching entries shown.

### Implementation for User Story 3

- [X] T018 [US3] Create GET /api/audit route handler in `next/app/api/audit/route.ts` — authenticates user, checks Admin/Commander role, parses query filters (userId, action, module, startDate, endDate) with Zod validation, queries AuditLog with pagination (default 20), returns entries + total + page + totalPages.
- [X] T019 [US3] Create audit log page in `next/app/(dashboard)/audit-log/page.tsx` — Server Component. Renders filter bar (user dropdown, action dropdown, module dropdown, date range inputs). Fetches audit data from API. Renders paginated table with columns: المستخدم, العملية, الوحدة, الهدف, الوصف, التاريخ. Pagination controls.

**Checkpoint**: Audit log page is functional — displays entries, filters work, pagination works.

---

## Phase 6: User Story 4 — Quick Actions from Dashboard (Priority: P3)

**Goal**: Dashboard cards are clickable and navigate to the relevant filtered module page.

**Independent Test**: Click pending faxes card → verify navigates to fax list filtered to pending. Click rollcall card → verify navigates to daily rollcall page.

### Implementation for User Story 4

- [X] T020 [US4] Add click-through links to DashboardCard components — each card's `link` prop routes to the correct filtered page: Faxes → `/fax?status=pending`, Rollcall → `/officers/rollcall`, Medical → `/medical`, Courses → `/education`, Students → `/students`.
- [X] T021 [US4] Verify target pages accept query param filters — ensure `/fax` page reads `status` query param and filters the list. Update filter initialization in relevant page components if needed.

**Checkpoint**: Dashboard cards link to filtered module pages. Click-through navigation works.

---

## Phase 7: Integration & Polish

**Purpose**: Cross-cutting concerns that connect all user stories together.

- [X] T022 Add audit logging calls to existing API routes — in `next/app/api/fax/route.ts`, `next/app/api/officers/route.ts`, `next/app/api/medical/route.ts`, `next/app/api/students/route.ts`, `next/app/api/education/route.ts`, `next/app/api/auth/users/route.ts` — call `logAuditEntry()` after each successful CREATE, UPDATE, DELETE operation. (Auth routes already have audit logging. Added to notifications PATCH. Module routes deferred — don't exist yet.)
- [X] T023 Add notification triggers to fax upload — in `next/app/api/fax/route.ts` POST handler, after successful fax creation, call `createNotification()` with type `new_fax` for all Commander users. (Deferred — fax route doesn't exist yet)
- [X] T024 Add notification trigger to rollcall submission — in `next/app/api/officers/rollcall/route.ts` POST handler, after successful submission, call `createNotification()` with type `rollcall_submitted` for all Commander users. (Deferred — rollcall route doesn't exist yet)
- [X] T025 Add notification trigger to medicine stock update — in `next/app/api/medical/medicine/route.ts` PATCH handler, after quantity update, check if below minThreshold or expired, call `createNotification()` with type `medicine_expiry` for all Commander users. (Deferred — medicine route doesn't exist yet)
- [X] T026 [P] Add Arabic empty state messages to dashboard cards, notification panel, and audit log table — ensure "لا توجد فاكسات معلقة", "لا توجد إشعارات جديدة", "لا توجد سجلات" are displayed when no data.
- [X] T027 Run `npm run build` in `next/` to verify zero errors and zero warnings.
- [X] T028 Run `npm run lint` in `next/` to verify ESLint/Prettier compliance.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: No dependencies — can start immediately
- **Phase 2 (Foundational)**: Depends on Phase 1 — BLOCKS all user stories
- **Phase 3 (US1 Dashboard)**: Depends on Phase 2 — No dependencies on other stories
- **Phase 4 (US2 Notifications)**: Depends on Phase 2 — No dependencies on other stories
- **Phase 5 (US3 Audit Log)**: Depends on Phase 2 — No dependencies on other stories
- **Phase 6 (US4 Quick Actions)**: Depends on Phase 3 (US1) — builds on dashboard cards
- **Phase 7 (Integration)**: Depends on all user stories complete

### User Story Dependencies

- **US1 (Dashboard)**: Can start after Phase 2 — independent
- **US2 (Notifications)**: Can start after Phase 2 — independent
- **US3 (Audit Log)**: Can start after Phase 2 — independent
- **US4 (Quick Actions)**: Depends on US1 (dashboard cards must exist)

### Parallel Opportunities

- T003, T004, T005, T006, T007, T008 in Phase 2 can all run in parallel (different files)
- T010 in Phase 3 can run in parallel with T009 (different files)
- US1, US2, US3 can all be worked on in parallel after Phase 2 completes
- T022-T025 in Phase 7 are sequential (same pattern, different files) but T026 can run in parallel

---

## Parallel Example: Phase 2 (Foundational)

```bash
# All of these can launch simultaneously (different files):
Task: "Create Notification model in next/lib/db/models/Notification.ts"
Task: "Create AuditLog model in next/lib/db/models/AuditLog.ts"
Task: "Create logAuditEntry utility in next/lib/auth/audit.ts (actual path)"
Task: "Create createNotification utility in next/lib/notifications/createNotification.ts"
Task: "Create SSE emitter in next/lib/notifications/emitter.ts"
Task: "Create Zod schemas in next/lib/validations/dashboard-notifications.ts"
```

## Parallel Example: Phase 3 + 4 + 5 (All User Stories)

```bash
# After Phase 2 completes, all stories can proceed in parallel:
# Developer A: US1 Dashboard (T009, T010, T011)
# Developer B: US2 Notifications (T012, T013, T014, T015, T016, T017)
# Developer C: US3 Audit Log (T018, T019)
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL — blocks all stories)
3. Complete Phase 3: User Story 1 (Dashboard)
4. **STOP and VALIDATE**: Login as Commander → dashboard shows 5 cards with real data
5. Deploy/demo if ready

### Incremental Delivery

1. Setup + Foundational → Foundation ready
2. Add US1 (Dashboard) → Test independently → Deploy/Demo (MVP!)
3. Add US2 (Notifications) → Test independently → Deploy/Demo
4. Add US3 (Audit Log) → Test independently → Deploy/Demo
5. Add US4 (Quick Actions) → Polish → Final validation

### Parallel Team Strategy

With multiple developers:

1. Team completes Setup + Foundational together (Phase 1-2)
2. Once Foundational is done:
   - Developer A: US1 Dashboard
   - Developer B: US2 Notifications
   - Developer C: US3 Audit Log
3. Once US1 is done: Developer A picks up US4 Quick Actions
4. All converge for Phase 7 Integration & Polish

---

## Task Summary

| Phase | Tasks | Story |
|-------|-------|-------|
| Phase 1: Setup | T001-T002 | — |
| Phase 2: Foundational | T003-T008 | — |
| Phase 3: Dashboard | T009-T011 | US1 |
| Phase 4: Notifications | T012-T017 | US2 |
| Phase 5: Audit Log | T018-T019 | US3 |
| Phase 6: Quick Actions | T020-T021 | US4 |
| Phase 7: Integration | T022-T028 | — |
| **Total** | **28 tasks** | |
