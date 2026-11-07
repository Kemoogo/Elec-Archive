<!-- Sync Impact Report
Version change: 1.1.1 → 1.2.0
Modified principles: III (Offline-First: Tooling updated to Podman/Docker local containers), V (Quality Gates & Main Branch Protection), VI (Design-Driven UI & Layout Enforcement)
Added sections: VII (Operational Personnel Isolation: Strict Archival for Out-of-Unit Personnel)
Removed sections: None
Templates requiring updates: None
Follow-up TODOs: None
Notes: MINOR bump — ratified Principle VII for strict out-of-unit personnel isolation across all operational workflows, and aligned container deployment tooling to Podman (podman-compose.yml / Containerfile) and Docker Compose across Linux and Windows Server environments.
-->

# الأرشيف الإلكتروني (Elec Archive) Constitution

## Core Principles

### I. Security-First (أمان أولاً — NON-NEGOTIABLE)

Every API route and server layout MUST enforce authentication and authorization before processing any request. JWT tokens MUST be stored in HttpOnly Cookies to prevent XSS and CSRF attacks. RBAC verification MUST happen at both the API Route level and Server Layout level. All user input MUST be sanitized before reaching MongoDB — zero trust on client data. Every create, update, and delete operation MUST be logged to the AuditLog with user ID, username, action, module, target ID, and IP address. Rate limiting MUST be applied to login attempts and API requests to prevent brute-force attacks. There MUST be no public self-registration — user accounts can ONLY be created by an Admin through the Admin Panel.

### II. SSR-First (عرض الخادم أولاً)

React Server Components (RSC) MUST be the default rendering strategy for all pages. The `'use client'` directive MUST only be used when absolutely necessary: interactive forms, charts, or real-time UI updates. Every page MUST be server-rendered by default; client interactivity MUST be isolated into small leaf components. This ensures maximum performance on local network deployments and reduces client-side JavaScript bundle size.

### III. Offline-First (بدون إنترنت — NON-NEGOTIABLE)

The system MUST operate completely offline with no internet dependency. All data, assets, and functionality MUST be available on the local network only. MongoDB MUST run locally via isolated container runtime (Podman or Docker via `podman-compose.yml` / `Containerfile`). File uploads MUST be stored on the local filesystem (`public/uploads/`). No external API calls, CDNs, or third-party runtime dependencies are permitted.

### IV. Type Safety & Validation (سلامة الأنواع)

TypeScript MUST be used strictly across the entire codebase. The use of `any` type is PROHIBITED — every variable, parameter, and return value MUST have an explicit or properly inferred type. All form inputs and API request/response bodies MUST be validated using Zod schemas. Validation MUST occur on the server side; client-side validation is supplementary only.

### V. Quality Gates & Main Branch Protection (بوابات الجودة وحماية الفرع الرئيسي — NON-NEGOTIABLE)

1. **Quality Gates**: ESLint and formatting standards MUST be configured and enforced. `npx tsc --noEmit` MUST pass with 0 errors. `npm run build` is run ONLY when strictly necessary (e.g., major architectural changes, releases/deployments, or explicit user request) to maintain rapid iteration speed, and is NOT required after routine edits or minor modifications. Edge cases MUST be handled in every module: database connection failures, 404 for missing resources, unsupported file types/size limits, and concurrent edit conflicts. All search operations MUST implement debouncing (500ms), min-length guards (>= 2 chars), and immediate Enter triggers to protect server resources. After editing code, `graphify auto-update .` MUST be executed to maintain the structural AST navigation index.
2. **Main Branch Protection (حماية الفرع الرئيسي main/master)**: Under NO circumstances may any code be merged into or switched to the `main` or `master` branch during development or iteration. All work MUST be performed on dedicated, isolated feature branches. Switching to or merging into `main`/`master` is STRICTLY PROHIBITED until:
   - The application feature or task is completely finished, fully functional, and verified.
   - All quality gates pass (`npx tsc --noEmit` 0 errors, lint checks, audit logging verified).
   - Full UI layout and design system compliance audit is successfully completed.
   - **EXPLICIT USER ORDER (بأمر صريح ومباشر من المستخدم)**: The agent MUST NOT merge into or switch to `main`/`master` autonomously; it requires direct, explicit command from the user. Without this explicit command, work stays on the feature branch.

### VI. Design-Driven UI & Layout Enforcement — Sapphire Archive (تصميم الواجهات والالتزام الصارم بالـ UI Layout)

