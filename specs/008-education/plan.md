# Implementation Plan: التعليم (Education & Courses)

**Branch**: `008-education` | **Date**: 2026-03-28 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/008-education/spec.md`

## Summary

Implement the Education module for Elec Archive — a course catalog and participant enrollment system with document attachment, status management (upcoming/ongoing/completed), RBAC enforcement, and card-based UI. The module integrates into the existing Next.js App Router architecture with Arabic RTL layout, Mongoose models, and existing Officer/Student references for enrollment.

## Technical Context

**Language/Version**: TypeScript 5.x (strict mode, no `any`)
**Primary Dependencies**: Next.js 16 (App Router, React 19), Mongoose 9.x, Tailwind CSS 4, shadcn/ui, Zod 4
**Storage**: MongoDB 7 via Mongoose ODM (local Docker), local filesystem for file uploads (`public/uploads/courses/`)
**Testing**: ESLint + Prettier (lint), `npm run build` (build validation)
**Target Platform**: Docker Compose (Next.js + MongoDB) on Windows local network
**Project Type**: Web application (Next.js fullstack — frontend + backend API in single repo)
**Performance Goals**: Course catalog loads <2s for 500 courses; participant enrollment <30s
**Constraints**: Offline-first (no internet), Arabic RTL throughout, JWT auth in HttpOnly Cookies, no `any` type, RBAC on every API route, AuditLog on every mutation
**Scale/Scope**: 10-30 concurrent users, ~3 new pages (catalog, detail, upload), ~6 API routes, Course model already exists

## Constitution Check

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Security-First | ✅ | JWT auth + RBAC + AuditLog + input validation via Zod |
| II. SSR-First | ✅ | Pages will use RSC by default; `'use client'` only for form interactions |
| III. Offline-First | ✅ | All local — MongoDB Docker, local filesystem uploads, no external calls |
| IV. Type Safety & Validation | ✅ | TypeScript strict, Zod schemas for all API inputs |
| V. Quality Gates | ✅ | ESLint + Prettier + `npm run build` validation |
| VI. Design-Driven UI via Stitch MCP | ✅ | 2 screens to generate via Stitch MCP referencing DESIGN.md |

**GATE: PASS**

## Project Structure

### Documentation (this feature)

```text
specs/008-education/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
│   └── education-api.md
└── tasks.md             # Phase 2 output (/speckit.tasks)
```

### Source Code (repository root)

```text
next/
├── app/
│   ├── (dashboard)/
│   │   └── education/                     # NEW — 2 pages
│   │       ├── page.tsx                   # Course catalog (Stitch generated)
│   │       ├── [id]/page.tsx              # Course detail (Stitch generated)
│   │       └── layout.tsx                 # Education section layout
│   └── api/
│       └── education/                     # NEW — API routes
│           ├── route.ts                   # GET (list) + POST (create)
│           └── [id]/
│               ├── route.ts               # GET (detail) + PATCH (edit) + DELETE
│               ├── participants/
│               │   └── route.ts           # POST (add) + DELETE (remove)
│               └── documents/
│                   └── route.ts           # POST (upload) + DELETE (remove)
├── lib/
│   ├── db/
│   │   └── models/
│   │       └── Course.ts                  # EXISTING — no changes needed
│   └── validations/
│       └── education.ts                   # NEW — Zod schemas
├── components/
│   └── education/                         # NEW — module components
│       ├── CourseGrid.tsx
│       ├── CourseCard.tsx
│       ├── CourseDetail.tsx
│       ├── CourseForm.tsx
│       ├── ParticipantPicker.tsx
│       └── CourseDocumentUpload.tsx
└── public/
    └── uploads/
        └── courses/                       # NEW — document storage
```

**Structure Decision**: Next.js App Router fullstack — pages under `(dashboard)/education/`, API routes under `api/education/`, Course model already exists.

## Complexity Tracking

No violations — Constitution Check passed cleanly.
