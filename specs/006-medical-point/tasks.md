# Tasks: النقطة الطبية — Medical Point Module

**Input**: Design documents from `/specs/006-medical-point/`
**Prerequisites**: plan.md ✅, spec.md ✅, research.md ✅, data-model.md ✅, contracts/api.md ✅

**Tests**: Manual QA via browser (no automated test framework in project).

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Directory structure and module scaffolding

- [x] T001 Create medical API directory `next/app/api/medical/`
- [x] T002 Create medical pages directory `next/app/(dashboard)/medical/`
- [x] T003 Create medical components directory `next/components/medical/`
- [x] T004 Create medical lib directory `next/lib/medical/`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Model updates required before ANY user story can function

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [x] T005 Remove `unique: true` from `patientId` in `next/lib/db/models/Patient.ts` (line 20) — spec allows duplicate patient IDs across visits
- [x] T006 Add `low_stock` to `NotificationType` union and enum in `next/lib/db/models/Notification.ts` — required for US4 notifications

**Checkpoint**: Models updated — user story implementation can now begin

---

## Phase 3: User Story 1 — تسجيل زيارة طبية وصرف دواء (Priority: P1) 🎯 MVP

**Goal**: Staff can create a medical visit record, dispense medicine with automatic stock reduction, and view the visits list. Insufficient stock and expired medicine are blocked with Arabic errors.

**Independent Test**: Create a medicine with quantity=10, then create a visit dispensing 3 units. Confirm the medicine quantity drops to 7. Try dispensing 8 more (only 7 left) — confirm the system rejects it with an Arabic stock error.

### Implementation for User Story 1

- [x] T007 [P] [US1] Create Zod validation schemas for visits in `next/lib/validations/medical.ts` — createVisitSchema (patientId, patientName, diagnosis, treatment, dispensedMedicines), visitListQuerySchema (page, limit, search, dateFrom, dateTo)
- [x] T008 [P] [US1] Implement atomic stock reduction logic in `next/lib/medical/stock.ts` — dispenseMedicine() using findOneAndUpdate with `quantity: { $gte: N }` guard, expiry date check before dispense
- [x] T009 [US1] Implement GET `/api/medical` route in `next/app/api/medical/route.ts` — list visits with search/filter/pagination, auth check `permissions.medical` in `view|edit`, audit log VIEW
- [x] T010 [US1] Implement POST `/api/medical` route in `next/app/api/medical/route.ts` — create visit with atomic dispense, auth check `permissions.medical === "edit"`, validate with Zod, block insufficient stock (Arabic error), block expired medicine (Arabic error), audit log CREATE
- [x] T011 [US1] Implement GET `/api/medical/[id]` route in `next/app/api/medical/[id]/route.ts` — single visit details with populated medicine names
- [x] T012 [US1] Generate visits list page via Stitch MCP in `next/app/(dashboard)/medical/visits/page.tsx` — Arabic RTL table with search, date filter, pagination, "زيارة جديدة" button
- [x] T013 [US1] Generate new visit form page via Stitch MCP in `next/app/(dashboard)/medical/visits/new/page.tsx` — Arabic RTL form with patient fields, medicine selector with quantity, dispense list, save button

**Checkpoint**: US1 fully functional — create visits, dispense medicine, view visits list

---

## Phase 4: User Story 2 — إدارة المخزون الدوائي (Priority: P1)

**Goal**: Staff can view all medicines with stock levels, add new medicines, update quantities (restocking), and delete medicines (blocked if visit references exist). Low-stock and expired items show warning badges.

**Independent Test**: Add 5 medicines with varying quantities and expiry dates. Confirm the inventory table shows all of them. Set one medicine's quantity below its threshold — confirm it shows a low-stock warning badge. Set one expiry date in the past — confirm it shows an expired badge.

### Implementation for User Story 2

- [x] T014 [US2] Create Zod validation schemas for medicines in `next/lib/validations/medical.ts` — createMedicineSchema (name, unit, quantity, expiryDate, minThreshold), updateMedicineSchema (all optional)
- [x] T015 [US2] Implement GET `/api/medical/medicines` route in `next/app/api/medical/medicines/route.ts` — list all medicines with computed isLowStock and isExpired flags, auth check `permissions.medical` in `view|edit`
- [x] T016 [US2] Implement POST `/api/medical/medicines` route in `next/app/api/medical/medicines/route.ts` — add new medicine, auth check `permissions.medical === "edit"`, validate with Zod, audit log CREATE
- [x] T017 [US2] Implement PUT `/api/medical/medicines/[id]` route in `next/app/api/medical/medicines/[id]/route.ts` — update medicine fields (restock), auth check `permissions.medical === "edit"`, validate with Zod, audit log UPDATE
- [x] T018 [US2] Implement DELETE `/api/medical/medicines/[id]` route in `next/app/api/medical/medicines/[id]/route.ts` — delete medicine, block if visit references exist via `Patient.countDocuments({ "dispensedMedicines.medicineId": id })`, Arabic error, audit log DELETE
- [x] T019 [US2] Generate medicine inventory page via Stitch MCP in `next/app/(dashboard)/medical/medicines/page.tsx` — Arabic RTL table with badges (low-stock/expired), CRUD actions, "إضافة دواء" button

