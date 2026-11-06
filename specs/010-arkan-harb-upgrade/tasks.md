# Tasks: ترقية فرع العمليات وأركان حرب والتكامل الشامل

**Input**: Design documents from `/specs/010-arkan-harb-upgrade/`
**Prerequisites**: plan.md, spec.md, data-model.md, contracts/api-contracts.md, research.md, quickstart.md

## Organization & Execution Rules
- **[P]**: Tasks that can run in parallel (different files, independent modules).
- Strict adherence to Sapphire Archive Design System (`--color-primary`, `ModalShell` with `bg-black/40`, `MainTable`).
- Zero `any` in TypeScript. `npx tsc --noEmit` must pass with 0 errors.
- Mandatory audit logging (`logAuditEvent`) on all mutations with valid MongoDB `ObjectId` string as `targetId`.
- **Note**: Education module (`/education`) is explicitly out-of-scope; no files under `/education` shall be edited.

---

## Phase 1: Setup & Foundational Data Models

**Purpose**: Core data layer updates required before any UI or API integration begins.

- [x] T001 [P] Update `Mission.ts` and `Mission.shared.ts` to add `linkedFax` (ObjectId ref to Fax), `referenceLetterNumber`, `travelOrderNumber`, `transportationMean`, `authorizedWeapons`, and `clearanceDocuments` array in `next/lib/db/models/Mission.ts` and `next/lib/db/models/Mission.shared.ts`.
- [x] T002 [P] Create `DutyRoster.ts` and `DutyRoster.shared.ts` Mongoose schema and TypeScript interfaces for the monthly guard/duty roster in `next/lib/db/models/DutyRoster.ts` and `next/lib/db/models/DutyRoster.shared.ts`.
- [x] T003 [P] Create `IncidentLog.ts` and `IncidentLog.shared.ts` Mongoose schema and TypeScript interfaces for operations incidents in `next/lib/db/models/IncidentLog.ts` and `next/lib/db/models/IncidentLog.shared.ts`.
- [x] T004 Export new models and shared types in `next/lib/db/models/index.ts` and `@/types/index.ts`.

---

## Phase 2: User Story 1 - التكامل الثنائي بين الفاكس والمأموريات (Priority: P1) 🎯 MVP

**Goal**: تمكين تحويل الفاكسات الواردة مباشرة إلى مأموريات عمل رسمية، مع ربط المستند الأصلي وإمكانية معاينته من أركان حرب.

- [x] T005 Create API route `POST /api/fax/[id]/convert-to-mission` with RBAC (`fax: edit` + `arkan_harb: edit`), Zod schema validation, and audit logging in `next/app/api/fax/[id]/convert-to-mission/route.ts`.
- [x] T006 Add "إنشاء مأمورية من الفاكس" button and action handler to the fax viewer in `next/app/(dashboard)/fax/[id]/page.tsx`.
- [x] T007 Update `MissionForm.tsx` to handle `linkedFax` selection, pre-filling data from query parameters, and displaying linked fax badge in `next/components/arkan-harb/MissionForm.tsx`.
- [x] T008 Add "عرض الفاكس المرفق" action button in `MissionDetailModal.tsx` and missions table in `next/components/arkan-harb/MissionDetailModal.tsx` and `next/components/arkan-harb/MissionsTable.tsx`.

---

## Phase 3: User Story 2 - المزامنة الآلية للراحات الطبية مع التمام (Priority: P1)

**Goal**: سحب حالات الراحة الطبية، الكشف بالعيادة، والتحويل للمستشفيات العسكرية تلقائياً في التمام اليومي الميداني.

- [x] T009 Update `calculateDailyRollcallEntries` in `next/lib/arkan-harb/rollcall-engine.ts` to query active `MedicalVisit` documents where visit date + rest days covers the target date.
- [x] T010 Map medical results to rollcall entries: set status to `clinic` or `rest` with auto-lock (`isLocked: true`), and `hospital` with hospital destination name in `next/lib/arkan-harb/rollcall-engine.ts`.
- [x] T011 Add medical status alert banner and summary counters to `RollcallView.tsx` in `next/components/arkan-harb/RollcallView.tsx`.

---

## Phase 4: User Story 3 & 4 - أوامر التحرك العسكرية وفحص التعارضات الاستباقي (Priority: P1)

**Goal**: إصدار أمر تحرك رسمي A4 قابل للطباعة مع فحص فوري للتعارضات داخل نافذة تسجيل المأمورية.

