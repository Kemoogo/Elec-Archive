# Research: شئون الضباط — Officers Affairs Module

**Date**: 2026-03-26  
**Feature**: 005-officers-affairs

## R-001: Officer Master Record Shape

**Decision**: Promote `Officer` from a minimal placeholder model to the authoritative personnel record with `militaryId`, `fullName`, fixed-rank enum, `unit`, `position`, `phone`, `nationalId`, `employmentStatus`, `joinDate`, `birthDate`, and an embedded bounded document list.

**Rationale**: The spec defines the officer record as the module's primary source of truth. The current model is missing core identity and employment fields and uses `isActive` where the business domain requires `نشط / غير نشط / متقاعد`.

**Alternatives considered**:
- Keep `isActive` and add a second status field -> Rejected because it duplicates meaning and invites inconsistent state.
- Split core officer identity across multiple collections -> Rejected because the primary workflow is one unified officer file.

## R-002: Officer Document Storage Strategy

**Decision**: Keep officer documents embedded under the officer record, but store richer metadata per item (`originalName`, `storedPath`, `uploadedAt`, `sizeBytes`, `mimeType`, `uploadedBy`) and enforce PDF-only uploads, 5MB max per file, and 20 files max per officer under `public/uploads/officers/`.

**Rationale**: Document volume is intentionally small and officer-centric, so embedding keeps reads simple for the officer detail page. The existing generic upload helper is too permissive for personnel records and must be narrowed for this module.

**Alternatives considered**:
- Separate `OfficerDocument` collection -> Rejected because cross-officer document reporting is not required in this phase.
- Reuse fax upload rules as-is -> Rejected because fax allows images and 10MB files while officer documents must be PDF-only and smaller.

## R-003: Daily Rollcall Lifecycle

**Decision**: Model `DailyRollcall` as one record per date with a draft/submitted lifecycle, immutable submission metadata (`submittedBy`, `submittedAt`), and entry snapshots (`officerId`, `militaryId`, `fullName`, `rank`, `status`, `note`). Submission is allowed only when every active target officer has exactly one status.

**Rationale**: The spec requires data entry before submission, a single official submission per day, and a frozen historical record after submission. Snapshotting protects historical accuracy if officer details change later.

**Alternatives considered**:
- Store only `officerId` and populate live officer data on read -> Rejected because historical rollcall would drift after profile edits.
- Infer completeness at query time from current active officers -> Rejected because roster changes during entry would produce unstable validation.

## R-004: Leave and Absence Modeling

**Decision**: Expand `Leave` into a leave/absence register with date-only range validation, overlap prevention per officer, business subtypes from the clarified list, and status tracking suitable for officer file display and daily rollcall reconciliation.

**Rationale**: The current enum does not cover the approved leave types and only validates end date after start date. The spec also requires rejecting conflicting ranges and surfacing these records in the officer file.

**Alternatives considered**:
- Keep the current four-type enum and remap labels in the UI -> Rejected because it hides required business distinctions.
- Embed leave periods into the officer document -> Rejected because cross-officer filtering and overlap checks are cleaner in a dedicated collection.

## R-005: Assignment / Promotion / Mission Timeline

**Decision**: Keep a dedicated `Assignment` collection but enrich it into a general timeline event model with event `type`, `effectiveDate`, optional `endDate`, descriptive fields, and sorting by newest-effective date first in the officer file.

**Rationale**: Promotions are point-in-time, but assignments and missions can span periods. A standalone timeline collection supports chronology, filtering, and officer record composition better than embedding everything on the officer document.

**Alternatives considered**:
- Split mission into its own collection -> Rejected because the spec asks for one professional timeline.
- Keep a single `date` field only -> Rejected because it is too weak for interval-based events.

## R-006: Auth, RBAC, and Audit Integration

**Decision**: Reuse the established API pattern `authenticate -> RBAC -> Zod -> DB -> audit -> response` and enforce `permissions.officers=view|edit` for access, with `edit` required for create/update/submit actions and commander/admin treated as read-only overrides only where the spec explicitly calls for commander visibility.

**Rationale**: This matches the existing auth model, keeps behavior aligned with other modules, and satisfies the constitution's security-first and audit requirements without inventing a new access framework.

**Alternatives considered**:
- Department-only gating -> Rejected because the repo already uses module permissions as the source of truth.
- Role-only gating -> Rejected because it is too coarse for viewer and employee use cases.

## R-007: Notifications and 09:00 Reminder Delivery

**Decision**: Reuse the existing notification infrastructure for two officers events: commander notification on rollcall submission and an additional reminder notification type for active users with `permissions.officers=edit`. The reminder must be triggered by a local server-side scheduled entry point or job, not by client timers or external services.

**Rationale**: The system already has a stored notification model plus SSE delivery. The spec adds a 09:00 reminder requirement, but reminders target submitting officers rather than commanders, so the notification surface must widen beyond the current commander-only UI.

**Alternatives considered**:
- Client-side 09:00 reminder logic -> Rejected because it is unreliable and violates the need for an official daily reminder.
- Reuse `rollcall_submitted` for reminders -> Rejected because submission and reminder are distinct events with different recipients.

## R-008: Page and API Structure

**Decision**: Mirror the fax module structure with SSR pages at `/officers`, `/officers/[id]`, `/officers/rollcall`, `/officers/leaves` and REST-style API routes under `/api/officers`, `/api/officers/rollcall`, `/api/officers/leaves`, `/api/officers/assignments`, plus `/api/officers/[id]/documents`.

**Rationale**: This follows existing project conventions, keeps the dashboard layout/auth guard intact, and cleanly separates resource mutations from SSR data reads.

**Alternatives considered**:
- Build everything as client-side pages that call internal APIs -> Rejected because the constitution requires SSR-first.
- Collapse leave/assignment/document actions into one large `/api/officers/[id]` handler -> Rejected because it produces an unwieldy endpoint and weaker validation boundaries.

## R-009: Automatic 09:00 Reminder Scheduling

**Decision**: Run the officers reminder through a local worker entry (`next/scripts/officers-rollcall-reminder.ts`) wired by `docker-compose.yml`, with execution at 09:00 server-local time on Sunday through Thursday only.

**Rationale**: The feature requires automatic reminders but the constitution forbids external services. A local worker keeps scheduling deterministic and offline while matching the Windows-hosted Docker deployment model.

**Alternatives considered**:
- Client-side timers -> Rejected because users may not have the page open and reminders would be unreliable.
- Manual-only script execution -> Rejected because the requirement is automatic, not operator-triggered.

## R-010: Officers API Rate Limiting

**Decision**: Add a shared local rate-limiting helper for officers routes and apply it before RBAC/business logic on each officers API endpoint.

**Rationale**: The constitution requires rate limiting on API requests. A shared helper keeps enforcement consistent across officer CRUD, document, rollcall, leave, and assignment routes without introducing external infrastructure.

**Alternatives considered**:
- No route-specific rate limiting because the app is internal-only -> Rejected because this would violate the constitution.
- Per-route ad hoc throttling logic -> Rejected because it is harder to keep consistent and auditable.
