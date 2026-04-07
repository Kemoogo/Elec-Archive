# Implementation Plan: قسم الفاكس — Fax Management Module

**Branch**: `004-fax-module` | **Date**: 2026-03-26 | **Spec**: [spec.md](./spec.md)  
**Input**: Feature specification from `/specs/004-fax-module/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command.

## Summary

Full fax management module for the Elec Archive system. Covers fax upload (PDF/image), listing with search/filter/pagination, detail view with embedded file viewer, commander decision workflow (forward to user or department, or close directly), fax threading (bidirectional linking), and forwarded fax closure by authorized users. Builds on existing Phase 0-2 infrastructure (Auth, RBAC, Notifications, Audit Log). Requires schema updates to the existing Fax model (status enum simplification, compound uniqueness, structured forwarding fields).

## Technical Context

**Language/Version**: TypeScript 5.x (strict mode, no `any`)  
**Primary Dependencies**: Next.js 14+ (App Router), Mongoose 8.x, Tailwind CSS, shadcn/ui, Zod, bcryptjs  
**Storage**: MongoDB 7 via Mongoose ODM (local Docker), local filesystem for file uploads (`public/uploads/fax/`)  
**Testing**: Manual testing + `npm run build` validation (zero errors/warnings)  
**Target Platform**: Local Windows server (Docker), accessed via local network browsers  
**Project Type**: Web application (fullstack Next.js)  
**Performance Goals**: Page loads < 2s, search results < 1s, notifications within 5s (all on local network)  
**Constraints**: Fully offline (no internet), < 30 concurrent users, max 10MB file uploads, Arabic RTL only  
**Scale/Scope**: 10-30 users, hundreds to low thousands of faxes, 3 pages + 8 components + 7 API routes

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Details |
|-----------|--------|---------|
| **I. Security-First** | ✅ PASS | All API routes enforce auth + RBAC. Fax edit requires `permissions.fax: edit`. Commander decision restricted to `commander`/`admin` roles. Closure authorization checked per forwarding target. All operations logged to AuditLog. No self-registration. |
| **II. SSR-First** | ✅ PASS | Fax list page, detail page are server components. Only interactive elements (upload form, decision form, search filters, file viewer) use `'use client'`. |
| **III. Offline-First** | ✅ PASS | No external dependencies. Files stored locally. PDF viewer uses browser-native rendering. No CDN or external API calls. |
| **IV. Type Safety** | ✅ PASS | All inputs validated with Zod schemas. TypeScript strict mode. No `any` types. |
| **V. Quality Gates** | ✅ PASS | ESLint + Prettier enforced. Build must pass with 0 errors/warnings. Edge cases handled: corrupt files, duplicate numbers, unauthorized access, DB failures, 404s, concurrent edits. |
| **VI. Design-Driven UI** | ✅ PASS | All 3 pages designed in Stitch MCP first, then converted to Next.js. Follows DESIGN.md tokens. Arabic RTL throughout. |

**Gate Result**: ✅ ALL PASS — No violations.

## Project Structure

### Documentation (this feature)

```text
specs/004-fax-module/
├── plan.md              # This file
├── spec.md              # Feature specification
├── research.md          # Phase 0: Technical decisions
├── data-model.md        # Phase 1: Schema changes & state machine
├── quickstart.md        # Phase 1: Development guide
├── contracts/
│   └── fax-api.md       # Phase 1: API endpoint contracts
├── checklists/
│   └── requirements.md  # Spec quality checklist
└── tasks.md             # Phase 2 output (via /speckit.tasks)
```

### Source Code (repository root)

```text
next/
├── app/
│   ├── (dashboard)/
│   │   └── fax/
│   │       ├── page.tsx              # Fax list page (SSR)
│   │       ├── [id]/
│   │       │   └── page.tsx          # Fax detail page (SSR)
│   │       └── new/
│   │           └── page.tsx          # New fax upload page
│   └── api/
│       └── fax/
│           ├── route.ts              # GET (list), POST (create)
│           ├── search/
│           │   └── route.ts          # GET (search for linking)
│           └── [id]/
│               ├── route.ts          # GET (detail)
│               ├── decision/
│               │   └── route.ts      # PATCH (commander decision)
│               ├── close/
│               │   └── route.ts      # PATCH (close forwarded fax)
│               └── link/
│                   └── route.ts      # POST (link), DELETE (unlink)
├── components/
│   └── fax/
│       ├── FaxTable.tsx              # Server: fax list table
│       ├── FaxFilters.tsx            # Client: search/filter bar
│       ├── FaxUploadForm.tsx         # Client: upload form
│       ├── FaxViewer.tsx             # Client: PDF/image viewer
│       ├── CommanderDecision.tsx     # Client: decision form
│       ├── FaxThread.tsx             # Server: linked faxes
│       ├── FaxLinkSearch.tsx         # Client: link search UI
│       └── FaxClosureForm.tsx        # Client: closure form
├── lib/
│   ├── db/models/
│   │   └── Fax.ts                    # MODIFY: schema updates
│   └── validations/
│       └── fax.ts                    # CREATE: Zod schemas
```

**Structure Decision**: Follows existing Next.js App Router conventions established in Phase 0-2. API routes under `api/fax/`, pages under `(dashboard)/fax/`, components under `components/fax/`. No new directories needed at the top level.

## Complexity Tracking

> No Constitution Check violations — this section is empty.

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|--------------------------------------|
| *None* | — | — |
