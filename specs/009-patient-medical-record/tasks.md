# Tasks: Patient Medical Record — الملف الطبي للمريض

**Input**: Design documents from `/specs/009-patient-medical-record/`

**Prerequisites**: plan.md, spec.md, data-model.md, contracts/api-contracts.md

**Tests**: Not explicitly requested — no test tasks included.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: No new project setup needed — existing Next.js project with MongoDB, auth, rate limiting, and audit logging infrastructure is reused.

- [x] T001 [P] Register PatientMedicalRecord export in `next/lib/db/models/index.ts`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core model, Zod validation schemas, and shared utilities that ALL user stories depend on.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [x] T002 Create PatientMedicalRecord Mongoose model in `next/lib/db/models/PatientMedicalRecord.ts` with fields: patientId (unique, indexed), patientName, allergies (string[]), chronicConditions (string[]), bloodType (enum), medicalNotes, severityNotes, version (number, default 0), timestamps. Add `{ patientName: "text" }` index.
- [x] T003 Create Zod validation schemas in `next/lib/validations/medical-record.ts`: bloodTypeEnum (A+, A-, B+, B-, AB+, AB-, O+, O-), patientMedicalRecordSchema (all fields per data-model.md), patientSearchQuerySchema (q: string, limit: number default 20 max 50)
- [x] T004 [P] Create a shared helper function in `next/lib/medical/queries.ts` (or new file) for aggregating medications from MedicalVisit records: given a patient ObjectId, return `{ medicineId, medicineName (full: "name concentration unit"), totalQuantity, lastDispenseDate }[]` by joining MedicalVisit → Medicine

**Checkpoint**: Foundation ready - user story implementation can now begin

---

## Phase 3: User Story 1 - عرض الملف الطبي الكامل للمريض (Priority: P1) 🎯 MVP

**Goal**: Medical staff can click a patient name on the visits list to open a tabbed modal showing visit history (الزيارات), aggregated medications (الأدوية), and medical details (التفاصيل الطبية).

**Independent Test**: Create 3 visits for patient "1234-56" with different diagnoses and dispensed medicines. Open the patient's medical record modal from the visits list. Confirm all 3 visits appear in chronological order, all dispensed medicines are listed with quantities, and medical details fields are displayed (empty if not filled).

### Implementation for User Story 1

- [x] T005 [US1] Create GET `/api/medical/patients/[patientId]/record/route.ts`: authenticate → check `permissions.medical` in `view|edit` → rate limit (read) → find MedicalPatient by patientId (return 404 if not found) → find PatientMedicalRecord (or return null defaults) → aggregate visits (populate patient + medicines) → aggregate medications using helper from T004 → return combined response per Contract 1
- [x] T006 [US1] Create `next/components/medical/VisitsTab.tsx`: client component displaying visit history list in reverse chronological order. Each visit card shows: date, diagnosis, treatment, dispensed medicines list. Internal scroll for long lists. Empty state: "لا توجد زيارات سابقة".
- [x] T007 [US1] Create `next/components/medical/MedicationsTab.tsx`: client component displaying aggregated medication history table/list. Each entry shows: medicine full name (name + concentration + unit), total quantity, last dispense date. Empty state: "لا توجد أدوية سابقة".
- [x] T008 [US1] Create `next/components/medical/MedicalDetailsTab.tsx`: client component displaying patient-level medical details (allergies, chronic conditions, blood type, medical notes, severity notes). Read-only display when `permissions.medical === "view"`. Shows empty/placeholder when fields are not filled.
- [x] T009 [US1] Create `next/components/medical/PatientRecordModal.tsx`: client component using ModalShell with tabbed navigation (3 tabs: الزيارات, الأدوية, التفاصيل الطبية). Accepts `patientId`, `patientName`, `onClose` props. On mount, fetches GET `/api/medical/patients/[patientId]/record`. Passes data to the 3 tab components. Handles loading, error, and empty states. Tab content area scrolls independently (max-height capped).
- [x] T010 [US1] Modify `next/components/medical/VisitTable.tsx` (or the relevant visit table component): make patient name/ID clickable — on click, open PatientRecordModal with the patient's ID. Pass `permissions.medical` from the page to the modal for RBAC-aware rendering.
- [x] T011 [US1] Modify `next/app/(dashboard)/medical/page.tsx`: ensure the page passes the authenticated user's `permissions.medical` to the VisitTable component so the modal can be triggered.

**Checkpoint**: User Story 1 should be fully functional — clicking a patient name opens the modal with all 3 tabs showing data.

---

## Phase 4: User Story 2 - إدارة التفاصيل الطبية للمريض (Priority: P1)

