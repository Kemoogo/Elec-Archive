# Implementation Plan: شئون الطلبة (Student Affairs)

**Branch**: `007-student-affairs` | **Date**: 2026-03-28 | **Status**: Completed | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/007-student-affairs/spec.md`

## Summary

Implement the Student Affairs module for Elec Archive — a CRUD system for managing student records with document upload/download, status lifecycle (active/graduated/inactive/withdrawn), search/filter, and RBAC enforcement. The module integrates into the existing Next.js App Router architecture with Arabic RTL layout, Mongoose models, and Stitch MCP-generated UI.

## Technical Context

**Language/Version**: TypeScript 5.x (strict mode, no `any`)
**Primary Dependencies**: Next.js 16 (App Router, React 19), Mongoose 9.x, Tailwind CSS 4, shadcn/ui, Zod 4, bcryptjs
**Storage**: MongoDB 7 via Mongoose ODM (local Docker), local filesystem for file uploads (`public/uploads/students/`)
**Testing**: ESLint + Prettier (lint), `npm run build` (build validation)
**Target Platform**: Docker Compose (Next.js + MongoDB) on Windows local network
**Project Type**: Web application (Next.js fullstack — frontend + backend API in single repo)
**Performance Goals**: Student list loads <2s for 5,000 students; search completes <10s; document upload <5s for files up to 10MB
**Constraints**: Offline-first (no internet), Arabic RTL throughout, JWT auth in HttpOnly Cookies, no `any` type, RBAC on every API route, AuditLog on every mutation
**Scale/Scope**: 10-30 concurrent users, ~3 new pages (list, profile, upload), ~6 API routes, 1 model update (add status field)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Security-First | ✅ | JWT auth + RBAC + AuditLog + input validation via Zod — all specified |
| II. SSR-First | ✅ | Pages will use RSC by default; `'use client'` only for form interactions |
| III. Offline-First | ✅ | All local — MongoDB Docker, local filesystem uploads, no external calls |
| IV. Type Safety & Validation | ✅ | TypeScript strict, Zod schemas for all API inputs |
| V. Quality Gates | ✅ | ESLint + Prettier + `npm run build` validation |
| VI. Design-Driven UI via Stitch MCP | ✅ | 2 screens to generate via Stitch MCP referencing DESIGN.md |

**GATE: PASS** — No violations. Proceeding to Phase 0 research.

## Project Structure

### Documentation (this feature)

```text
specs/007-student-affairs/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
│   └── students-api.md
└── tasks.md             # Phase 2 output (/speckit.tasks command)
```

### Source Code (repository root)

```text
next/
├── app/
│   ├── (dashboard)/
│   │   └── students/                    # NEW — 3 pages
│   │       ├── page.tsx                 # Student list (Stitch generated)
│   │       ├── [id]/page.tsx            # Student profile (Stitch generated)
│   │       └── layout.tsx               # Students section layout
│   └── api/
│       └── students/                    # NEW — API routes
│           ├── route.ts                 # GET (list/search) + POST (create)
│           └── [id]/
│               ├── route.ts             # GET (profile) + PATCH (edit) + DELETE (deactivate)
│               └── documents/
│                   └── route.ts         # POST (upload) + DELETE (remove document)
├── lib/
│   ├── db/
│   │   └── models/
│   │       └── Student.ts               # EXISTING — add status field
│   └── validations/
│       └── student.ts                   # NEW — Zod schemas
├── components/
│   └── students/                        # NEW — module components
│       ├── StudentList.tsx
│       ├── StudentProfile.tsx
│       ├── StudentForm.tsx
│       └── DocumentUpload.tsx
└── public/
    └── uploads/
        └── students/                    # NEW — document storage directory
```

**Structure Decision**: Next.js App Router fullstack — pages under `(dashboard)/students/`, API routes under `api/students/`, shared models in `lib/db/models/`, validations in `lib/validations/`, components in `components/students/`.

## Complexity Tracking

No violations — Constitution Check passed cleanly.
