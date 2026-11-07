# Elec-Archive Development Guidelines

Auto-generated from all feature plans. Last updated: 2026-11-07

## Active Technologies
- TypeScript 5.x (strict mode, no `any`)
- Next.js 16+ (App Router, React 19, Server Components)
- Mongoose 9.x + MongoDB 7 via local container (Podman / Docker)
- Tailwind CSS 4 + shadcn/ui
- Zod 4 (validation)
- ESLint (with unused-imports plugin)
- Podman Compose / Docker Compose (`podman-compose.yml` + `Containerfile` + Nginx)

## Project Structure

```text
next/
├── app/                 # Next.js App Router (pages + API routes)
├── lib/db/              # Mongoose connection + models
├── components/ui/       # Centralized Sapphire Archive UI components
└── public/uploads/      # Local file storage (documents, faxes, attachments)

specs/                   # Spec Kit documents & feature specifications
podman-compose.yml       # Podman multi-container configuration (app + mongo + nginx)
Containerfile            # Multi-stage production container build
```

## Commands

```bash
cd next && npm run dev        # Start dev server
cd next && npm run build      # Build for production (required for releases/major refactors)
cd next && npm run lint       # Run ESLint
graphify auto-update .        # Refresh code structure AST index after code edits
podman-compose up -d          # Start local containers (MongoDB + App + Nginx)
podman-compose down           # Stop local containers
```

## Code Style

- TypeScript strict mode — `any` is PROHIBITED
- React Server Components by default; `'use client'` only when necessary
- Arabic RTL layout throughout (`dir="rtl"`)
- All API routes: verify auth → check RBAC → validate with Zod → operate → audit log → respond
- Models in `next/lib/db/models/`, shared UI in `next/components/ui/`
- Zod schemas for all form inputs and API request/response bodies

## Recent Changes
- 012-quarterly-backup-retention (COMPLETED): Automated quarterly backup system (March, June, September, December), strict 4-version retention manager, on-demand export and direct download, authenticated disaster recovery & restore interface with double verification, disk space pre-check, and concurrency mutex locking.
- 011-students-mdb-upgrade (COMPLETED): Military students affairs upgrade with official Access .mdb database parsing engine (/usr/bin/mdb-export), smart preview and upsert import, batch flow tracking (scheduled, arrived, remaining), dynamic qualification matrix, strict relocation/transfer status lifecycle (in_unit, relocated, transferred_to_unit_personnel), and daily rollcall engine with 06:00 AM lockdown.
- 010-arkan-harb-upgrade (COMPLETED): Operations & Staff upgrade with Fax-to-Mission bilateral conversion, Medical Point auto-sync for leaves/rests/hospitals, official A4 Military Travel Orders with conflict check engine, Clearance Documents upload, Officers Affairs dynamic position and missions history tab, Monthly Duty Roster with distribution equity metrics, and Daily Incidents Log with commander instruction recording.
- 009-patient-medical-record (COMPLETED): Patient Medical Record with Allergies, Chronic Diseases, and Diagnosis tabs. Unified patient profile page with real-time record saving, strict Zod validation, and audit logging.
- 005-officers-affairs (UPGRADE): Added Accredited AcroForm 121 PDF Parsing & Verification Engine, Direct 121 Upload at Step 1 with Automatic Seniority & Issue Date Extraction, Strict accredited AcroForm format validation, ModalShell confirmation dialogues for update & deletion, and persistent file121IssueDate tracking across all workflows.

---

## Core Operational Mandates & Governance

