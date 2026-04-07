# Implementation Plan: Phase 0 — Setup & Design System

**Branch**: `001-phase0-setup-design` | **Date**: 2026-03-23 | **Spec**: [specs/001-phase0-setup-design/spec.md](../spec.md)
**Input**: Feature specification from `/specs/001-phase0-setup-design/spec.md`

## Summary

Initialize the Elec Archive project from scratch: Next.js fullstack application with MongoDB, Docker deployment, all 11 database models, linting/formatting tools, design system via Stitch MCP, and project constitution. This phase delivers a working, buildable foundation that all subsequent phases (1–8) depend on.

## Technical Context

**Language/Version**: TypeScript 5.x (strict mode, no `any`), Next.js 14+ (App Router)
**Primary Dependencies**: Next.js, Mongoose 8.x, Tailwind CSS, shadcn/ui, Zod, ESLint, Prettier
**Storage**: MongoDB 7 via Mongoose ODM (local Docker container)
**Testing**: Vitest + React Testing Library (for future test phases; Phase 0 is setup only)
**Target Platform**: Local server (Windows + Docker), Node.js 20+ LTS
**Project Type**: web-service (fullstack — frontend + backend in single Next.js app)
**Performance Goals**: Support 10–30 concurrent users on local network; page load <2s on intranet
**Constraints**: Completely offline (no internet dependency), Arabic RTL layout, local file storage only, no external CDNs or APIs
**Scale/Scope**: 10–30 users, ~16 UI screens (future phases), 11 database models, single Docker deployment

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Security-First | ✅ PASS | Phase 0 has no API routes yet; model definitions include password hashing, no self-registration enforced in User model |
| II. SSR-First | ✅ PASS | Root layout uses Server Components; no `'use client'` needed for Phase 0 |
| III. Offline-First | ✅ PASS | MongoDB runs locally via Docker; no external API calls; all assets local |
| IV. Type Safety & Validation | ✅ PASS | TypeScript strict mode configured; Zod installed; `any` prohibited via ESLint |
| V. Quality Gates | ✅ PASS | ESLint + Prettier configured; build must pass with zero errors; edge cases documented |
| VI. Design-Driven UI | ✅ PASS | Stitch MCP workflow defined; DESIGN.md deliverable specified |

**Gate Result**: ALL PASS — no violations, no complexity tracking needed.

## Project Structure

### Documentation (this feature)

```text
specs/001-phase0-setup-design/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output — all technical decisions resolved
├── data-model.md        # Phase 1 output — all 11 Mongoose models documented
├── quickstart.md        # Phase 1 output — developer setup guide
├── contracts/
│   └── project-init.md  # Project initialization workflow & file structure contract
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created here)
```

### Source Code (repository root)

```text
elec-archive/
├── .specify/                           # Spec Kit configuration
├── specs/                              # All specification documents
│   ├── CONSTITUTION.md                 # Project governance (already created)
│   ├── DESIGN.md                       # Design system from Stitch MCP
│   └── 001-phase0-setup-design/       # This feature
├── next/                               # Next.js application
│   ├── app/
│   │   ├── layout.tsx                  # Root layout (RTL, Arabic, html dir="rtl")
│   │   ├── page.tsx                    # Placeholder home page
│   │   └── api/                        # API routes (empty shell, Phase 1+)
│   ├── lib/
│   │   ├── db/
│   │   │   ├── connect.ts              # Mongoose singleton with retry logic
│   │   │   └── models/                 # All 11 Mongoose models
│   │   │       ├── User.ts
│   │   │       ├── Fax.ts
│   │   │       ├── Officer.ts
│   │   │       ├── Leave.ts
│   │   │       ├── Assignment.ts
│   │   │       ├── DailyRollcall.ts
│   │   │       ├── Patient.ts
│   │   │       ├── Medicine.ts
│   │   │       ├── Student.ts
│   │   │       ├── Course.ts
│   │   │       ├── Notification.ts
│   │   │       └── AuditLog.ts
│   │   └── uploads/                    # File upload utilities
│   ├── components/
│   │   └── ui/                         # shadcn/ui components (initialized)
│   ├── public/
│   │   └── uploads/                    # Local file storage
│   ├── .env.local                      # Environment variables
│   ├── .env.example                    # Template (committed, no secrets)
│   ├── next.config.ts
│   ├── tailwind.config.ts
│   ├── tsconfig.json
│   ├── package.json
│   ├── postcss.config.mjs
│   ├── components.json                 # shadcn/ui config
│   ├── .eslintrc.json
│   └── .prettierrc
├── docker-compose.yml                  # App + MongoDB services
├── Dockerfile                          # Multi-stage Next.js build
├── .gitignore
└── AGENTS.md                           # Agent context (auto-generated)
```

**Structure Decision**: Fullstack single-project (Option 2 pattern) — `next/` contains both frontend (app/) and backend (api/) in one Next.js App Router project. This matches the constitution's code organization rules.

## Complexity Tracking

No violations — all constitution principles are satisfied. This section is intentionally empty.
