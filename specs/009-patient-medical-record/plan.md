# Implementation Plan: Patient Medical Record — الملف الطبي للمريض

**Branch**: `009-patient-medical-record` | **Date**: 2026-05-16 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/009-patient-medical-record/spec.md`

## Summary

Build a consolidated patient medical record modal accessible from the medical visits list. The modal uses tabbed navigation (3 tabs: الزيارات, الأدوية, التفاصيل الطبية) to display visit history, aggregated medication history, and patient-level medical details (allergies, chronic conditions, blood type, notes). Includes a new `PatientMedicalRecord` model for persistent patient-level data with optimistic concurrency control, Zod-validated API routes with RBAC, and a search page for direct patient lookup.

## Technical Context

**Language/Version**: TypeScript 5.x (strict mode, `any` prohibited)

**Primary Dependencies**: Next.js 16 (App Router, React 19), Mongoose 9.x, Zod 4, Tailwind CSS 4, shadcn/ui

**Storage**: MongoDB 7 via Mongoose ODM (local Docker). New `PatientMedicalRecord` collection. Reuse existing `MedicalPatient`, `MedicalVisit`, `Medicine`, `AuditLog` collections.

**Testing**: `npm run build` (zero errors/warnings), ESLint + Prettier enforcement

**Target Platform**: Local network Docker deployment (Windows host), Next.js + MongoDB containers

**Project Type**: Web application (Next.js full-stack)

**Performance Goals**: Modal opens in <2s (SC-001), patient search returns in <1s for up to 500 patients (SC-006), modal handles 100+ visits without layout break (SC-005)

**Constraints**: Offline-first (no external APIs/CDNs), Arabic RTL throughout, HttpOnly cookie JWT auth, RBAC at API + Server level, rate limiting (60 req/min reads, 20 req/min writes), audit logging on all CREATE/UPDATE

**Scale/Scope**: 10-30 concurrent users on local network. One `PatientMedicalRecord` per patient (indexed by `patientId`). Multiple `MedicalVisit` records per patient.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Gate | Status |
|-----------|------|--------|
| **I. Security-First** | Auth/authz on every API route; HttpOnly cookie JWT; RBAC at API + Server level; audit log all CREATE/UPDATE; rate limiting applied | PASS — All API routes will follow the established pattern: `authenticate()` → RBAC → rate limit → Zod validate → operate → `logAuditEvent()` → respond |
| **II. SSR-First** | RSC by default; `'use client'` only for interactivity; isolate client components | PASS — Page will be server-rendered. ModalShell, tabs, and form interactivity isolated in leaf client components |
| **III. Offline-First** | No external APIs/CDNs; local MongoDB; local filesystem storage | PASS — All data from local MongoDB, no external dependencies |
| **IV. Type Safety & Validation** | TypeScript strict mode; no `any`; Zod validation on all inputs | PASS — New models, API routes, and schemas will use strict TypeScript + Zod |
| **V. Quality Gates** | `npm run build` passes with 0 errors; edge cases handled | PASS — Will verify build passes. Edge cases: empty states, concurrent conflicts, network failures, long visit histories |
| **VI. Design-Driven UI** | Arabic RTL; design tokens; ModalShell pattern; tabbed navigation | PASS — Will use established ModalShell, design tokens, RTL layout, tabbed modal pattern |

## Project Structure

### Documentation (this feature)

```text
specs/009-patient-medical-record/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
└── tasks.md             # Phase 2 output
```

### Source Code (next/ directory)

```text
next/
├── lib/db/models/
│   └── PatientMedicalRecord.ts    # New: patient-level medical details model
├── lib/validations/
│   └── medical-record.ts          # New: Zod schemas for medical record API
├── app/api/medical/
│   ├── patients/search/route.ts   # New: search patients by ID/name
│   ├── patients/[patientId]/record/route.ts  # New: GET/PUT patient medical record
│   └── patients/[patientId]/visits/route.ts  # New: GET aggregated visits + meds
├── app/(dashboard)/medical/
│   ├── page.tsx                   # Existing: modified to link patient names to modal
│   └── patients/
│       └── page.tsx               # New: patient search page
└── components/medical/
    ├── PatientRecordModal.tsx     # New: main modal with tabs
    ├── PatientSearchModal.tsx     # New: search patients from visits page
    ├── VisitsTab.tsx              # New: tab content for visit history
    ├── MedicationsTab.tsx         # New: tab content for medication history
    └── MedicalDetailsTab.tsx      # New: tab content for patient medical details
```

**Structure Decision**: Single Next.js project (`next/`). New model in `lib/db/models/`. New API routes under `app/api/medical/patients/`. New page at `app/(dashboard)/medical/patients/` for search. Components in `components/medical/`. Existing `MedicalPatient`, `MedicalVisit`, `Medicine` models reused without modification.

## Constitution Check (Post-Design Re-evaluation)

*Re-checked after Phase 1 design completion.*

| Principle | Gate | Status |
|-----------|------|--------|
| **I. Security-First** | All 3 API contracts include auth + RBAC checks; PUT route logs to AuditLog; rate limits defined per contract | PASS — Contracts explicitly define auth requirements, rate limits, and Arabic error responses |
| **II. SSR-First** | Patient search page is server-rendered; modal and tabs are client components isolated as leaf components | PASS — Design separates server page from client interactive components |
| **III. Offline-First** | All data from local MongoDB; no external dependencies in any contract or component | PASS |
| **IV. Type Safety & Validation** | Zod schemas defined for all API inputs/outputs in data-model.md; TypeScript interfaces for all models | PASS |
| **V. Quality Gates** | Edge cases documented: empty states, 409 conflicts, 429 rate limits, 100+ visit histories | PASS |
| **VI. Design-Driven UI** | ModalShell pattern specified; Arabic RTL throughout; design tokens referenced; tabbed modal matches spec | PASS |

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| Optimistic concurrency (version field) | Required by spec (FR-012) for concurrent edit conflict resolution | Last-write-wins would silently overwrite data; locking would be overkill for local network |
| Separate API route for aggregated visits+meds | Performance: single round-trip for modal data vs 2-3 separate calls | Multiple calls would increase latency and complexity on client side |
