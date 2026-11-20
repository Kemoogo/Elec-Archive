# Implementation Plan: منظومة السجل التاريخي للوحدة وحوكمة حماية البيانات التاريخية (Phase 5)

**Branch**: `014-historical-record` | **Date**: 2026-11-15 | **Spec**: [spec.md](file:///home/karim/projects/Elec-Archive/specs/014-historical-record/spec.md)  
**Input**: Feature specification from `specs/014-historical-record/spec.md` (PRD v2.4 Phase 5: `FEAT-HIS-01` to `FEAT-HIS-04` / `FR-08.1` to `FR-11.3`).

## Summary

Build the fifth operational module of Elec-Archive — **السجل التاريخي للوحدة (`/historical-record`)** — as an offline-first, Arabic RTL Next.js App Router module adhering strictly to the Sapphire Archive design system. The module provides three `FolderTabs` timelines: (1) **الزيارات الهامة** with multi-photo local upload and interactive Lightbox, (2) **قادة المركز والوحدة** linked to the complete `/officers` registry (`isInUnit: true | false`) with immutable snapshot creation, physical photo copying/isolation (`No Cascading Delete`), automatic leadership duration calculation, date-overlap protection, and atomic closure of the previous current commander on `POST`, and (3) **معلومات عن الوحدة** featuring a singleton Unit Profile card (Admin-only create/edit) and a categorized historical milestones timeline. Governance enforces a dedicated `historical_record` RBAC permission (`none | view | edit`) with automatic full add access for `Admin` and `Commander`, while strictly separating **Add** (`historical_record: edit`) from **Edit/Delete** (`Admin` only via `ModalShell` double-confirmation + mandatory reason + full `AuditLog` tracking).

## Technical Context

**Language/Version**: TypeScript 5.x (strict mode, `any` strictly prohibited)  
**Primary Dependencies**: Next.js 16+ (App Router, React 19, Server Components), Mongoose 9.x, Zod 4, Tailwind CSS 4 + shadcn/ui + Sapphire Archive UI (`@/components/ui/*`), Lucide React  
**Storage**: MongoDB 7 (local container via Podman/Docker Compose) + local filesystem uploads under `next/public/uploads/historical-record/{visits,commanders,unit,milestones}/`  
**Testing**: `npx tsc --noEmit`, `npm run lint`, targeted verification scripts in `next/scripts/` + manual/API acceptance scenarios in `quickstart.md`  
**Target Platform**: Linux / Windows Server local intranet container deployment (Podman / Docker Compose + Nginx)  
**Project Type**: Full-stack Next.js App Router web application (`next/` root)  
**Performance Goals**: Timeline queries < 200ms on local intranet; debounced search (500ms) with `>= 2` chars guard, immediate `Enter` trigger, and `AbortController`; local image loading without external CDNs  
**Constraints**: 100% Offline-First, full Arabic RTL (`dir="rtl"`), zero `any`, zero `backdrop-blur`, zero non-brand colors (`amber/orange/yellow`), no A4 print templates in Phase 5, zero cascade delete from `Officer`  
**Scale/Scope**: 10–30 concurrent local users; 1 new dashboard route (`/historical-record`), 8 API route files (15 HTTP handlers), 4 Mongoose models, centralized types in `next/types/historical-record.ts`, RBAC & Admin integration across ~10 existing auth/layout/admin/audit files

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Pre-Design & Post-Design Compliance Check | Status |
|---|---|---|
| **I. Security-First** | Every API route calls `authenticate()` → RBAC (`canViewHistoricalRecord` / `canAddHistoricalRecord` / `user.role === "admin"`) → `checkApiRateLimit()` → `connectToDatabase()` → Zod validation → `logAuditEvent()` with valid `ObjectId` `targetId`. Magic-byte image verification + path traversal guard on uploads. | **PASS** |
| **II. SSR-First** | `next/app/(dashboard)/historical-record/page.tsx` is a Server Component authenticating via `authenticate()`, checking `canViewHistoricalRecord`, fetching initial data server-side, and passing serialized DTOs & capabilities (`canAdd`, `isAdmin`) to modular `'use client'` leaf components. | **PASS** |
| **III. Offline-First** | All images stored locally under `next/public/uploads/historical-record/*`; zero external URLs, CDNs, or third-party services. | **PASS** |
| **IV. Type Safety & Validation** | Zero `any`. Centralized types in `next/types/historical-record.ts` + `next/lib/db/models/UnitHistoricalInfo.shared.ts`. Server-side Zod 4 schemas in `next/lib/validations/historical-record.ts`. | **PASS** |
| **V. Quality Gates & Main Branch Protection** | Development strictly on branch `014-historical-record` (never `main`/`master`). `npx tsc --noEmit` (0 errors), `npm run lint`, and `graphify auto-update .` enforced after edits. | **PASS** |
| **VI. Design-Driven UI (Sapphire Archive)** | Uses `FolderTabs`, `ModalShell` (`overlayClassName="bg-black/40"`, no `backdrop-blur`), `ModalActions`, `CustomSelect` (with optional `searchable` prop), `DateField`, `useToast`, `EmptyState`, `LoadingState`. No `amber/orange/yellow` or raw `text-slate-500`. Full RTL `dir="rtl"`. | **PASS** |
| **VII. Operational Personnel Isolation** | Principle VII explicitly states: *"Out-of-unit personnel have ONLY ONE place in the system: the Historical Archive (أرشيف الضباط السابقين / سجل الحركات وتاريخ الخدمة)"*. Tab 2 (`HistoricalCommander`) is a historical archive record, so querying all officers (`isInUnit: true \| false`) for historical commander selection is explicitly compliant and strictly isolated from active operational workflows. | **PASS** |

*Gate Result*: **ALL 7 CONSTITUTIONAL GATES PASS** (Pre-Design & Post-Design). No violations require Complexity Tracking justification.

## Project Structure

### Documentation (this feature)

```text
specs/014-historical-record/
├── spec.md                              # Feature specification + 4 clarifications
├── plan.md                              # This implementation plan
├── research.md                          # Phase 0 architectural decisions & rationales
├── data-model.md                        # Phase 1 centralized types, Mongoose schemas & invariants
├── quickstart.md                        # Verification scenarios & local quality commands
├── checklists/
│   └── requirements.md                  # Spec quality checklist
└── contracts/
    └── historical-record-api.md         # Complete REST API contracts & RBAC rules
```

### Source Code (repository root)

```text
next/
├── types/
│   ├── historical-record.ts                         # Centralized DTOs, snapshot & filter types
│   └── index.ts                                     # Re-export ./historical-record
├── lib/
│   ├── auth/
│   │   ├── types.ts                                 # Add historical_record to ModulePermissions
│   │   ├── middleware.ts                            # Hydrate historical_record permission
│   │   └── rbac.ts                                  # Commander automatic full add access for historical_record
│   ├── db/models/
│   │   ├── User.ts                                  # Add permissions.historical_record
│   │   ├── AuditLog.ts                              # Add "historical_record" to AuditModule
│   │   ├── HistoricalVisit.ts                       # Important visits model
│   │   ├── HistoricalCommander.ts                   # Commanders + immutable snapshot model
│   │   ├── UnitHistoricalInfo.shared.ts             # Milestone categories & labels
│   │   ├── UnitHistoricalInfo.ts                    # UnitHistoricalProfile + UnitHistoricalMilestone
│   │   └── index.ts                                 # Export new models & types
│   ├── validations/
│   │   ├── auth.ts                                  # Add historical_record to permissionsSchema (default "none")
│   │   ├── audit.ts                                 # Add "historical_record" to AUDIT_MODULES
│   │   ├── dashboard-notifications.ts               # Add "historical_record" to auditQuerySchema (used by /api/audit)
│   │   └── historical-record.ts                     # Zod 4 schemas for visits, commanders, unit-profile, milestones, admin reason
│   └── historical-record/
│       ├── access.ts                                # canViewHistoricalRecord, canAddHistoricalRecord, canMutateOrDeleteHistoricalRecord
│       ├── duration.ts                              # Command duration calculator (Arabic years/months/days)
│       ├── queries.ts                               # Server serializers & filter/overlap helpers
│       └── uploads.ts                               # Magic-byte image validation, local save, officer photo copy, safe unlink
├── components/
│   ├── ui/
│   │   └── custom-select.tsx                        # Add optional searchable/searchPlaceholder props (backwards-compatible)
│   ├── layout/
│   │   └── AuthenticatedNavbar.tsx                  # Register historical_record ("السجل التاريخي" -> /historical-record)
│   ├── admin/
│   │   ├── create-user-modal.tsx                    # Add historical_record to MODULES, MODULE_CONFIG, commander defaults
│   │   └── edit-user-modal.tsx                      # Support editing historical_record permission (safe "none" fallback for legacy users)
│   ├── dashboard/
│   │   ├── AuditLogPageClient.tsx                   # Add historical_record Arabic label
│   │   └── AuditLogTable.tsx                        # Add historical_record Arabic label
│   └── historical-record/
│       ├── HistoricalRecordClient.tsx               # Main FolderTabs container (Visits, Commanders, Unit Info)
│       ├── HistoricalVisitsTab.tsx                  # Timeline + debounced search + year filter + add/admin-edit-delete
│       ├── HistoricalVisitModal.tsx                 # Add / Admin-edit Visit modal with multi-photo upload
│       ├── HistoricalCommandersTab.tsx              # Commanders timeline + current commander highlight + filters
│       ├── HistoricalCommanderModal.tsx             # Add / Admin-edit Commander modal (CustomSelect + atomic prev close + duration preview)
│       ├── HistoricalUnitInfoTab.tsx                # Unit Profile card + Milestones timeline
│       ├── UnitProfileModal.tsx                     # Admin-only Create/Edit Unit Profile modal
│       ├── HistoricalMilestoneModal.tsx             # Add / Admin-edit Milestone modal
│       ├── HistoricalGovernanceModal.tsx            # Reusable Admin double-confirmation modal with mandatory reason
│       └── PhotoLightboxModal.tsx                   # Offline interactive Lightbox gallery (ModalShell, no backdrop-blur)
└── app/
    ├── (dashboard)/
    │   ├── layout.tsx                               # Add "historical_record" to moduleRoutes
    │   ├── page.tsx                                 # Normalize single-module redirect (replace("_", "-")) & add historical_record module card
    │   └── historical-record/
    │       └── page.tsx                             # SSR-first page component
    └── api/historical-record/
        ├── visits/
        │   ├── route.ts                             # GET, POST
        │   └── [id]/route.ts                        # PATCH (Admin), DELETE (Admin)
        ├── commanders/
        │   ├── route.ts                             # GET, POST (with atomic prev commander close)
        │   └── [id]/route.ts                        # PATCH (Admin), DELETE (Admin)
        ├── officers-options/
        │   └── route.ts                             # GET all officers (isInUnit: true | false) for CustomSelect
        ├── unit-profile/
        │   └── route.ts                             # GET, PUT (Admin)
        └── milestones/
            ├── route.ts                             # GET, POST
            └── [id]/route.ts                        # PATCH (Admin), DELETE (Admin)
```

**Structure Decision**: Follows the established Next.js App Router monorepo layout under `next/` (`app/`, `lib/`, `components/`, `types/`) with centralized types in `next/types/historical-record.ts`, shared constants in `next/lib/db/models/*.shared.ts`, and isolated local media storage in `next/public/uploads/historical-record/`.

## Complexity Tracking

> No constitutional violations detected; no complexity exemptions required.
