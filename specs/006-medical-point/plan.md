# Implementation Plan: النقطة الطبية — Medical Point Module

**Branch**: `006-medical-point` | **Date**: 2026-03-27 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/006-medical-point/spec.md`

## Summary

Build a medical point module enabling staff to record patient visits, dispense medicine (with atomic stock reduction), manage medicine inventory, view a medical dashboard, and receive expiry/low-stock notifications. Reuses existing auth/RBAC, audit logging, notification, and rate-limiting infrastructure from fax and officers modules. All UI screens generated via live Stitch MCP server using the project's "Vault Modern" design system.

## Technical Context

**Language/Version**: TypeScript 5.x (strict mode, no `any`)
**Primary Dependencies**: Next.js 16 (App Router, React 19), Mongoose 9.x, Tailwind CSS 4, shadcn/ui, Zod 4
**Storage**: MongoDB 7 via Mongoose ODM (local Docker)
**Testing**: Manual QA via browser (no automated test framework in project)
**Target Platform**: Docker Compose (Next.js + MongoDB) on local network (Windows)
**Project Type**: Web application (Next.js App Router — frontend + API routes in one codebase)
**Performance Goals**: Dashboard loads <2s, visit search <1s for 500 records, notification delivery within 60s of check
**Constraints**: Offline-first (no internet), Arabic RTL layout, JWT in HttpOnly cookies, atomic stock operations via MongoDB `$inc` with `quantity >= N` guard
**Scale/Scope**: 10–30 concurrent users, ~15 screens, 2 new models (Patient, Medicine already exist), ~8 API routes

## Stitch MCP Integration

### Live Server Configuration
- **Project ID**: `14721618739991060852`
- **Design System**: "Vault Modern" (asset: `101360978e324d26a6d0ba49750c8f7f`)
- **Color Mode**: LIGHT
- **Primary Color**: `#1e3c72` (Executive Deep Blue)
- **Headline Font**: Plus Jakarta Sans
- **Body Font**: Inter
- **Roundness**: ROUND_EIGHT

### UI Generation Workflow
1. **Design Prompt**: Write Arabic RTL prompts referencing the Vault Modern design system
2. **Screen Generation**: Use `stitch_generate_screen_from_text` for each medical page
3. **Design System Application**: Apply existing design system to generated screens
4. **Code Extraction**: Extract generated HTML/CSS and convert to Next.js components with Tailwind CSS + shadcn/ui
5. **API Integration**: Connect components to medical API routes + Mongoose models

### Medical Screens to Generate
| Screen | Route | Stitch Prompt Reference |
|--------|-------|-------------------------|
| Medical Dashboard | `/medical` | Dashboard with 4 summary cards, quick navigation |
| Visits List | `/medical/visits` | Table with search, date filter, pagination |
| New Visit | `/medical/visits/new` | Form with patient info, medicine selection, dispense |
| Medicine Inventory | `/medical/medicines` | Table with badges (low-stock, expired), CRUD actions |

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Security-First | ✅ | FR-014 mandates auth+RBAC on all routes. Existing `authenticate()` + `permissions.medical` pattern reused. Audit logging (FR-015), rate limiting (FR-016), Zod validation (FR-017) all specified. |
| II. SSR-First | ✅ | All pages server-rendered by default; `'use client'` only for forms/dashboard interactivity. |
| III. Offline-First | ✅ | No external API calls; all data local MongoDB + filesystem. |
| IV. Type Safety & Validation | ✅ | Zod schemas for all inputs (FR-017). TypeScript strict. No `any`. |
| V. Quality Gates | ✅ | Build must pass with zero errors/warnings. Edge cases documented in spec. |
| VI. Design-Driven UI | ✅ | Live Stitch MCP server with "Vault Modern" design system. Arabic RTL throughout. |

**No violations detected.** Proceed to Phase 0.

## Project Structure

### Documentation (this feature)

```text
specs/006-medical-point/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
├── design-reference.md  # Stitch MCP design system reference
└── tasks.md             # Phase 2 output (via /speckit.tasks)
```

### Source Code (repository root)

```text
next/
├── app/
│   ├── api/
│   │   └── medical/             # NEW — Medical API routes
│   │       ├── route.ts         # GET (list visits), POST (create visit)
│   │       ├── [id]/route.ts    # GET/PUT/DELETE single visit
│   │       ├── medicines/       # Medicine CRUD
│   │       │   ├── route.ts     # GET (list), POST (create)
│   │       │   └── [id]/route.ts
│   │       ├── dashboard/route.ts  # Dashboard stats
│   │       └── checks/route.ts  # Trigger expiry/low-stock checks
│   └── (dashboard)/
│       └── medical/             # NEW — Medical pages
│           ├── page.tsx         # Dashboard
│           ├── visits/page.tsx  # Visits list
│           ├── visits/new/page.tsx
│           └── medicines/page.tsx
├── components/
│   └── medical/                 # NEW — Medical UI components
├── lib/
│   ├── db/models/
│   │   ├── Patient.ts           # EXISTS
│   │   └── Medicine.ts          # EXISTS
│   ├── validations/
│   │   └── medical.ts           # NEW — Zod schemas
│   └── medical/                 # NEW — Business logic
│       ├── queries.ts
│       ├── stock.ts             # Atomic stock operations
│       └── checks.ts            # Expiry/low-stock checks
```

**Structure Decision**: Single Next.js App Router project (Option 1). Follows existing `next/app/api/[module]/` convention for API routes and `next/app/(dashboard)/[module]/` for pages.

## Complexity Tracking

> No constitution violations. Table left empty.