All frontend pages and components MUST adhere strictly to the Sapphire Archive Design System ("The Digital Monolith") and layout standards. The living Single Source of Truth (SSOT) for all visual styles, color tokens, typography, inputs, tables, badges, and modals is the interactive Playground at `/theme-playground` (`next/app/(dashboard)/theme-playground/page.tsx`) along with centralized UI components in `next/components/ui/`.
- **Mandatory Tables Layout**: Every table across all modules MUST use `MainTable` (`@/components/ui/Table`) directly (without redundant outer `<SectionWrapper>` since `MainTable` self-encapsulates it). Table headers use `bg-[var(--color-primary)] text-white`. Primary entity in table: highlighted with `text-(--color-primary) font-black hover:underline hover:text-(--app-info)`. Actions column & buttons: MUST use `ActionButton` with `btn-action-primary` (`text-(--color-primary) hover:text-(--app-info)`). All secondary columns, text, dates, ranks: calm neutral `text-(--app-muted-foreground)`. Use `showSerialNumber` for the standard Egyptian military serial column (`م`).
- **Mandatory Modals Layout**: All modals MUST use `ModalShell` with `overlayClassName="bg-black/40"`. Backdrop blur (`backdrop-blur`) is STRICTLY PROHIBITED. Titles must be clean strings with icon badge. Footer MUST use `ModalActions` with unified buttons (`btn-primary`, `btn-secondary`, `btn-destructive`).
- **Mandatory Inputs & Form Layout**: Dropdowns MUST use `CustomSelect` (raw `<select>` is strictly prohibited). Dates MUST use `DateField`. Focus ring on all inputs MUST be `focus:outline-none focus:ring-blue-500/20 focus:border-blue-500`. Labels MUST use officer label pattern `text-xs font-bold text-(--app-muted-foreground) block mr-1`.
- **Color Discipline**: Non-brand colors (`amber`, `orange`, `yellow`) and raw `text-slate-500` are STRICTLY PROHIBITED. Use design tokens: `--color-primary`, `--app-muted-foreground`, `--app-surface-container`, `--app-border`. Red and green are restricted solely to toast notifications (`ToastProvider`) and standalone modal delete buttons (`btn-destructive`).
- **Language & Layout**: The entire UI MUST support Arabic RTL layout (`dir="rtl"`) throughout. Reusable components from `@/components/ui/` MUST be used rather than ad-hoc inline styles.

### VII. Operational Personnel Isolation (عزل تام للأفراد والضباط المنقولين وخارج الوحدة — NON-NEGOTIABLE)

Any officer or military personnel transferred, retired, terminated, or departed (`isInUnit: false` or non-active) is strictly classified as ARCHIVED (`مؤرشف`).
- Out-of-unit personnel MUST NEVER appear in any active operational workflow, dropdown, select modal, active register, or calculation:
  - Leaves register and leave request modals (سجل الإجازات وطلبات الإجازة).
  - Daily rollcall and operational attendance engines (التمام اليومي ومحرك حساب القوة).
  - Missions, travel orders, and external assignments (المأموريات والتكليفات وخطوط السير).
  - Position placements, substitutions, and roster duties (تسليم الوظائف والنوبتجيات).
  - Dashboard active personnel counters (إحصائيات القوة الفعلية بالوحدة).
- Out-of-unit personnel have ONLY ONE place in the system: the Historical Archive (أرشيف الضباط السابقين / سجل الحركات وتاريخ الخدمة).
- All active queries, calculation engines, and mutation APIs MUST enforce `{ isInUnit: true, employmentStatus: "active" }`. Assigning an out-of-unit officer to an operational activity is strictly prohibited at both API and UI levels.

## Additional Constraints

**Language & Direction**: The entire application UI MUST be in Arabic with RTL layout. All component structures, forms, tables, and navigation MUST render correctly in RTL mode.

**Tech Stack**:
- Frontend & Backend: Next.js 16 (App Router, React 19)
- Database: MongoDB 7 via Mongoose 9.x ODM
- Styling: Tailwind CSS 4 + shadcn/ui
- Validation: Zod 4
- Deployment: Podman Compose / Docker Compose (Next.js + MongoDB + Nginx) on Linux or Windows Server

**Scale**: The system MUST support 10–30 concurrent users on a local network. Performance optimization targets local intranet latency, not internet-scale.

**File Handling**: Uploaded files (faxes, documents, images) MUST be stored locally in `public/uploads/`. Supported formats: PDF and images only. Maximum file size MUST be enforced server-side.

## Development Workflow

**Phase-Based Execution**: Development MUST follow the 9-phase plan (Phase 0–8) in sequential order. Each phase has defined specs, deliverables, and tasks. No phase may be skipped.

**Code Organization**: Source code resides in the `next/` directory using Next.js App Router conventions. Specs and planning documents reside in `specs/`. Models go in `next/lib/db/models/`. Shared UI components go in `next/components/ui/shared/`. Module-specific components go in `next/components/[module]/`.

**API Conventions**: All API routes follow RESTful patterns under `next/app/api/[module]/`. Each route MUST: (1) verify authentication, (2) check RBAC permissions, (3) validate input with Zod, (4) perform the operation, (5) log to AuditLog, (6) return standardized responses.

**Role Hierarchy**: The system has four roles — Admin, Commander, Employee, Viewer. Only the Admin can create and manage user accounts; there is NO public registration. Permissions are granular per module (none/view/edit) and MUST be enforced at every access point.

## Governance

This constitution governs all development decisions for the الأرشيف الإلكتروني project. All code, specs, and architectural decisions MUST comply with the principles defined herein.

**Amendment Process**: Changes to this constitution require: (1) documented proposal with rationale, (2) impact analysis on existing phases and code, (3) version bump per semantic versioning rules, (4) update to `LAST_AMENDED_DATE`.

**Versioning**: MAJOR bump for backward-incompatible principle removals or redefinitions. MINOR bump for new principles or materially expanded guidance. PATCH bump for clarifications, wording fixes, non-semantic refinements.

**Compliance Review**: Every implementation plan MUST include a "Constitution Check" gate that validates compliance with all core principles before Phase 0 research begins and again after Phase 1 design.

**Supremacy**: In case of conflict between this constitution and any other documentation, this constitution takes precedence.

**Version**: 1.2.0 | **Ratified**: 2026-03-23 | **Last Amended**: 2026-11-07
