# Research & Architecture Decisions: منظومة السجل التاريخي للوحدة (Phase 5)

**Feature Branch**: `014-historical-record`  
**Date**: 2026-11-15  
**Spec**: [spec.md](file:///home/karim/projects/Elec-Archive/specs/014-historical-record/spec.md)

## 1. RBAC & Separation of Add vs. Edit/Delete Governance

- **Decision**: Introduce `historical_record: ModulePermission` (`"none" | "view" | "edit"`) across `User` schema, `ModulePermissions` type, JWT session hydration (`authenticate()`), Zod user schemas (`createUserSchema`, `updateUserSchema`), Admin user management modals (`CreateUserModal`, `EditUserModal`), `DashboardLayout` route guard, and `AuthenticatedNavbar`.
- **Automatic Grants for Admin & Commander**:
  - `hasModuleAccess(user, "historical_record", level)` grants `"admin"` full access and grants `"commander"` automatic `"view"` and `"edit"` (Add-only) access regardless of stored explicit `permissions.historical_record`, while `CreateUserModal` / `EditUserModal` also default `historical_record` to `"edit"` when role is `"commander"` or `"admin"`.
  - **Strict Governance Split (FR-002 / FR-003)**:
    - Create dedicated authorization helpers in `next/lib/historical-record/access.ts`:
      - `canViewHistoricalRecord(user)` → `hasModuleAccess(user, "historical_record", "view")`
      - `canAddHistoricalRecord(user)` → `hasModuleAccess(user, "historical_record", "edit")`
      - `canMutateOrDeleteHistoricalRecord(user)` → strictly `user.role === "admin"` ONLY.
    - All `PATCH` and `DELETE` endpoints (`/visits/[id]`, `/commanders/[id]`, `/milestones/[id]`) and `PUT /unit-profile` (when a profile already exists) reject any non-`admin` user with HTTP `403`, even if they have `historical_record: "edit"` or `role === "commander"`.
- **Rationale**: Decoupling "append/add" capability (`edit` permission) from "historical modification/deletion" (`role === "admin"`) prevents tampering with historical records by operational users while honoring existing `ModulePermission` enums (`none | view | edit`) in `/admin`.
- **Alternatives Considered**:
  - Adding a fourth permission level `"append"` to `ModulePermission`: Rejected because `User` schema, Zod schemas, and Admin UI dropdowns standardize on `none | view | edit`, and PRD/spec explicitly specify `historical_record` (`none / view / edit`) with Admin-only edit/delete.

## 2. Atomic Closing of Previous Current Commander

- **Decision**: Implement atomic previous-commander closure inside `POST /api/historical-record/commanders`. When creating a new commander with `isCurrent: true`, if an existing `HistoricalCommander` has `isCurrent: true`:
  - Request payload MUST include `previousCommanderEndDate` (ISO date string, pre-filled in UI with the new commander's `startDate`).
  - Server validates `previousCommanderEndDate >= previousCommander.startDate` and `previousCommanderEndDate <= newCommander.startDate`.
  - Server updates the previous commander (`isCurrent = false`, `endDate = previousCommanderEndDate`) and inserts the new commander, logging both the closure (`UPDATE` on previous commander's `_id` in `AuditLog`) and the creation (`CREATE` on new commander's `_id` in `AuditLog`). If insertion fails after update (or using a Mongoose session/rollback fallback for standalone MongoDB without replica set), restore previous commander state on error.
- **Rationale**: Local containerized MongoDB may run as a single-node instance (without replica-set multi-document transactions). Explicit validation before write + compensating rollback guarantees atomicity in single-node MongoDB 7 while keeping `PATCH /commanders/[id]` locked strictly to `Admin` only.
- **Alternatives Considered**:
  - Allowing `edit` users to call `PATCH /commanders/[id]` directly: Rejected per Clarification Q1 (Option A), which keeps `edit` users strictly inside the Add modal and closes the previous commander atomically on `POST`.

## 3. Commander Date Overlap & Multi-Term Support

- **Decision**: Support multiple non-overlapping command terms for the same officer (`officerId` is NOT unique in `HistoricalCommander`).
- **Overlap Validation Rule**:
  - Let each commander interval be `[start, end]` where `end = isCurrent ? +Infinity : endDate`.
  - Excluding the previous `isCurrent` commander being atomically closed at `previousCommanderEndDate` (whose closed interval becomes `[prevStart, previousCommanderEndDate]`), check all other existing `HistoricalCommander` records for interval overlap: two intervals `[aStart, aEnd]` and `[bStart, bEnd]` overlap if `aStart < bEnd && bStart < aEnd` (strict inequality allows seamless handoff on the exact same day, e.g., Commander 1 ends `2024-06-30` and Commander 2 starts `2024-06-30`).
  - Same rule applies on `Admin` `PATCH /commanders/[id]` (excluding the record being edited).
- **Rationale**: Military unit command handoffs routinely occur on the same calendar date (`endDate === next.startDate`); strict `<` boundary comparison prevents false-positive overlap errors on handoff day while blocking true multi-day overlaps.

## 4. Immutable Officer Snapshot & Physical Photo Isolation

- **Decision**:
  - `HistoricalCommander.officerId` stores `Types.ObjectId` with `ref: "Officer"` ONLY for optional provenance metadata — NO Mongoose `pre/post` delete hooks or `Officer` `DELETE` cascade logic may touch `HistoricalCommander`.
  - On `POST /api/historical-record/commanders`, fetch the `Officer` document on the server (`Officer.findById(officerId).lean()` — querying ALL officers regardless of `isInUnit` or `employmentStatus`, per FR-006 / Constitution Principle VII historical-archive exception).
  - Copy snapshot fields into `officerSnapshot`:
    - `militaryId: officer.militaryId`
    - `fullName: officer.fullName`
    - `rank: officer.rank` (stored as `OfficerRank` / string)
    - `seniorityNumber: officer.seniorityNumber`
  - **Photo Isolation**:
    - If user uploads a custom photo (`photo` file in multipart FormData), validate magic bytes (JPG/PNG/WebP, max 10MB) and save to `public/uploads/historical-record/commanders/<timestamp>_<uuid>.<ext>` -> `photoUrl = "/uploads/historical-record/commanders/..."`.
    - Else if `officer.photoUrl` exists and points to an existing local file under `public/uploads/officers/photos/`, physically copy (`fs.copyFile`) that file into `public/uploads/historical-record/commanders/<timestamp>_<militaryId>.<ext>` -> `photoUrl = "/uploads/historical-record/commanders/..."`.
    - Else `photoUrl = undefined` (UI renders a clean Sapphire Archive rank/shield placeholder).
- **Rationale**: Physical copy guarantees that `DELETE /api/officers/[id]` or `POST /api/officers/[id]/photo` (which unlinks old officer photos) can never cause broken images or data loss in the Historical Record.

## 5. Local Image Upload Validation, Storage & Cleanup

- **Decision**: Create a dedicated upload helper `next/lib/historical-record/uploads.ts` reusing `verifyMagicBytes` from `next/lib/uploads/index.ts`.
  - Allowed formats strictly: `.jpg`, `.jpeg`, `.png`, `.webp` (both extension AND MIME AND magic-bytes verified; SVG explicitly blocked to prevent XSS).
  - Max file size: **10 MB** per image (`10 * 1024 * 1024` bytes).
  - Max photos per visit or milestone: **10** images.
  - Isolated sub-directories under `public/uploads/historical-record/`:
    - `visits/`
    - `commanders/`
    - `unit/`
    - `milestones/`
  - Path traversal guard (`resolve` + prefix check `targetPath.startsWith(targetDir + sep)`) on both write and cleanup.
  - **Cleanup on Admin Delete or Admin Photo Removal**: When `Admin` deletes a visit/commander/milestone or removes specific photo paths during `PATCH` (or replaces `emblemUrl` in `PUT /unit-profile`), unlink only the removed file(s) strictly inside `public/uploads/historical-record/...` (silently ignoring `ENOENT`). Never touch `public/uploads/officers/`.
- **Rationale**: Matches `next/lib/uploads/index.ts` and `next/app/api/officers/[id]/photo/route.ts` security guarantees while keeping storage strictly local (Offline-First).

## 6. Officer Selector (`CustomSelect`) & Debounced Search UX

- **Decision**:
  - Enhance `CustomSelect` (`next/components/ui/custom-select.tsx`) with an optional `searchable?: boolean` and `searchPlaceholder?: string` prop (default `false` so existing callers are 100% unchanged). When `searchable` is enabled, render a sticky search input inside the portaled listbox filtering options by `label`, `description`, or `badge` (allowing search by officer fullName, militaryId, seniorityNumber, or rank).
  - Fetch officers for the commander form from a dedicated endpoint `GET /api/historical-record/officers-options` (gated by `canAddHistoricalRecord(user)` or `canViewHistoricalRecord(user)`) instead of `/api/officers` so users with `historical_record: edit` (who might NOT have `officers: view`) can still load the complete historical officer list (`isInUnit: true | false`)!
  - Timeline search on Visits, Commanders, and Milestones uses `useDebounce(searchInput, 450)` (with immediate trigger on Enter / search button click), minimum 2 characters guard (`trimmed.length >= 2` or empty to reset), and `AbortController` to cancel stale `fetch` requests.
- **Rationale**:
  1. Prevents a subtle RBAC bug where an officer with `historical_record: edit` and `officers: none` would get `403` from `/api/officers`.
  2. Keeps `CustomSelect` as the single standard dropdown component per Sapphire Archive mandates.

## 7. Double-Confirmation Modal with Mandatory Reason (Admin Governance)

- **Decision**: Build a reusable `HistoricalGovernanceModal` wrapping `ModalShell` + `ModalActions` (with `overlayClassName="bg-black/40"`, zero `backdrop-blur`, no non-brand `amber/orange/yellow` colors):
  - **Edit Flow (Admin only)**:
    - Step 1: Edit form (`ModalShell`) with dirty tracking (`isDirty`). Submitting opens Step 2 (or transitions inside the modal to confirmation step).
    - Step 2 (Double Confirmation): Summary of changes + mandatory `reason` textarea (min 3 characters, trimmed) + explicit confirmation checkbox/action before calling `PATCH` / `PUT`.
  - **Delete Flow (Admin only)**:
    - Step 1: Record summary & deletion warning banner using Sapphire Blue (`bg-(--color-primary)/5 border border-(--color-primary)/20 text-(--color-primary)`).
    - Step 2: Mandatory `reason` input + typed/checkbox confirmation + `btn-destructive` confirm button (`ModalActions` `submitVariant="destructive"`).
- **Unit Profile Initial Setup vs Edit (Clarification Q4)**:
  - When `UnitHistoricalProfile` does not exist yet (`profile === null`), `Admin` sees an empty-state CTA "تأسيس البطاقة التعريفية للوحدة" opening the create form; `PUT /api/historical-record/unit-profile` treats initial creation as `CREATE` (no reason required, logged as `AuditAction: "CREATE"`).
  - Once `profile` exists, `PUT /api/historical-record/unit-profile` treats updates as `UPDATE`, requiring double confirmation and non-empty `reason` (min 3 chars), logged as `AuditAction: "UPDATE"` with reason in `AuditLog.description`.

## 8. Duration Calculation & Chronological Timeline Ordering

- **Decision**:
  - Write a pure shared helper `calculateCommandDuration(startDate, endDate, isCurrent)` in `next/lib/historical-record/duration.ts` computing exact calendar years, months, and days between `startDate` and `(isCurrent ? today : endDate)` and returning formatted Arabic text (e.g., `سنتان و 3 أشهر و 14 يوماً` / `4 أشهر و 10 أيام`).
  - Default sort order on all 3 timelines (Visits, Commanders, Milestones): `sortOrder = "desc"` (الأحدث أولاً), with a single toggle button switching to `sortOrder = "asc"` (الأقدم أولاً).
  - Visits & Milestones filter by `year` (`visitDate` / `milestoneDate`) + `search` (plus `category` on Milestones). Commanders filter by `year` (active during that year or started in that year), `status` (`all` | `current` | `former`), and `search`.
