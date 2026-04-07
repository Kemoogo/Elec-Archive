# Research: قسم الفاكس — Fax Management Module

**Date**: 2026-03-26  
**Feature**: 004-fax-module

## R-001: Fax Model Schema Update

**Decision**: Update the existing `Fax` model to align with spec clarifications:
- Remove `decision_made` from status enum → statuses are `pending`, `forwarded`, `closed` only
- Change `faxNumber` uniqueness from global unique to compound unique on `(faxNumber, date)`
- Replace `forwardedTo: String` with structured forwarding: `forwardedToType` (enum: `user` | `department`), `forwardedToId` (ObjectId ref to User), `forwardedToDepartment` (String for department name)
- Add `closedBy: ObjectId` to track who closed the fax after forwarding

**Rationale**: The user clarified that `decision_made` is a description, not a persisted state. Forwarding can target a user or a department, requiring structured fields. The faxNumber uniqueness is per-date, not globally unique.

**Alternatives Considered**:
- Polymorphic `forwardedTo` field with discriminator → Rejected: More complex query patterns, harder to validate
- Keeping `decision_made` as hidden status → Rejected: User explicitly stated only 3 statuses

## R-002: Fax File Upload Strategy

**Decision**: Use the existing `saveUploadedFile` utility from `next/lib/uploads/index.ts` with a `fax` subfolder. Files are saved to `public/uploads/fax/`.

**Rationale**: Upload utility already handles extension validation (.pdf, .png, .jpg, .jpeg), size limits (10MB), unique filenames with timestamps, and Arabic character support. Only adjustment needed: restrict to PDF/JPEG/PNG only (remove .gif, .webp for fax module).

**Alternatives Considered**:
- Custom upload handler for fax → Rejected: Duplicates existing logic; better to use shared utility with module-specific validation at the API layer
- Stream-based upload → Rejected: Overkill for 10MB max files on local network

## R-003: PDF/Image Viewer Strategy

**Decision**: Use browser-native PDF rendering via `<iframe>` or `<embed>` for PDFs, and standard `<img>` tags for images. No external dependencies needed.

**Rationale**: The system is offline-only — no CDN or external library loading. Modern browsers (Chrome/Edge on Windows) have built-in PDF viewers. Keeps bundle size minimal and works offline.

**Alternatives Considered**:
- pdf.js library → Rejected: Adds significant bundle size (~200KB), must be bundled locally, browser-native viewer is sufficient for read-only viewing
- react-pdf → Rejected: Same reasoning + additional dependency to maintain

## R-004: Notification Integration for Fax Events

**Decision**: Use existing `createNotificationForCommanders()` for new fax uploads. Use `createNotificationForUser()` for forwarding notifications to specific users. For department-level forwarding, query users by department and create individual notifications.

**Rationale**: The notification infrastructure from Phase 2 already supports per-user and per-role notifications with SSE real-time delivery. No new notification types needed — `new_fax` type already exists.

**Alternatives Considered**:
- New notification types for forwarding → Rejected: `new_fax` type with different body text is sufficient
- Add `fax_forwarded` and `fax_closed` notification types → Considered adding but deferred: can be added to Notification type enum if needed, but contextual body text in `new_fax` type is simpler initially

## R-005: Forwarding Closure Authorization Logic

**Decision**: Implement closure authorization check in the API route:
1. If fax is forwarded to a **user**: only that user (or admin/commander) can close it
2. If fax is forwarded to a **department**: any active user with `edit` permission on fax whose `department` matches the forwarded department can close it
3. Commander and Admin can always close any fax regardless of forwarding target

**Rationale**: Per user clarifications, the forwarded-to user or any authorized department member can close the fax. This maps cleanly to existing User model fields (`department`, `permissions.fax`).

**Alternatives Considered**:
- Separate "closure permission" field → Rejected: Over-engineering for current scale
- Task-based workflow with explicit claim → Rejected: Too complex for 10-30 users

## R-006: Search & Filtering Strategy

**Decision**: Server-side search and filtering using Mongoose queries. Text search on `faxNumber`, `subject`, `fromEntity` using regex. Status and date range filtering via query parameters. Pagination with cursor-based approach (using `_id` + `createdAt`).

**Rationale**: With 10-30 users and moderate data volume (hundreds to low thousands of faxes), MongoDB regex search is performant enough. No need for full-text search indexes.

**Alternatives Considered**:
- MongoDB text index → Rejected: Adds complexity, regex is sufficient at this scale
- Client-side filtering → Rejected: Violates SSR-first principle, loads unnecessary data

## R-007: Fax Threading Implementation

**Decision**: Bidirectional linking via `relatedFaxes: [ObjectId]` array (already exists on model). When linking Fax A to Fax B, add each to the other's `relatedFaxes` array. When unlinking, remove from both. Thread display in detail page sorted by date ascending.

**Rationale**: The existing model already has `relatedFaxes` as an array of ObjectId refs to Fax. Bidirectional ensures both faxes show the relationship.

**Alternatives Considered**:
- Separate Thread collection → Rejected: Over-engineering for simple linking
- Unidirectional linking → Rejected: Would miss showing relationships when viewing the "parent" fax