**Checkpoint**: US2 fully functional — medicine CRUD with stock management and warning badges

---

## Phase 5: User Story 3 — لوحة تحكم النقطة الطبية (Priority: P2)

**Goal**: Staff and commanders can open the medical dashboard to see today's visit count, low-stock medicine count, expired medicine count, and total inventory. Dashboard provides quick navigation to visits and medicines.

**Independent Test**: Create 3 visits today, set 2 medicines below threshold, and set 1 medicine as expired. Open the medical dashboard — confirm the summary shows: 3 visits today, 2 low-stock, 1 expired.

### Implementation for User Story 3

- [x] T020 [US3] Implement dashboard aggregation queries in `next/lib/medical/queries.ts` — countVisitsToday(), countLowStock(), countExpired(), countTotalMedicines()
- [x] T021 [US3] Implement GET `/api/medical/dashboard` route in `next/app/api/medical/dashboard/route.ts` — return { visitsToday, lowStockCount, expiredCount, totalMedicines }, auth check `permissions.medical` in `view|edit`
- [x] T022 [US3] Generate dashboard page via Stitch MCP in `next/app/(dashboard)/medical/page.tsx` — Arabic RTL with 4 summary cards, quick navigation buttons to visits list and medicines list

**Checkpoint**: US3 fully functional — dashboard with real-time stats

---

## Phase 6: User Story 4 — تنبيهات الصلاحية والمخزون المنخفض (Priority: P2)

**Goal**: System can run expiry and low-stock checks to create notifications for medical staff and commanders. Expired medicines are blocked from dispensing.

**Independent Test**: Create a medicine with expiryDate=yesterday. Run the expiry check — confirm a notification is created for medical staff. Confirm that attempting to dispense the expired medicine in a visit is blocked.

### Implementation for User Story 4

- [x] T023 [US4] Implement expiry and low-stock check logic in `next/lib/medical/checks.ts` — runExpiryCheck() creates medicine_expiry notifications, runLowStockCheck() creates low_stock notifications, both target users with `permissions.medical = edit` and commanders
- [x] T024 [US4] Implement POST `/api/medical/checks` route in `next/app/api/medical/checks/route.ts` — trigger checks, return counts of notifications created, auth check `permissions.medical === "edit"`
- [x] T025 [US4] Verify expiry block in visit creation — confirm POST `/api/medical` (T010) blocks dispense if medicine.expiryDate < now, Arabic error "الدواء منتهي الصلاحية ولا يمكن صرفه"

**Checkpoint**: US4 fully functional — proactive notifications and expiry blocking

---

## Phase 7: User Story 5 — البحث والفلترة في سجل الزيارات (Priority: P3)

**Goal**: Staff can search visits by patient name or patient ID, filter by date range, and paginate through results for quick historical lookup.

**Independent Test**: Create 25 visits for different patients. Search by patient name "أحمد" — confirm only matching visits appear. Filter by date range — confirm only visits within the range appear. Navigate pagination — confirm page 2 loads correctly.

### Implementation for User Story 5

- [x] T026 [US5] Verify search/filter/pagination in GET `/api/medical` route — confirm search param filters by patientName or patientId via `$or` with `$regex`, dateFrom/dateTo filter by visitDate, page/limit control pagination (partially implemented in T009)
- [x] T027 [US5] Add MongoDB index for search performance on Patient collection — compound index on `patientName` and `patientId` for regex search, verify existing `visitDate: -1` index supports date filtering

**Checkpoint**: US5 fully functional — search, filter, and pagination on visits list

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Final integration checks and build validation