All development MUST strictly comply with the project constitution at [.specify/memory/constitution.md](file:///home/karim/projects/Elec-Archive/.specify/memory/constitution.md).

### 1. Main Branch Protection (حظر الانتقال أو الدمج في الفرع الرئيسي إلا بأمر صريح من المستخدم)
- All development (features, improvements, bug fixes, refactors) MUST occur strictly on dedicated, isolated feature branches (e.g. `feature/<name>` or `refactor/<name>`).
- Switching to or merging into `main`/`master` is STRICTLY PROHIBITED until:
  1. The feature or modification is 100% complete, fully implemented, and thoroughly tested.
  2. TypeScript type check (`npx tsc --noEmit`) passes with 0 errors in strict mode.
  3. Full UI layout and design system compliance audit passes without any deviations.
  4. **AN EXPLICIT, DIRECT ORDER IS GIVEN BY THE USER ("بأمر مباشر وصريح من المستخدم")**.

### 2. Personnel Domain Isolation (عزل تام للأفراد والضباط المنقولين وخارج الوحدة)
- In accordance with Constitution Principle VII, any personnel or officer with `isInUnit: false` is strictly ARCHIVED (`مؤرشف`).
- Out-of-unit officers MUST NEVER appear in active operational workflows (leaves, daily rollcall, missions, position placements, roster duties, active count widgets). All operational queries MUST enforce `{ isInUnit: true, employmentStatus: "active" }`.

### 3. Centralized Shared Types (حظر الأنواع المحلية العشوائية)
- Creating ad-hoc local interfaces or duplicate entity `type` / `interface` declarations inside pages or components is STRICTLY PROHIBITED.
- All domain entity types MUST reside centrally in `@/types/` (e.g. `@/types/officer.ts`, `@/types/backup.ts`, `@/types/index.ts`) and model-shared logic in `next/lib/db/models/<Entity>.shared.ts`.

### 4. Audit Logging & Security
- Every CREATE, UPDATE, DELETE, REORDER, RESTOCK, IMPORT, STATUS_CHANGE, LOGIN, and LOGOUT across ALL modules MUST call `logAuditEvent()`.
- Ensure `targetId` passed to `logAuditEvent()` is a valid MongoDB `ObjectId` string (`doc._id.toString()`) and NOT an arbitrary custom ID string.

### 5. Search Debounce & Server Load Protection
- Search inputs MUST use debouncing (minimum 450-500ms delay), require minimum 2 characters before querying, trigger immediately on Enter key press or search button click, and cancel in-flight requests using `AbortController`.

### 6. Code Navigation Index (`graphify`)
- Always run `graphify auto-update .` after editing, refactoring, or creating source code files to keep the structural AST index (`graphify-out/graph.json`) synchronized.

---

## Design System — Sapphire Archive ("The Digital Monolith")

> [!IMPORTANT]
> **SINGLE SOURCE OF TRUTH (SSOT):** The page `/theme-playground` (`next/app/(dashboard)/theme-playground/page.tsx`) is the **sole and definitive reference** for all visual designs, color tokens, typography, inputs, tables, badges, and modals. NEVER write ad-hoc inline classes; always use centralized reusable components from `@/components/ui/`.

### CSS Design Tokens
```
--app-primary / --color-primary             : #1E3C72 (deep navy)
--app-primary-hover / --color-primary-hover : #2a5298
--app-background                            : #f8fafc
--app-surface / --color-surface             : #ffffff
--app-surface-container                     : #f1f5f9
--app-foreground                            : #172b53
--app-muted-foreground / --color-muted      : #4a638c
--app-border / --color-border               : #e2e8f0
--app-success                               : #10b981
--app-error                                 : #ef4444
--app-info                                  : #3b82f6
--app-white                                 : #ffffff
```

### Color Palette & Restrictions
- **PROHIBITED:** Non-brand colors (`amber`, `orange`, `yellow`) and raw `text-slate-500` are strictly PROHIBITED across all pages, cards, tables, and alert banners. Warnings MUST use Sapphire Blue (`bg-(--color-primary)/5 border border-(--color-primary)/20 text-(--color-primary)`) or calm neutral (`bg-(--app-surface-container)`).
- **RESTRICTED:** Green and Red are ONLY permitted in: (1) Toast notifications (`ToastProvider` — green for success, red for error), and (2) Standalone modal delete confirmation buttons (`btn-destructive`).
- **Interactive Hover:** Buttons, tabs, and links MUST highlight with Primary Sapphire Blue (`hover:text-(--color-primary)` or `hover:text-(--app-info)`). Near-black/slate hover text is PROHIBITED.

### Reusable Component Mandates
1. **Tables (`MainTable` from `@/components/ui/Table`):**
   - Self-contained: DO NOT wrap `MainTable` in an external `<SectionWrapper>`.
   - Header: `bg-[var(--color-primary)] text-white`.
   - Primary Entity column: MUST use `text-(--color-primary) font-black hover:underline hover:text-(--app-info)`.
   - Actions Column & Buttons: MUST use `ActionButton` with `btn-action-primary` (`text-(--color-primary) hover:text-(--app-info)`).
   - Secondary columns (ranks, IDs, dates, badges): calm neutral `text-(--app-muted-foreground)`.
   - Use `showSerialNumber` for the standard Egyptian military index column (`م`).
2. **Modals (`ModalShell` from `@/components/ui/modal-shell`):**
   - Dialog container with clean `overlayClassName="bg-black/40"`. **Backdrop blur (`backdrop-blur`) is STRICTLY PROHIBITED.**
   - Header: Plain string `title`, `icon={<Icon className="w-4 h-4" />} `, and optional `titleVariant`.
   - Footer: MUST use `ModalActions` with unified buttons (`btn-primary`, `btn-secondary`, `btn-destructive`). Binary naming enforced: Mutation modals use "إلغاء", View modals use "إغلاق".
3. **Inputs & Form Fields:**
   - Dropdowns: MUST use `CustomSelect` (`@/components/ui/custom-select`). Raw `<select>` is strictly PROHIBITED.
   - Dates: MUST use `DateField` (`@/components/ui/date-field`) for smart digit entry and ISO synchronization.
   - Focus ring: ALWAYS use primary blue `focus:outline-none focus:ring-blue-500/20 focus:border-blue-500`.
   - Labels: Use officer label pattern `text-xs font-bold text-(--app-muted-foreground) block mr-1`.
4. **Toasts (`ToastProvider` from `@/components/ui/toast`):**
   - Centralized notifications adhering to design tokens, RTL layout (`dir="rtl"`), and status icon badges. Call `showToast(message, "success" | "error" | "info")`.

### API Route Pattern
1. `authenticate()`
2. Check RBAC permissions
3. `checkApiRateLimit()`
4. `connectToDatabase()`
5. Parse & validate with Zod
6. Business logic
7. `logAuditEvent()`
8. Standardized response

---

<!-- SPECKIT START -->
System baseline is fully up to date on branch `main` (features 001 through 012 completed).
For subsequent feature planning, refer to `.specify/memory/constitution.md` and feature specs in `specs/`.
<!-- SPECKIT END -->
