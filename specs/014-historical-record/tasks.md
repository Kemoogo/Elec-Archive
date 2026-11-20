# Tasks: منظومة السجل التاريخي للوحدة وحوكمة حماية البيانات التاريخية (Phase 5)

**Input**: Design documents from `/specs/014-historical-record/`  
**Prerequisites**: [plan.md](file:///home/karim/projects/Elec-Archive/specs/014-historical-record/plan.md), [spec.md](file:///home/karim/projects/Elec-Archive/specs/014-historical-record/spec.md), [research.md](file:///home/karim/projects/Elec-Archive/specs/014-historical-record/research.md), [data-model.md](file:///home/karim/projects/Elec-Archive/specs/014-historical-record/data-model.md), [contracts/historical-record-api.md](file:///home/karim/projects/Elec-Archive/specs/014-historical-record/contracts/historical-record-api.md)

**Tests**: Verification scripts and type/lint checks are included in the Governance & Polish phases; TDD unit test suites were not requested in the specification.

**Organization**: Tasks are grouped by user story (`US1`–`US4`) to enable independent implementation and testing of each increment.

---

## Phase 1: Setup (Shared Types, Constants & Storage Structure)

**Purpose**: Establish centralized domain types, shared constants, and local upload directory paths before model and API development.

- [X] T001 Create centralized Historical Record domain types and DTOs (no `any`) in `next/types/historical-record.ts`
- [X] T002 Re-export Historical Record types from `next/types/index.ts`
- [X] T003 [P] Create shared milestone category constants and Arabic labels in `next/lib/db/models/UnitHistoricalInfo.shared.ts`
- [X] T004 [P] Ensure local upload directories exist for `visits`, `commanders`, `unit`, and `milestones` under `next/public/uploads/historical-record/`

---

## Phase 2: Foundational (RBAC, Auth, Navigation, Validations & Shared Helpers)

**Purpose**: Core security, RBAC (`historical_record`), navigation, validation schemas, file storage, and shared UI infrastructure that MUST be complete before any user story phase.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [X] T005 Add `historical_record` permission field (`"none" | "view" | "edit"`, default `"none"`) to `next/lib/db/models/User.ts`
- [X] T006 [P] Add `"historical_record"` to `AuditModule` type and enum in `next/lib/db/models/AuditLog.ts`
- [X] T007 [P] Add `historical_record` to `ModulePermissions` in `next/lib/auth/types.ts`
- [X] T008 Update session hydration with safe fallback (`?? "none"`) in `next/lib/auth/middleware.ts`
- [X] T009 Update `hasModuleAccess` so `commander` automatically receives `"view"` and `"edit"` access for `historical_record` in `next/lib/auth/rbac.ts`
- [X] T010 [P] Add `historical_record` with `.default("none")` to `permissionsSchema` in `next/lib/validations/auth.ts`
- [X] T011 [P] Add `"historical_record"` to `AUDIT_MODULES` in `next/lib/validations/audit.ts` and `auditQuerySchema` in `next/lib/validations/dashboard-notifications.ts`
- [X] T012 [P] Register `"historical_record"` (`"السجل التاريخي"`) in `MODULES`, `MODULE_CONFIG`, and commander default permissions in `next/components/admin/create-user-modal.tsx` and ensure safe `"none"` fallback when hydrating legacy users in `next/components/admin/edit-user-modal.tsx`
- [X] T013 [P] Add `"historical_record": "السجل التاريخي"` label mapping in `next/components/dashboard/AuditLogPageClient.tsx` and `next/components/dashboard/AuditLogTable.tsx`
- [X] T014 [P] Register `"historical_record"` in `moduleRoutes` in `next/app/(dashboard)/layout.tsx`, `moduleLabels` / route mapping in `next/components/layout/AuthenticatedNavbar.tsx`, and normalize single-module route redirect (`replace("_", "-")`) plus `historical_record` card/handling in `next/app/(dashboard)/page.tsx`
- [X] T015 Create strict RBAC helpers (`canViewHistoricalRecord`, `canAddHistoricalRecord`, `canMutateOrDeleteHistoricalRecord`) in `next/lib/historical-record/access.ts`
- [X] T016 Create Zod 4 validation schemas for visits, commanders, unit profile, milestones, query params, photo limits (max 10 MB per image, max 10 photos per visit/milestone), and mandatory Admin governance reason in `next/lib/validations/historical-record.ts`
- [X] T017 Create local image upload, magic-byte validation, 10 MB per-file & max 10 photos enforcement, officer photo physical copy, and safe unlink helpers in `next/lib/historical-record/uploads.ts`
- [X] T018 [P] Create Arabic command duration calculator (`calculateCommandDuration`, returning `"يوم واحد"` when `startDate === endDate`) in `next/lib/historical-record/duration.ts`
- [X] T019 Create server DTO serializers, regex search filter builder, and commander interval overlap checker in `next/lib/historical-record/queries.ts`
- [X] T020 [P] Add optional backwards-compatible `searchable` and `searchPlaceholder` props to `next/components/ui/custom-select.tsx`
- [X] T021 [P] Create offline interactive `PhotoLightboxModal` using `ModalShell` (no `backdrop-blur`) in `next/components/historical-record/PhotoLightboxModal.tsx`
- [X] T022 [P] Create reusable `HistoricalGovernanceModal` for Admin-only double confirmation with mandatory reason input in `next/components/historical-record/HistoricalGovernanceModal.tsx`

**Checkpoint**: Foundation ready — user story implementation can now begin in priority order.

---

## Phase 3: User Story 1 - توثيق واستعراض الزيارات الهامة للوحدة (Priority: P1) 🎯 MVP

**Goal**: Enable authorized users to record Important Visits with dates, visitor/delegation details, and multiple locally stored photos (JPG/PNG/WebP), and browse them in a chronological timeline with newest/oldest toggle, debounced search, year filter, and interactive Lightbox gallery.

**Independent Test**: Open `/historical-record` (Tab 1: الزيارات الهامة), add a visit with 2 photos, verify newest-first timeline ordering, toggle to oldest-first, open Lightbox, test 500ms debounced search (`>= 2` chars / immediate `Enter`) + year filter, and confirm local files exist under `next/public/uploads/historical-record/visits/`.

### Implementation for User Story 1

- [X] T023 [P] [US1] Create `HistoricalVisit` Mongoose schema and indexes in `next/lib/db/models/HistoricalVisit.ts` and export it from `next/lib/db/models/index.ts`
- [X] T024 [US1] Implement `GET` (search, year filter, sortOrder) and `POST` (multipart multi-photo upload + AuditLog `CREATE`) handlers in `next/app/api/historical-record/visits/route.ts`
- [X] T025 [US1] Implement Admin-only `PATCH` (with double-confirm flag, mandatory reason, photo keep/add/unlink) and `DELETE` (mandatory reason + photo cleanup + AuditLog) handlers in `next/app/api/historical-record/visits/[id]/route.ts`
- [X] T026 [P] [US1] Build `HistoricalVisitModal` (Add + Admin-Edit modes using `ModalShell`, `ModalActions`, `DateField`, multi-photo picker with 10 MB/file & max 10 photos client validation; routes Admin `PATCH` edits through `HistoricalGovernanceModal` for double confirmation + mandatory reason) in `next/components/historical-record/HistoricalVisitModal.tsx`
- [X] T027 [US1] Build `HistoricalVisitsTab` (visual timeline, sort toggle, 500ms debounced search with `>= 2` chars guard, immediate `Enter` trigger, and `AbortController`, year filter via `CustomSelect`, thumbnail gallery + Lightbox trigger, Admin-only Edit/Delete buttons) in `next/components/historical-record/HistoricalVisitsTab.tsx`
- [X] T028 [US1] Build main `FolderTabs` container `HistoricalRecordClient` with URL `?tab=visits|commanders|unit-info` query synchronization in `next/components/historical-record/HistoricalRecordClient.tsx`
- [X] T029 [US1] Build SSR-first page component authenticating, verifying `canViewHistoricalRecord`, reading initial `tab` query param, fetching initial data, and rendering `HistoricalRecordClient` in `next/app/(dashboard)/historical-record/page.tsx`

**Checkpoint**: User Story 1 (MVP) is complete and independently testable at `/historical-record?tab=visits`.

---

## Phase 4: User Story 2 - توثيق قادة المركز والوحدة وحماية اللقطة المستقلة (Priority: P1)

**Goal**: Enable authorized users to record unit commanders linked to the full `/officers` registry (`isInUnit: true | false`), automatically calculate command duration, prevent overlapping tenures, atomically close the previous current commander when appointing a new `isCurrent` commander, and protect saved records and copied photos from any future changes or deletions in `/officers`.

**Independent Test**: Open `/historical-record?tab=commanders`, verify `CustomSelect` lists both active and archived officers, add Commander A as `isCurrent` (verifying photo copy to `public/uploads/historical-record/commanders/`), add Commander B as `isCurrent` (verifying mandatory atomic closure of Commander A's `endDate`), test overlap rejection (`409`), then modify/delete Commander A in `/officers` and verify the historical record and photo remain untouched.

### Implementation for User Story 2

- [X] T030 [P] [US2] Create `HistoricalCommander` Mongoose schema with immutable `officerSnapshot` and partial unique index on `isCurrent: true` in `next/lib/db/models/HistoricalCommander.ts` and export it from `next/lib/db/models/index.ts`
- [X] T031 [P] [US2] Implement `GET` endpoint returning ALL officers (`isInUnit: true | false`) for the commander selector in `next/app/api/historical-record/officers-options/route.ts`
- [X] T032 [US2] Implement `GET` (timeline + current commander + filters) and `POST` (snapshot copy, physical photo copy/custom upload, date & overlap validation, atomic previous `isCurrent` closure + rollback, AuditLog) handlers in `next/app/api/historical-record/commanders/route.ts`
- [X] T033 [US2] Implement Admin-only `PATCH` (editable dates, notes, `officerSnapshot`, photo replacement/removal, overlap check, mandatory reason) and `DELETE` (mandatory reason + isolated commander photo cleanup + AuditLog) handlers in `next/app/api/historical-record/commanders/[id]/route.ts`
- [X] T034 [P] [US2] Build `HistoricalCommanderModal` (Add + Admin-Edit modes: `CustomSelect` searchable officer list in Add mode, `DateField` for `startDate`/`endDate`, `isCurrent` toggle, conditional `previousCommanderEndDate` field when replacing an active commander, live duration preview, custom photo upload/removal; Admin-Edit mode supports editing `officerSnapshot` fields (`militaryId`, `fullName`, `rank`, `seniorityNumber`) and gracefully handles records whose `officerId` is absent from `officers-options`, routing Admin `PATCH` edits through `HistoricalGovernanceModal`) in `next/components/historical-record/HistoricalCommanderModal.tsx`
- [X] T035 [US2] Build `HistoricalCommandersTab` (featured current commander card, chronological timeline, sort toggle, 500ms debounced search with `>= 2` chars guard, immediate `Enter` trigger, and `AbortController`, year & status filters, Admin-only Edit/Delete) in `next/components/historical-record/HistoricalCommandersTab.tsx`
- [X] T036 [US2] Wire Tab 2 (`HistoricalCommandersTab`) and initial SSR commanders data into `next/components/historical-record/HistoricalRecordClient.tsx` and `next/app/(dashboard)/historical-record/page.tsx`

**Checkpoint**: User Stories 1 and 2 work independently with full snapshot isolation verified against `/officers`.

---

## Phase 5: User Story 3 - عرض وإدارة معلومات الوحدة ومحطاتها التاريخية (Priority: P1)

**Goal**: Provide a static Unit Profile reference card at the top of Tab 3 (editable by `Admin` only — initial creation without reason, subsequent edits with double confirmation + reason) followed by a chronological timeline of categorized historical unit milestones with optional multi-photo attachments.

**Independent Test**: Open `/historical-record?tab=unit-info`, initialize the Unit Profile card as `Admin` (logged as `CREATE`), edit it again (verifying double confirmation + reason + `UPDATE` AuditLog), add historical milestones across categories with photos, and test category/year filters, debounced search, sort toggle, and Lightbox.

### Implementation for User Story 3

- [X] T037 [P] [US3] Create `UnitHistoricalProfile` (singleton) and `UnitHistoricalMilestone` Mongoose schemas in `next/lib/db/models/UnitHistoricalInfo.ts` and export them from `next/lib/db/models/index.ts`
- [X] T038 [US3] Implement `GET` and Admin-only `PUT` (first-time `CREATE` vs subsequent `UPDATE` requiring double-confirm + reason, emblem upload/cleanup under `unit/`, AuditLog) handlers in `next/app/api/historical-record/unit-profile/route.ts`
- [X] T039 [US3] Implement `GET` (search, year, category filter, sortOrder) and `POST` (multi-photo upload under `milestones/` + AuditLog `CREATE`) handlers in `next/app/api/historical-record/milestones/route.ts`
- [X] T040 [US3] Implement Admin-only `PATCH` (double-confirm + reason + photo keep/add/unlink) and `DELETE` (mandatory reason + photo cleanup + AuditLog) handlers in `next/app/api/historical-record/milestones/[id]/route.ts`
- [X] T041 [P] [US3] Build Admin-only `UnitProfileModal` (initial setup without reason vs subsequent `PUT` updates routed through `HistoricalGovernanceModal` for double confirmation + mandatory reason, `DateField` for `foundingDate`, emblem upload) in `next/components/historical-record/UnitProfileModal.tsx`
- [X] T042 [P] [US3] Build `HistoricalMilestoneModal` (Add + Admin-Edit modes with `CustomSelect` category, `DateField`, multi-photo upload with 10 MB/file & max 10 photos client validation; routes Admin `PATCH` edits through `HistoricalGovernanceModal`) in `next/components/historical-record/HistoricalMilestoneModal.tsx`
- [X] T043 [US3] Build `HistoricalUnitInfoTab` (Unit Profile hero card with Admin-only Edit CTA + empty state, followed by Milestones timeline, category/year filters, 500ms debounced search with `>= 2` chars guard, immediate `Enter` trigger, and `AbortController`, sort toggle, Lightbox) in `next/components/historical-record/HistoricalUnitInfoTab.tsx`
- [X] T044 [US3] Wire Tab 3 (`HistoricalUnitInfoTab`) and initial SSR unit profile & milestones data into `next/components/historical-record/HistoricalRecordClient.tsx` and `next/app/(dashboard)/historical-record/page.tsx`

**Checkpoint**: All three tabs of `/historical-record` are fully implemented and independently functional.

---

## Phase 6: User Story 4 - حوكمة حماية البيانات التاريخية والصلاحيات المستقلة (Priority: P1)

**Goal**: Verify and harden the strict governance boundaries across all UI tabs, Admin user management, AuditLog recording, and API endpoints so non-Admin `edit` users cannot see or invoke Edit/Delete actions, Admin mutations always require double confirmation + mandatory reason, and Officer deletion/updates never cascade to `HistoricalCommander`.

**Independent Test**: Run automated verification script + manual multi-role test across `none`, `view`, `edit` (Employee & Commander), and `Admin` accounts; verify HTTP `403` on non-Admin `PATCH`/`DELETE`/`PUT`, verify double-confirmation & reason enforcement, verify `AuditLog` entries with valid `ObjectId` `targetId`, and verify non-cascading isolation after officer deletion.

### Implementation for User Story 4

- [X] T045 [US4] Audit and enforce `isAdmin`-only UI gating for all Edit/Delete buttons and `HistoricalGovernanceModal` double-confirmation flows across `next/components/historical-record/HistoricalVisitsTab.tsx`, `HistoricalCommandersTab.tsx`, and `HistoricalUnitInfoTab.tsx`
- [X] T046 [US4] Verify `next/app/api/officers/[id]/route.ts` (`PATCH` and `DELETE`) and `next/app/api/officers/[id]/photo/route.ts` contain zero cascading references or file deletions affecting `HistoricalCommander` or `public/uploads/historical-record/`
- [X] T047 [US4] Create verification script covering RBAC separation (`none`/`view`/`edit`/`admin`/`commander`), overlap validation, atomic previous commander closure, and snapshot isolation in `next/scripts/verify-historical-record.ts`

**Checkpoint**: Governance rules, RBAC isolation, AuditLog coverage, and snapshot immutability are verified end-to-end.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Design system audit, TypeScript/ESLint quality gates, AST index update, and quickstart validation.

- [X] T048 [P] Audit all `next/components/historical-record/*.tsx` and `next/app/(dashboard)/historical-record/page.tsx` files against `/theme-playground` Sapphire Archive rules (zero `backdrop-blur`, zero `amber/orange/yellow`, zero `text-slate-500`, zero `any`, full `dir="rtl"`, no A4 print models)
- [X] T049 Run `npx tsc --noEmit` and `npm run lint` in `next/` and fix any strict type or lint issues
- [ ] T050 Run `npx tsx scripts/verify-historical-record.ts` (or equivalent verification) and validate all scenarios in `specs/014-historical-record/quickstart.md` *(automated script `verify-historical-record.ts` and unauthenticated SSR/API HTTP checks passed; authenticated multi-role browser E2E scenarios in `quickstart.md` remain for interactive QA)*
- [X] T051 Run `graphify auto-update .` from repository root to synchronize `graphify-out/graph.json`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately.
- **Foundational (Phase 2)**: Depends on Phase 1 (`T001`–`T004`) — **BLOCKS** all user story phases (`US1`–`US4`).
- **User Stories (Phases 3–5)**: All depend on Phase 2 completion; `US1` (Visits), `US2` (Commanders), and `US3` (Unit Info & Milestones) can proceed sequentially in priority order or in parallel after `T028`–`T029` establish the `/historical-record` page shell.
- **Governance Hardening (Phase 6 / US4)**: Depends on `US1`–`US3` UI tabs and API routes being in place for end-to-end audit and verification.
- **Polish (Phase 7)**: Depends on all phases being complete.

### User Story Dependencies

- **US1 (Important Visits)**: Independent after Phase 2; introduces `HistoricalRecordClient.tsx` and `/historical-record/page.tsx` shell (`T028`–`T029`).
- **US2 (Commanders & Snapshot Protection)**: Independent backend/components after Phase 2 (`T030`–`T035`); wires into `HistoricalRecordClient.tsx` / `page.tsx` (`T036`).
- **US3 (Unit Info & Milestones)**: Independent backend/components after Phase 2 (`T037`–`T043`); wires into `HistoricalRecordClient.tsx` / `page.tsx` (`T044`).
- **US4 (Governance & Isolation)**: Audits and verifies `US1`–`US3` + `/officers` isolation (`T045`–`T047`).

### Parallel Opportunities

- **Phase 1**: `T003` and `T004` in parallel after `T001`.
- **Phase 2**: `T006`, `T007`, `T010`, `T011`, `T012`, `T013`, `T014`, `T018`, `T020`, `T021`, `T022` touch independent files and can run in parallel.
- **US1**: `T023` (model) and `T026` (visit modal) in parallel; then API routes (`T024`, `T025`) and tab/page (`T027`–`T029`).
- **US2**: `T030` (model), `T031` (officers-options API), and `T034` (commander modal) in parallel.
- **US3**: `T037` (models), `T041` (unit profile modal), and `T042` (milestone modal) in parallel.

---

## Parallel Example: User Story 2 (Commanders)

```bash
# Run independent schema, lookup API, and modal tasks in parallel:
Task T030: "Create HistoricalCommander Mongoose schema in next/lib/db/models/HistoricalCommander.ts"
Task T031: "Implement GET /api/historical-record/officers-options/route.ts"
Task T034: "Build HistoricalCommanderModal in next/components/historical-record/HistoricalCommanderModal.tsx"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1 (Setup) + Phase 2 (Foundational RBAC, Auth, AuditLog, Helpers, Governance & Lightbox Modals).
2. Complete Phase 3 (US1: Important Visits + `/historical-record` SSR page & `FolderTabs` shell).
3. **STOP and VALIDATE**: Test `/historical-record?tab=visits` end-to-end (upload, timeline, Lightbox, debounced search, Admin edit/delete with reason).

### Incremental Delivery

1. Setup + Foundational → Core security & shared UI ready.
2. Add US1 (Important Visits) → Deployable MVP.
3. Add US2 (Unit Commanders + Immutable Snapshot + Atomic Previous Closure) → Test snapshot isolation against `/officers`.
4. Add US3 (Unit Profile Card + Milestones Timeline) → Complete functional scope.
5. Complete Phase 6 (US4 Governance Audit & Verification Script) + Phase 7 (Sapphire Archive audit, `tsc --noEmit`, `npm run lint`, `graphify auto-update .`).