- [x] T028 [P] Verify all medical API routes follow convention: auth → RBAC → Zod validate → operate → audit log → respond
- [x] T029 [P] Verify all error messages are in Arabic (FR-018)
- [x] T030 Verify Patient.ts export in `next/lib/db/models/index.ts` (already exists)
- [x] T031 Verify Medicine.ts export in `next/lib/db/models/index.ts` (already exists)
- [x] T032 Run `cd next && npm run build` — must pass with 0 errors, 0 warnings

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: No dependencies — can start immediately
- **Phase 2 (Foundational)**: Depends on Phase 1 — BLOCKS all user stories
- **Phase 3 (US1 MVP)**: Depends on Phase 2
- **Phase 4 (US2)**: Depends on Phase 2 (independent of US1)
- **Phase 5 (US3)**: Depends on Phase 3 + Phase 4 (needs visits + medicines data)
- **Phase 6 (US4)**: Depends on Phase 4 (needs medicines for checks)
- **Phase 7 (US5)**: Depends on Phase 3 (needs visits to search)
- **Phase 8 (Polish)**: Depends on all desired user stories being complete

### User Story Dependencies

- **US1 (P1) MVP**: No dependency on other stories — core visit + dispense workflow
- **US2 (P1)**: No dependency on US1 — independent medicine inventory management
- **US3 (P2)**: Depends on US1 + US2 — dashboard aggregates both visits and medicines
- **US4 (P2)**: Depends on US2 — notifications reference medicine data
- **US5 (P3)**: Depends on US1 — search operates on visit records

### Parallel Opportunities

```
# Phase 1: All setup tasks can run in parallel (different directories)
T001, T002, T003, T004

# Phase 2: Model updates can run in parallel (different files)
T005, T006

# Phase 3 (US1): Zod schemas + stock logic can run in parallel (different files)
T007, T008

# Phase 4 (US2): Zod schemas parallel with US1 API routes
T007 (US1) + T014 (US2) — different validation file sections
T008 (US1) + T015 (US2) — different files

# Phases 3+4: US1 and US2 can be worked on simultaneously after Phase 2
Developer A: US1 (T007-T013)
Developer B: US2 (T014-T019)

# Phase 8: Polish tasks can run in parallel
T028, T029
```

---

## Parallel Example: After Phase 2

```bash
# Developer A starts US1:
Task: "Create visit Zod schemas in next/lib/validations/medical.ts"
Task: "Implement atomic stock logic in next/lib/medical/stock.ts"
Task: "Implement POST /api/medical route in next/app/api/medical/route.ts"

# Developer B starts US2 simultaneously:
Task: "Create medicine Zod schemas in next/lib/validations/medical.ts"
Task: "Implement GET /api/medical/medicines in next/app/api/medical/medicines/route.ts"
Task: "Implement POST /api/medical/medicines in next/app/api/medical/medicines/route.ts"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (T001-T004)
2. Complete Phase 2: Foundational (T005-T006) — CRITICAL
3. Complete Phase 3: US1 (T007-T013)
4. **STOP and VALIDATE**: Test US1 independently via browser
5. Deploy/demo if ready

### Incremental Delivery

1. Setup + Foundational → Foundation ready
2. Add US1 → Test independently → Deploy/Demo (MVP!)
3. Add US2 → Test independently → Deploy/Demo
4. Add US3 → Test independently → Deploy/Demo
5. Add US4 → Test independently → Deploy/Demo
6. Add US5 → Test independently → Deploy/Demo
7. Polish → Build validation → Final deploy

### Parallel Team Strategy

With 2 developers:

1. Both complete Setup + Foundational together
2. Once Foundational is done:
   - Developer A: US1 → US3 → US5
   - Developer B: US2 → US4
3. Both: Phase 8 Polish + build validation

---

## Metrics

- **Total Tasks**: 32
- **US1 (MVP)**: 7 tasks (T007-T013)
- **US2**: 6 tasks (T014-T019)
- **US3**: 3 tasks (T020-T022)
- **US4**: 3 tasks (T023-T025)
- **US5**: 2 tasks (T026-T027)
- **Setup/Foundational**: 6 tasks (T001-T006)
- **Polish**: 5 tasks (T028-T032)
- **Parallelizable**: 8 tasks marked [P]

---

## Tech Debt Tasks (Generated by /speckit.cleanup)

**Generated**: 2026-04-04
**Source**: Post-implementation cleanup across all specs
**Priority**: Address before next feature iteration

### Detected Issues

- [x] TD001 Replace `as any` type casts in `app/(dashboard)/medical/visits/page.tsx:27,29` — use proper typed serialization for visit documents
- [x] TD002 Replace `as any` type cast in `app/(dashboard)/medical/medicines/page.tsx:20` — use proper typed serialization for medicine documents
- [x] TD003 Define proper `DispensedMedicine` type in `components/medical/VisitTable.tsx:11,46` — replace `any[]` with explicit interface
