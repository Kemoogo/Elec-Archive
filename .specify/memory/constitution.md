<!-- Sync Impact Report
Version change: 1.0.0 → 1.0.1
Modified principles: I. Security-First (added no self-registration rule)
Added sections: None
Removed sections: None
Templates requiring updates: ✅ plan-template.md, ✅ spec-template.md, ✅ tasks-template.md
Follow-up TODOs: None
-->

# الأرشيف אלקטרוני (Elec Archive) Constitution

## Core Principles

### I. Security-First (أمان أولاً — NON-NEGOTIABLE)

Every API route and server layout MUST enforce authentication and authorization before processing any request. JWT tokens MUST be stored in HttpOnly Cookies to prevent XSS and CSRF attacks. RBAC verification MUST happen at both the API Route level and Server Layout level. All user input MUST be sanitized before reaching MongoDB — zero trust on client data. Every create, update, and delete operation MUST be logged to the AuditLog with user ID, username, action, module, target ID, and IP address. Rate limiting MUST be applied to login attempts and API requests to prevent brute-force attacks. There MUST be no public self-registration — user accounts can ONLY be created by an Admin through the Admin Panel.

### II. SSR-First (عرض الخادم أولاً)

React Server Components (RSC) MUST be the default rendering strategy for all pages. The `'use client'` directive MUST only be used when absolutely necessary: interactive forms, charts, or real-time UI updates. Every page MUST be server-rendered by default; client interactivity MUST be isolated into small leaf components. This ensures maximum performance on local network deployments and reduces client-side JavaScript bundle size.

### III. Offline-First (بدون إنترنت — NON-NEGOTIABLE)

The system MUST operate completely offline with no internet dependency. All data, assets, and functionality MUST be available on the local network only. MongoDB MUST run locally via Docker. File uploads MUST be stored on the local filesystem (`public/uploads/`). No external API calls, CDNs, or third-party runtime dependencies are permitted.

### IV. Type Safety & Validation (سلامة الأنواع)

TypeScript MUST be used strictly across the entire codebase. The use of `any` type is PROHIBITED — every variable, parameter, and return value MUST have an explicit or properly inferred type. All form inputs and API request/response bodies MUST be validated using Zod schemas. Validation MUST occur on the server side; client-side validation is supplementary only.

### V. Quality Gates (بوابات الجودة)

ESLint and Prettier MUST be configured and enforced — no code merges without passing lint checks. Every code change MUST pass `npm run build` with zero errors and zero warnings before being accepted. The build validation step is NON-NEGOTIABLE and blocks all merges. Edge cases MUST be handled in every module: database connection failures, 404 for missing resources, unsupported file types/size limits, and concurrent edit conflicts.

### VI. Design-Driven UI via Stitch MCP (تصميم الواجهات)

All frontend pages and components MUST be generated using the Stitch MCP workflow: (1) Write a natural language prompt referencing `DESIGN.md`, (2) Extract the generated HTML/CSS, (3) Convert to Next.js components with Tailwind CSS + shadcn/ui, (4) Connect to API Routes + Mongoose. A single Design System MUST be extracted in Phase 0 and stored in `DESIGN.md` — all subsequent screens MUST reference this document for visual consistency. The UI MUST support Arabic RTL layout throughout.

## Additional Constraints

**Language & Direction**: The entire application UI MUST be in Arabic with RTL layout. All component structures, forms, tables, and navigation MUST render correctly in RTL mode.

**Tech Stack**:
- Frontend & Backend: Next.js 14+ (App Router)
- Database: MongoDB 7 via Mongoose ODM
- Styling: Tailwind CSS + shadcn/ui
- Validation: Zod
- Deployment: Docker Compose (Next.js + MongoDB) on Windows

**Scale**: The system MUST support 10–30 concurrent users on a local network. Performance optimization targets local intranet latency, not internet-scale.

**File Handling**: Uploaded files (faxes, documents, images) MUST be stored locally in `public/uploads/`. Supported formats: PDF and images only. Maximum file size MUST be enforced server-side.

## Development Workflow

**Phase-Based Execution**: Development MUST follow the 9-phase plan (Phase 0–8) in sequential order. Each phase has defined specs, deliverables, and Stitch tasks. No phase may be skipped.

**Code Organization**: Source code resides in the `next/` directory using Next.js App Router conventions. Specs and planning documents reside in `specs/`. Models go in `next/lib/db/models/`. Shared UI components go in `next/components/ui/shared/`. Module-specific components go in `next/components/[module]/`.

**API Conventions**: All API routes follow RESTful patterns under `next/app/api/[module]/`. Each route MUST: (1) verify authentication, (2) check RBAC permissions, (3) validate input with Zod, (4) perform the operation, (5) log to AuditLog, (6) return standardized responses.

**Role Hierarchy**: The system has four roles — Admin, Commander, Employee, Viewer. Only the Admin can create and manage user accounts; there is NO public registration. Permissions are granular per module (none/view/edit) and MUST be enforced at every access point.

## Governance

This constitution governs all development decisions for the الأرشيف الإلكتروني project. All code, specs, and architectural decisions MUST comply with the principles defined herein.

**Amendment Process**: Changes to this constitution require: (1) documented proposal with rationale, (2) impact analysis on existing phases and code, (3) version bump per semantic versioning rules, (4) update to `LAST_AMENDED_DATE`.

**Versioning**: MAJOR bump for backward-incompatible principle removals or redefinitions. MINOR bump for new principles or materially expanded guidance. PATCH bump for clarifications, wording fixes, non-semantic refinements.

**Compliance Review**: Every implementation plan MUST include a "Constitution Check" gate that validates compliance with all six core principles before Phase 0 research begins and again after Phase 1 design.

**Supremacy**: In case of conflict between this constitution and any other documentation, this constitution takes precedence.

**Version**: 1.0.1 | **Ratified**: 2026-03-23 | **Last Amended**: 2026-03-23
