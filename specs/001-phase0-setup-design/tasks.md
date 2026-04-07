# Tasks: Phase 0 — Setup & Design System

**Input**: Design documents from `/specs/001-phase0-setup-design/`
**Prerequisites**: plan.md (required), spec.md (required), research.md, data-model.md, contracts/

**Tests**: Phase 0 is infrastructure setup — no unit tests are generated. Verification is done via build validation (`npm run build`) and manual testing per quickstart.md.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- **Web app**: `next/` for application code, root for Docker/config files
- Specs and documentation in `specs/`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and basic structure

- [x] T001 Initialize Next.js project in `next/` directory with TypeScript, App Router, Tailwind CSS
- [x] T002 Install dependencies: Mongoose, Zod, bcryptjs, jsonwebtoken, @types/* in `next/package.json`
- [x] T003 [P] Configure `next/tsconfig.json` with strict mode (`"strict": true`, no `any`)
- [x] T004 [P] Create `next/.gitignore` with node_modules, .env.local, public/uploads, .next
- [x] T005 [P] Create root `.gitignore` adding `next/.next`, `next/node_modules`, `next/.env.local`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [x] T006 [P] Configure ESLint in `next/eslint.config.mjs` with `@typescript-eslint/no-explicit-any: error`
- [x] T007 [P] Configure Prettier in `next/.prettierrc` with RTL-friendly settings
- [x] T008 [P] Initialize shadcn/ui configuration in `next/components.json`
- [x] T009 [P] Configure Tailwind CSS with RTL plugin and shadcn/ui theme in `next/app/globals.css`
- [x] T010 [P] Configure PostCSS in `next/postcss.config.mjs`
- [x] T011 Create root layout `next/app/layout.tsx` with `dir="rtl"`, `lang="ar"`, Arabic font
- [x] T012 Create placeholder home page `next/app/page.tsx` with basic Arabic content
- [x] T013 Create environment template `next/.env.example` with MONGODB_URI, JWT_SECRET, UPLOAD_PATH
- [x] T014 Create environment file `next/.env.local` with local development values
- [x] T015 Create database connection utility `next/lib/db/connect.ts` with singleton pattern and retry logic
- [x] T016 Create `next/public/uploads/` directory with `.gitkeep`
- [x] T017 Create `next/app/api/` directory with placeholder route `next/app/api/health/route.ts`

**Checkpoint**: Foundation ready — project compiles, database connection utility exists, config files complete

---

## Phase 3: User Story 1 — Project Foundation Setup (Priority: P1) 🎯

**Goal**: A fully initialized, compilable project with all tooling configured

**Independent Test**: Run `cd next && npm run build` — must complete with zero errors and zero warnings. Run `cd next && npm run lint` — must pass with zero violations.

### Implementation for User Story 1

- [x] T018 [US1] Verify `next/package.json` has correct scripts: `dev`, `build`, `lint`, `start`
- [x] T019 [US1] Verify `next/next.config.ts` is configured with correct settings
- [x] T020 [US1] Create `next/lib/uploads/index.ts` — file upload handler for local storage
- [x] T021 [US1] Verify build: run `cd next && npm run build` — must pass with 0 errors, 0 warnings
- [x] T022 [US1] Verify lint: run `cd next && npm run lint` — must pass with 0 violations

**Checkpoint**: Project foundation is fully working — builds clean, lints clean, dev server starts

---

## Phase 4: User Story 5 — Constitution & Project Rules (Priority: P1)

**Goal**: Project governance document exists and is referenced in all plans

**Independent Test**: Read `.specify/memory/constitution.md` and verify it contains 6 core principles, development workflow, and governance procedures.

### Implementation for User Story 5

- [x] T023 [US5] Verify `.specify/memory/constitution.md` exists with all 6 principles (already created — validate completeness)
- [x] T024 [US5] Create `specs/DESIGN.md` placeholder with design system template structure (to be filled by US4)

**Checkpoint**: Constitution is complete and DESIGN.md template exists

---

## Phase 5: User Story 2 — Database Schema Definition (Priority: P1)

**Goal**: All 11 Mongoose models defined with complete field definitions, validations, and relationships

**Independent Test**: Connect to MongoDB, create a sample document for each of the 11 models, verify validation rules fire on invalid data.

### Implementation for User Story 2

- [x] T025 [P] [US2] Create User model `next/lib/db/models/User.ts` with username, password (hashed), fullName, role enum, permissions object, isActive
- [x] T026 [P] [US2] Create Fax model `next/lib/db/models/Fax.ts` with faxNumber, date, entities, fileUrl, fileType, status workflow, relatedFaxes
- [x] T027 [P] [US2] Create Officer model `next/lib/db/models/Officer.ts` with militaryId, fullName, rank, position, documents array
- [x] T028 [P] [US2] Create Leave model `next/lib/db/models/Leave.ts` with officerId ref, type enum, date range, status workflow
- [x] T029 [P] [US2] Create Assignment model `next/lib/db/models/Assignment.ts` with officerId ref, type enum, description, date
- [x] T030 [P] [US2] Create DailyRollcall model `next/lib/db/models/DailyRollcall.ts` with date, submittedBy, entries array, submission flags
- [x] T031 [P] [US2] Create Patient model `next/lib/db/models/Patient.ts` with patientId, visit details, dispensedMedicines array
- [x] T032 [P] [US2] Create Medicine model `next/lib/db/models/Medicine.ts` with name, unit, quantity, expiryDate, minThreshold
- [x] T033 [P] [US2] Create Student model `next/lib/db/models/Student.ts` with studentId, fullName, enrollDate, documents array
- [x] T034 [P] [US2] Create Course model `next/lib/db/models/Course.ts` with title, dates, status enum, participants, documents
- [x] T035 [P] [US2] Create Notification model `next/lib/db/models/Notification.ts` with userId, type, title, body, isRead, refId
- [x] T036 [P] [US2] Create AuditLog model `next/lib/db/models/AuditLog.ts` with userId, userName, action, module, targetId, ipAddress
- [x] T037 [US2] Create model index file `next/lib/db/models/index.ts` that exports all 11 models
- [x] T038 [US2] Add Mongoose indexes: User.username (unique), Fax.faxNumber (unique), Officer.militaryId (unique), Student.studentId (unique)

**Checkpoint**: All 11 models exist, compile without errors, have correct validations and indexes

---

## Phase 6: User Story 3 — Docker Environment (Priority: P2)

**Goal**: Docker Compose runs application and MongoDB together with persistent data

**Independent Test**: Run `docker-compose up`, navigate to http://localhost:3000, verify app loads and connects to MongoDB. Restart containers and verify data persists.

### Implementation for User Story 3

- [x] T039 [US3] Create `docker-compose.yml` with app and mongo services, volume mounts, environment variables
- [x] T040 [US3] Create `Dockerfile` with multi-stage build: install deps, build Next.js, run production server
- [x] T041 [US3] Create `.dockerignore` to exclude node_modules, .next, .git from Docker context
- [ ] T042 [US3] Verify Docker: run `docker-compose up --build` and confirm both services start without errors

**Checkpoint**: Docker Compose starts both services, app is accessible on port 3000, MongoDB persists data

---

## Phase 7: User Story 4 — Design System Extraction (Priority: P2)

**Goal**: DESIGN.md contains complete design system with colors, fonts, spacing, component patterns, RTL rules

**Independent Test**: Read `specs/DESIGN.md` — verify it contains color palette, typography scale, spacing system, component patterns, and RTL layout rules. A developer should be able to implement a new screen using only this document.

### Implementation for User Story 4

- [x] T043 [US4] Configure Stitch MCP via Google Stitch MCP tools (stitch_create_project, stitch_generate_screen_from_text) — no local .mcp.json needed
- [x] T044 [US4] Generate dashboard design via Stitch MCP prompt (Arabic RTL military archive, dark navy + gold)
- [x] T045 [US4] Extract design context: colors (hex), fonts (family, sizes), spacing (scale), border-radius, shadows
- [x] T046 [US4] Populate `specs/DESIGN.md` with extracted design tokens and component patterns
- [x] T047 [US4] Convert Stitch HTML/CSS to base layout component `next/app/layout.tsx` with Tailwind
- [x] T048 [US4] Fallback: If Stitch MCP unavailable, manually define design tokens per master-plan.md specification

**Checkpoint**: DESIGN.md is complete and usable as single source of truth for all future screens

---

## Phase N: Polish & Cross-Cutting Concerns

**Purpose**: Final validation and cleanup

- [x] T049 Run full build validation: `cd next && npm run build` — zero errors, zero warnings
- [x] T050 Run full lint validation: `cd next && npm run lint` — zero violations
- [x] T051 Verify all files from project-init.md contract exist (checklist against file structure)
- [x] T052 Verify `next/.env.example` is committed (no secrets) and `next/.env.local` is in .gitignore
- [x] T053 Verify quickstart documentation accurately reflects the setup process (documented in feature-specific quickstart.md files)
- [x] T054 Verify AGENTS.md reflects current tech stack and conventions

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion — BLOCKS all user stories
- **User Stories (Phase 3–7)**: All depend on Foundational phase completion
  - US1 (P1), US5 (P1), US2 (P1) can proceed in parallel after Foundational
  - US3 (P2), US4 (P2) can proceed in parallel after Foundational
- **Polish (Phase N)**: Depends on all user stories being complete

### User Story Dependencies

- **US1 — Project Foundation (P1)**: Can start after Foundational (Phase 2) — no dependencies on other stories
- **US5 — Constitution (P1)**: Can start after Foundational — already mostly complete (constitution exists)
- **US2 — Database Models (P1)**: Can start after Foundational — no dependencies on other stories
- **US3 — Docker (P2)**: Can start after Foundational — depends on US1 for build validation
- **US4 — Design System (P2)**: Can start after Foundational — depends on US1 for Tailwind/shadcn config

### Within Each User Story

- Models before services (not applicable — Phase 0 is models only)
- Config files before build validation
- Story complete before moving to next

### Parallel Opportunities

- All Setup tasks marked [P] (T003, T004, T005) can run in parallel
- All Foundational tasks marked [P] (T006–T010) can run in parallel
- All model creation tasks (T025–T036) can run in parallel — different files, no dependencies
- US1, US5, and US2 (all P1) can proceed in parallel after Foundational phase
- US3 and US4 (both P2) can proceed in parallel after Foundational phase

---

## Parallel Example: User Story 2 (Database Models)

```bash
# All 12 model files can be created simultaneously:
Task: "Create User model in next/lib/db/models/User.ts"
Task: "Create Fax model in next/lib/db/models/Fax.ts"
Task: "Create Officer model in next/lib/db/models/Officer.ts"
Task: "Create Leave model in next/lib/db/models/Leave.ts"
Task: "Create Assignment model in next/lib/db/models/Assignment.ts"
Task: "Create DailyRollcall model in next/lib/db/models/DailyRollcall.ts"
Task: "Create Patient model in next/lib/db/models/Patient.ts"
Task: "Create Medicine model in next/lib/db/models/Medicine.ts"
Task: "Create Student model in next/lib/db/models/Student.ts"
Task: "Create Course model in next/lib/db/models/Course.ts"
Task: "Create Notification model in next/lib/db/models/Notification.ts"
Task: "Create AuditLog model in next/lib/db/models/AuditLog.ts"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL — blocks all stories)
3. Complete Phase 3: User Story 1 (Project Foundation)
4. **STOP and VALIDATE**: `npm run build` passes, `npm run lint` passes
5. Proceed to remaining stories

### Incremental Delivery

1. Complete Setup + Foundational → Foundation ready
2. Add US1 (Project Foundation) → Validate build → **MVP: compilable project**
3. Add US5 (Constitution) → Validate governance document
4. Add US2 (Database Models) → Validate all 11 models compile
5. Add US3 (Docker) → Validate `docker-compose up` works
6. Add US4 (Design System) → Validate DESIGN.md is complete
7. Polish → Final build/lint validation

### Parallel Team Strategy

With multiple developers:

1. Team completes Setup + Foundational together
2. Once Foundational is done:
   - Developer A: US1 (Project Foundation) + US5 (Constitution validation)
   - Developer B: US2 (All 11 Database Models) — 12 parallel files
   - Developer C: US3 (Docker) + US4 (Design System)

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- Phase 0 is infrastructure — verification is via build/lint, not unit tests
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- Constitution.md already exists — T023 is validation only

---

## Tech Debt Tasks (Generated by /speckit.cleanup)

**Generated**: 2026-03-23
**Source**: Post-implementation cleanup of Phase 0 — Setup & Design System
**Priority**: Address before Phase 1 (Auth & User Management)

- [x] TD001 Wire `disconnectFromDatabase` into Next.js graceful shutdown handler in `next/lib/db/connect.ts` — currently exported but never called
- [x] TD002 Add `NODE_ENV` check to `next/lib/db/connect.ts` — hardcoded MongoDB fallback URI should fail in production instead of silently connecting to localhost

---

## Cross-Cutting Tech Debt (Generated by /speckit.cleanup)

**Generated**: 2026-04-04
**Source**: Post-implementation cleanup across all specs
**Priority**: Address as part of shared component refactoring

### Detected Issues

- [x] TD003 Refactor `components/ui/Table.tsx` to use TypeScript generics instead of `any` — replaced all `any` with generic type parameter `<T extends Record<string, unknown>>`