- [x] T012 Create proactive conflict checking API `POST /api/arkan-harb/missions/check-conflict` in `next/app/api/arkan-harb/missions/check-conflict/route.ts` checking for overlapping leaves, active missions, and vacant mandatory positions.
- [x] T013 Integrate conflict warning badge card inside `MissionForm.tsx` to alert on officer conflicts and block submission on leave overlaps in `next/components/arkan-harb/MissionForm.tsx`.
- [x] T014 Create official military travel order print template `TravelOrderSheet.tsx` with A4 styles and unit header in `next/components/arkan-harb/TravelOrderSheet.tsx`.
- [x] T015 Create `TravelOrderModal.tsx` with print trigger and integrate `[طباعة أمر التحرك]` icon button in `MissionsClient.tsx` in `next/components/arkan-harb/TravelOrderModal.tsx` and `next/components/arkan-harb/MissionsClient.tsx`.

---

## Phase 5: User Story 5 - إغلاق المأمورية برفع المستندات وإخلاء الطرف (Priority: P2)

**Goal**: توثيق إنهاء المأمورية العسكرية برفع إفادة الحضور أو تقرير الإنجاز أو إخلاء الطرف.

- [x] T016 Update `MissionCompleteModal.tsx` to add file upload for clearance/completion documents with size and type validation in `next/components/arkan-harb/MissionCompleteModal.tsx`.
- [x] T017 Update mission status update API in `next/app/api/arkan-harb/missions/[id]/route.ts` to save uploaded clearance document metadata and file storage path.
- [x] T018 Add clearance document download/preview badge in `MissionDetailModal.tsx` in `next/components/arkan-harb/MissionDetailModal.tsx`.

---

## Phase 6: User Story 6 - تكامل تسكين الوظائف وسجل المأموريات في شئون الضباط (Priority: P2)

**Goal**: توحيد المسمى الوظيفي للضابط ديناميكياً مع جدول الوظائف وعرض السجل الميداني للمأموريات في ملف الضابط.

- [x] T019 Update `next/app/(dashboard)/officers/[id]/page.tsx` to fetch the officer's active assigned position dynamically from `PositionAssignment` (primary or substitute) rather than static text.
- [x] T020 Create `OfficerMissionsTab.tsx` in `next/components/officers/tabs/OfficerMissionsTab.tsx` and integrate it as a tab in `officers/[id]/page.tsx` showing the full historical mission log for the officer.

---

## Phase 7: User Story 7 - منظومة جدول النوبتجيات والخدمات العسكرية (Priority: P2)

**Goal**: بناء أداة تفاعلية متقدمة لإدارة وتوزيع النوبتجيات والخدمات مع حساب عدالة التوزيع.

- [x] T021 Create `roster-engine.ts` in `next/lib/arkan-harb/roster-engine.ts` to calculate equity metrics (total duties, weekend/holiday duties per officer) and check for leave/mission conflicts.
- [x] T022 Create API routes `GET /api/arkan-harb/roster` and `PUT /api/arkan-harb/roster` with RBAC (`arkan_harb: edit/view`), Zod validation, and commander ratification support in `next/app/api/arkan-harb/roster/route.ts`.
- [x] T023 Create `DutyRosterTab.tsx` interactive monthly grid with officer select modals, conflict prevention, and equity summary sidebar in `next/components/arkan-harb/DutyRosterTab.tsx`.
- [x] T024 Integrate `DutyRosterTab` into `ArkanHarbClient.tsx` and auto-tag today's unit duty officer in `RollcallView.tsx`.

---

## Phase 8: User Story 8 - يومية الحوادث والبلاغات والعمليات الطارئة (Priority: P2)

**Goal**: توثيق زمني لحظي بالدقيقة للإشارات والبلاغات العاجلة مع تدوين قرارات وتوجيهات القائد.

- [x] T025 Create API routes `GET /api/arkan-harb/incidents` and `POST /api/arkan-harb/incidents` with Zod validation and audit logging in `next/app/api/arkan-harb/incidents/route.ts`.
- [x] T026 Create `IncidentLogTab.tsx` timeline and table component with urgency badges, new incident modal, and commander instruction recording in `next/components/arkan-harb/IncidentLogTab.tsx`.
- [x] T027 Integrate `IncidentLogTab` as an active tab in `next/app/(dashboard)/arkan-harb/page.tsx` and `ArkanHarbClient.tsx`.

---

## Phase 9: Quality Gates & Final System Verification

**Purpose**: Comprehensive audit, TypeScript strict check, and design system compliance.

- [x] T028 Run `npx tsc --noEmit` and confirm 0 errors across the entire codebase.
- [x] T029 Verify RTL layout, Sapphire Archive color tokens, focus rings, and `ModalShell` standard across all new dialogs.
- [x] T030 Perform manual end-to-end verification across all 8 workflows per `specs/010-arkan-harb-upgrade/quickstart.md`.
