# Implementation Plan: شئون الضباط — Officers Affairs Module

**Branch**: `005-officers-affairs` | **Date**: 2026-03-26 | **Spec**: [spec.md](./spec.md)  
**Revision Note**: Bootstrapped from specs/005-officers-affairs on 2026-04-10
**Input**: Feature specification from `/specs/005-officers-affairs/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command.

## Summary

Deliver the Officers Affairs module as a fullstack Next.js feature that covers officer registry, officer detail records, PDF-only document storage, daily rollcall drafting/submission with local draft recovery, commander rollcall review, leave/absence tracking, and assignment/promotion/mission timeline management. The design uses Stitch MCP-generated screen specifications before coding, SSR pages under the shared dashboard shell, normalized MongoDB collections for officer activity records, Zod-validated REST endpoints, per-route rate limiting, audit logging for every administrative action, and notification integration for rollcall submission plus an automatically scheduled 09:00 reminder worker for authorized staff.

## Technical Context

**Language/Version**: TypeScript 5.x (strict mode, no `any`)  
**Primary Dependencies**: Next.js 16 App Router, React 19, Mongoose 9.x, Tailwind CSS 4, Zod 4, jsonwebtoken, bcryptjs  
**Storage**: MongoDB 7 via Mongoose ODM (local Docker), local filesystem uploads for officer documents under `public/uploads/officers/`  
**Testing**: `npm run lint`, `npm run build`, plus manual role-based verification for officers list/detail/rollcall/leaves/assignments flows  
**Target Platform**: Local Windows-hosted intranet deployment via Docker, accessed from desktop browsers on the local network  
**Project Type**: Web application (fullstack Next.js)  
**Performance Goals**: Officer search/filter results render < 1s, end-to-end access to an officer record via search/filter < 15s in line with SC-001, officer record open < 2s, commander rollcall summary < 30s after submission, full daily rollcall entry/submission < 10 minutes for < 100 officers in line with SC-002  
**Constraints**: Fully offline, Arabic RTL only, auth + RBAC + defined per-route rate limiting on every route, PDF-only officer documents <= 5MB and <= 20 docs per officer, single submitted rollcall per day, no post-submission edits, unsent rollcall drafts must survive connection failure locally, automatic reminders run at 09:00 server-local time on Sunday-Thursday without external services  
**Scale/Scope**: 10-30 concurrent users, < 100 active officers per day, 4 SSR pages, 8-12 officers components, 8-10 API routes, 4 existing placeholder models upgraded to production-ready schemas

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Pre-Design | Post-Design | Details |
|-----------|------------|-------------|---------|
| **I. Security-First** | ✅ PASS | ✅ PASS | Officers pages stay behind dashboard auth. Every officers API follows auth -> rate limit -> RBAC -> Zod -> DB -> audit -> response. Rate limiting uses authenticated user ID as the primary key and IP as fallback, with baseline limits of 120 read requests/minute, 30 write requests/minute, and 10 document uploads/5 minutes. Read uses `permissions.officers=view/edit`; mutations require `edit`; commander summary is read-only. No self-registration changes. |
| **II. SSR-First** | ✅ PASS | ✅ PASS | Main pages (`/officers`, `/officers/[id]`, `/officers/rollcall`, `/officers/leaves`) are SSR. Interactive forms, filters, upload widgets, and rollcall entry controls are isolated into client leaf components. |
| **III. Offline-First** | ✅ PASS | ✅ PASS | Uses local MongoDB, local file storage, and existing in-app notifications only. Reminder workflow is implemented through local server execution, not external APIs, CDNs, or SaaS schedulers. |
| **IV. Type Safety** | ✅ PASS | ✅ PASS | All requests, filters, uploads, and mutation payloads are validated with Zod. Mongoose schemas are tightened to match the approved officer domain. TypeScript strict mode remains mandatory. |
| **V. Quality Gates** | ✅ PASS | ✅ PASS | Plan requires `npm run lint` and `npm run build` before merge and explicitly covers edge cases: duplicate military ID, missing rollcall entries, overlapping leave ranges, invalid documents, 404s, unauthorized access, and concurrent status drift during rollcall entry. |
| **VI. Design-Driven UI** | ✅ PASS | ⚠️ PARTIAL | T001/T002 require live Stitch MCP calls (not yet executed). Officers sub-navigation in dashboard layout (`next/app/(dashboard)/layout.tsx`) and NotificationBell visibility change (`next/app/(dashboard)/layout.tsx`) were implemented directly without Stitch generation — these extend existing layout shell rather than creating new screens. Resolution: run T001/T002 via Stitch MCP, then either regenerate layout with Stitch or document justified deviation for sub-nav changes. |

**Gate Result**: ⚠️ CONDITIONAL PASS — Principle VI requires T001/T002 execution via Stitch MCP before final merge approval.

## Project Structure

### Documentation (this feature)

```text
specs/005-officers-affairs/
├── plan.md                  # This file
├── spec.md                  # Feature specification
├── research.md              # Phase 0 decisions and tradeoffs
├── data-model.md            # Phase 1 entity and state design
├── quickstart.md            # Phase 1 implementation/verification guide
├── stitch/                  # Stitch prompts and generated layout notes
│   ├── officers-list.md
│   ├── officer-detail.md
│   ├── rollcall.md
│   └── leave-register.md
├── contracts/
│   └── officers-api.md      # Phase 1 REST/API contracts
└── tasks.md                 # Phase 2 output (via /speckit.tasks)
```

### Source Code (repository root)

```text
next/
├── app/
│   ├── (dashboard)/
│   │   └── officers/
│   │       ├── page.tsx                     # Officer list page (SSR)
│   │       ├── [id]/
│   │       │   └── page.tsx                 # Officer full record page (SSR)
│   │       ├── rollcall/
│   │       │   └── page.tsx                 # Draft/submit/view daily rollcall
│   │       └── leaves/
│   │           └── page.tsx                 # Department leave register
│   └── api/
│       └── officers/
│           ├── route.ts                     # GET officers, POST officer
│           ├── [id]/route.ts                # GET officer, PATCH officer
│           ├── [id]/documents/route.ts      # POST document, DELETE document
│           ├── rollcall/route.ts            # GET day status, POST submit/draft
│           ├── leaves/route.ts              # GET list, POST create
│           ├── leaves/[id]/route.ts         # PATCH update state/details
│           ├── assignments/route.ts         # GET list, POST create
│           └── assignments/[id]/route.ts    # PATCH update timeline event
├── components/
│   └── officers/
│       ├── OfficersTable.tsx
│       ├── OfficerFilters.tsx
│       ├── OfficerForm.tsx
│       ├── OfficerDocuments.tsx
│       ├── RollcallSheet.tsx
│       ├── RollcallSummary.tsx
│       ├── LeaveRegister.tsx
│       ├── LeaveAddModal.tsx                # Post-Implementation
│       ├── OfficerPromoteModal.tsx          # Post-Implementation
│       ├── OfficerTransferModal.tsx         # Post-Implementation
│       └── AssignmentTimeline.tsx
├── components/ui/
│   └── ScrollToTop.tsx                      # Post-Implementation
├── lib/
│   ├── db/models/
│   │   ├── Officer.ts                       # MODIFY: complete officer schema
│   │   ├── DailyRollcall.ts                 # MODIFY: draft/submitted lifecycle
│   │   ├── Leave.ts                         # MODIFY: richer leave business rules
│   │   └── Assignment.ts                    # MODIFY: richer timeline event model
│   ├── officers/
│   │   ├── access.ts                        # CREATE: officers permission helpers
│   │   ├── queries.ts                       # CREATE: shared SSR/API queries
│   │   └── reminders.ts                     # CREATE: rollcall reminder scheduling and delivery logic
│   ├── security/
│   │   └── rate-limit.ts                    # CREATE: local API rate limiting helper
│   ├── validations/
│   │   └── officers.ts                      # CREATE: officers Zod schemas
│   ├── notifications/
│   │   └── createNotification.ts            # MODIFY: officers reminder/submission support
│   └── uploads/
│       └── index.ts                         # MODIFY: officer PDF upload helper
├── scripts/
│   └── officers-rollcall-reminder.ts        # CREATE: automatic reminder worker entry

docker-compose.yml                           # MODIFY: add local officers reminder worker service
```

**Structure Decision**: Extend the existing Next.js App Router structure already used by the fax module. SSR pages live under `next/app/(dashboard)/officers/`, mutation endpoints under `next/app/api/officers/`, shared business logic under `next/lib/officers/` including reminder scheduling and delivery in `next/lib/officers/reminders.ts`, rate limiting under `next/lib/security/`, and UI leaf components under `next/components/officers/`. Stitch prompt/output notes are versioned under `specs/005-officers-affairs/stitch/`, and automatic reminders run through a local worker wired by `docker-compose.yml` and `next/scripts/officers-rollcall-reminder.ts`.

## Complexity Tracking

> No Constitution Check violations — this section is empty.

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|--------------------------------------|
| *None* | — | — |