**Goal**: Medical staff with edit permission can add, edit, and save patient-level medical details (allergies, chronic conditions, blood type, notes) from within the modal. Includes optimistic concurrency conflict handling.

**Independent Test**: Open the medical record modal for patient "1234-56". Add an allergy "حساسية من البنسلين". Save and close the modal. Reopen the modal — confirm the allergy is still displayed. Edit the allergy — confirm the update persists.

### Implementation for User Story 2

- [x] T012 [US2] Create PUT `/api/medical/patients/[patientId]/record/route.ts`: authenticate → check `permissions.medical === "edit"` → rate limit (write) → validate body with patientMedicalRecordSchema → find MedicalPatient (404 if not found) → upsert PatientMedicalRecord with optimistic concurrency check (if existing record's version !== submitted version, return 409 with Arabic message + latestData) → increment version on save → logAuditEvent (CREATE or UPDATE, module "medical") → return record with action ("created" or "updated") per Contract 2
- [x] T013 [US2] Update `next/components/medical/MedicalDetailsTab.tsx`: add edit mode when `permissions.medical === "edit"`. Form with inputs for: allergies (multi-tag or textarea, one per line), chronic conditions (multi-tag or textarea), blood type (select with 8 options), medical notes (textarea), severity notes (textarea). Save button calls PUT API with current version. On 409 conflict, show Arabic error message and refresh data from server. On network error, keep modal open with unsaved data and show Arabic error.
- [x] T014 [US2] Update `next/components/medical/PatientRecordModal.tsx`: after a successful save in MedicalDetailsTab, refresh the record data (re-fetch GET) so all tabs reflect the updated information.

**Checkpoint**: User Story 2 should be fully functional — medical details can be edited, saved, and persist across modal reopens. Concurrent edit conflicts show Arabic error.

---

## Phase 5: User Story 3 - البحث والتنقل بين المرضى (Priority: P2)

**Goal**: Staff can search for a patient by patient ID or name from a dedicated page and open their medical record directly, without navigating through the visits list.

**Independent Test**: Open the medical records page (`/medical/patients`), search for "1234-56" (patient ID), click on the result — confirm the medical record modal opens showing the correct patient's data.

### Implementation for User Story 3

- [x] T015 [US3] Create GET `/api/medical/patients/search/route.ts`: authenticate → check `permissions.medical` in `view|edit` → rate limit (read) → parse query params with patientSearchQuerySchema → search MedicalPatient by patientId (regex) and patientName (text search) → limit results → return `{ patientId, patientName }[]` per Contract 3. Return 429 with Arabic message + Retry-After header if rate limited.
- [x] T016 [US3] Create `next/components/medical/PatientSearchModal.tsx`: client component with search input. On typing (debounced 300ms), calls GET `/api/medical/patients/search?q=...`. Displays matching results as a list. Clicking a result opens PatientRecordModal. Shows "لا يوجد مريض بهذا الرقم" when no results. Uses ModalShell pattern.
- [x] T017 [US3] Create `next/app/(dashboard)/medical/patients/page.tsx`: server-rendered page. authenticate → check `permissions.medical` !== "none" (redirect to `/unavailable` if denied). Renders PageContainer with search UI and PatientSearchModal. Add link/tab from the main medical page to this search page.
- [x] T018 [US3] Add a "بحث المرضى" link or tab to `next/app/(dashboard)/medical/page.tsx` navigation (via FolderTabs or equivalent) pointing to `/medical/patients`.

**Checkpoint**: User Story 3 should be fully functional — dedicated patient search page works, results are clickable, and medical record modal opens from search results.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [x] T019 [P] Verify all error messages across all 3 API routes are in Arabic (FR-015)
- [x] T020 [P] Verify RBAC enforcement: view-only users cannot see edit controls in MedicalDetailsTab; users with `permissions.medical === "none"` are redirected from `/medical/patients`
- [x] T021 [P] Verify rate limit responses return HTTP 429 with Arabic message "تم تجاوز الحد المسموح، يرجى المحاولة لاحقاً" and Retry-After header
- [x] T022 [P] Verify audit logging: every PUT (create/update) to medical record logs to AuditLog with module = "medical"
- [x] T023 Test modal layout with 100+ visits — ensure internal scroll works without breaking layout (SC-005)
- [x] T024 Run `npm run build` — verify 0 errors and 0 warnings
- [x] T025 Run `npm run lint` — fix any ESLint violations
- [x] T026 Run quickstart.md validation scenarios (open modal, edit details, test concurrent conflict, test patient search, test RBAC)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion — BLOCKS all user stories
- **User Stories (Phase 3+)**: All depend on Foundational phase completion
  - User stories can then proceed in parallel (if staffed)
  - Or sequentially in priority order (P1 → P2 → P3)
- **Polish (Final Phase)**: Depends on all desired user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational (Phase 2) — No dependencies on other stories
- **User Story 2 (P2)**: Can start after Foundational (Phase 2) — Shares the same modal (T009) and MedicalDetailsTab (T008) created in US1; edit functionality (T012-T014) builds on those
- **User Story 3 (P3)**: Can start after Foundational (Phase 2) — Reuses PatientRecordModal (T009) from US1; independent otherwise

### Within Each User Story

- Models before services
- API routes before UI components that consume them
- Core implementation before integration
- Story complete before moving to next priority

### Parallel Opportunities

- T001 (Setup) can run in parallel with T002-T004 (Foundational)
- T002, T003, T004 (Foundational) can run in parallel — different files
- T005 (API route) and T006-T008 (tab components) can run in parallel within US1
- T015 (search API) and T016 (search modal) can run in parallel within US3
- T019-T022 (Polish verification tasks) can all run in parallel

---

## Parallel Example: Foundational Phase

```bash
# Launch all foundational tasks together:
Task: "Create PatientMedicalRecord Mongoose model in next/lib/db/models/PatientMedicalRecord.ts"
Task: "Create Zod validation schemas in next/lib/validations/medical-record.ts"
Task: "Create shared medication aggregation helper in next/lib/medical/queries.ts"
```

## Parallel Example: User Story 1

```bash
# Launch API route and tab components together:
Task: "Create GET /api/medical/patients/[patientId]/record/route.ts"
Task: "Create next/components/medical/VisitsTab.tsx"
Task: "Create next/components/medical/MedicationsTab.tsx"
Task: "Create next/components/medical/MedicalDetailsTab.tsx"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL — blocks all stories)
3. Complete Phase 3: User Story 1
4. **STOP and VALIDATE**: Click a patient name on the visits list — modal opens with 3 tabs showing visits, medications, and medical details
5. Deploy/demo if ready

### Incremental Delivery

1. Complete Setup + Foundational → Foundation ready
2. Add User Story 1 → Modal opens from visits list, shows all data (read-only) → Deploy/Demo (MVP!)
3. Add User Story 2 → Edit medical details, save, conflict handling → Deploy/Demo
4. Add User Story 3 → Patient search page → Deploy/Demo
5. Each story adds value without breaking previous stories

### Parallel Team Strategy

With multiple developers:

1. Team completes Setup + Foundational together
2. Once Foundational is done:
   - Developer A: User Story 1 (API + modal + tabs)
   - Developer B: User Story 3 (search API + search page) — can start in parallel since it reuses the modal from US1
3. After US1 is done:
   - Developer A or B: User Story 2 (edit functionality + concurrency)
4. Polish phase together

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- The existing `MedicalPatient`, `MedicalVisit`, `Medicine` models are reused WITHOUT modification
- The `PatientMedicalRecord` model creates records on first save (no migration needed)
- All API routes follow the established pattern: `authenticate()` → RBAC → `checkApiRateLimit()` → `connectToDatabase()` → Zod validate → operate → `logAuditEvent()` → respond
- Rate limits: 60 req/min for reads, 20 req/min for writes (spec requirement overrides existing rate-limit.ts defaults — may need a medical-specific rate limit function or adjust the existing one)
- Blood type validation: A+, A-, B+, B-, AB+, AB-, O+, O-
- Concurrent edit: optimistic concurrency with version field — reject stale writes with Arabic 409 message + latestData

---

## Tech Debt Tasks (Generated by /speckit.cleanup)

**Generated**: 2026-05-25
**Source**: Post-implementation cleanup of Patient Medical Record
**Priority**: Address before next feature iteration

### Detected Issues

- [x] TD001 Implement `bloodType` field display and dropdown selection in [MedicalDetailsTab.tsx](file:///home/karim/projects/Elec-Archive/next/components/medical/MedicalDetailsTab.tsx) - currently, it is hardcoded to `undefined` on PUT saves and is completely missing from both edit and view screens. Use the standard `Select Field Pattern` from AGENTS.md.
- [x] TD002 Optimize visits & medication aggregation queries in [queries.ts](file:///home/karim/projects/Elec-Archive/next/lib/medical/queries.ts) and [route.ts](file:///home/karim/projects/Elec-Archive/next/app/api/medical/patients/%5BpatientId%5D/record/route.ts) by pre-fetching all required medicines in a single database query rather than a nested findById loop (Option 1 of tech-debt-report.md).
