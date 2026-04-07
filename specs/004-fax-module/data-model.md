# Data Model: قسم الفاكس — Fax Management Module

**Date**: 2026-03-26  
**Feature**: 004-fax-module  
**Depends on**: Phase 0 (Database Schema), Phase 1 (User model, RBAC), Phase 2 (Notification, AuditLog)

## Entity: Fax (Updated)

### Current State (Phase 0)

The Fax model exists at `next/lib/db/models/Fax.ts` but requires modifications per spec clarifications.

### Changes Required

| Field | Current | Updated | Reason |
|-------|---------|---------|--------|
| `status` enum | `pending`, `decision_made`, `forwarded`, `closed` | `pending`, `forwarded`, `closed` | Clarification: `decision_made` is not a persisted state |
| `faxNumber` index | Global unique (`{ faxNumber: 1 }, { unique: true }`) | Compound unique (`{ faxNumber: 1, date: 1 }, { unique: true }`) | Clarification: uniqueness is per-date, not global |
| `forwardedTo` | `String` (free text) | **REMOVED** — replaced by structured fields below | Need to store user/department target separately |
| `forwardedToType` | *NEW* | `enum: 'user' \| 'department'` | Distinguish forwarding target type |
| `forwardedToId` | *NEW* | `ObjectId` (ref: User, optional) | When forwarded to a specific user |
| `forwardedToDepartment` | *NEW* | `String` (optional) | When forwarded to a department |
| `closedBy` | *NEW* | `ObjectId` (ref: User, optional) | Track who closed the fax |
| `closedAt` | *NEW* | `Date` (optional) | Track when the fax was closed |
| `commanderDecisionAt` | *NEW* | `Date` (optional) | Track when decision was made |

### Updated Schema

```
Fax {
  faxNumber:              String, required, trimmed
  date:                   Date, required
  fromEntity:             String, required, trimmed
  toEntity:               String, required, trimmed
  subject:                String, required, trimmed
  fileUrl:                String, required
  fileType:               enum ['pdf', 'image']
  status:                 enum ['pending', 'forwarded', 'closed'], default: 'pending'
  commanderDecision:      String, optional, trimmed
  commanderDecisionAt:    Date, optional
  forwardedToType:        enum ['user', 'department'], optional
  forwardedToId:          ObjectId (ref: User), optional
  forwardedToDepartment:  String, optional, trimmed
  closedBy:               ObjectId (ref: User), optional
  closedAt:               Date, optional
  relatedFaxes:           [ObjectId] (ref: Fax)
  uploadedBy:             ObjectId (ref: User), required
  createdAt:              Date (auto)
  updatedAt:              Date (auto)
}
```

### Indexes

| Index | Type | Purpose |
|-------|------|---------|
| `{ faxNumber: 1, date: 1 }` | Compound Unique | Prevent duplicate fax numbers on same date |
| `{ status: 1 }` | Regular | Fast filtering by status |
| `{ date: -1 }` | Regular | Sort by date (most recent first) |
| `{ uploadedBy: 1 }` | Regular | Find faxes by uploader |
| `{ forwardedToId: 1, status: 1 }` | Compound | Find forwarded faxes for a specific user |
| `{ forwardedToDepartment: 1, status: 1 }` | Compound | Find forwarded faxes for a department |

### State Transitions

```
┌─────────┐     Commander      ┌───────────┐    Assignee/     ┌────────┐
│ pending │ ──── forwards ────►│ forwarded │ ── Dept User ──►│ closed │
└─────────┘                    └───────────┘    closes         └────────┘
     │                                                              ▲
     │              Commander closes directly                       │
     └──────────────────────────────────────────────────────────────┘
```

**Valid Transitions**:
- `pending` → `forwarded` (by Commander/Admin, requires decision text + forwarding target)
- `pending` → `closed` (by Commander/Admin, requires decision text)
- `forwarded` → `closed` (by forwarded-to user, any dept member if dept-forwarded, Commander, or Admin)

**Invalid Transitions** (must be rejected):
- `closed` → any state (closed is terminal)
- `forwarded` → `pending` (cannot undo forwarding)
- Any transition by unauthorized user

### Validation Rules

| Rule | Field(s) | Description |
|------|----------|-------------|
| V-001 | `faxNumber` + `date` | Combination must be unique |
| V-002 | `faxNumber` | Required, non-empty |
| V-003 | `date` | Required, valid date |
| V-004 | `fromEntity` | Required, non-empty |
| V-005 | `subject` | Required, non-empty |
| V-006 | `fileUrl` | Required when creating |
| V-007 | `fileType` | Must be 'pdf' or 'image' |
| V-008 | `commanderDecision` | Required when transitioning from pending |
| V-009 | `forwardedToType` | Required when status → forwarded |
| V-010 | `forwardedToId` | Required when forwardedToType = 'user' |
| V-011 | `forwardedToDepartment` | Required when forwardedToType = 'department' |

## Entity: User (Unchanged)

Referenced by Fax. No changes needed. Existing fields used:
- `department`: For department-based forwarding authorization
- `permissions.fax`: For RBAC checks (`none`, `view`, `edit`)
- `role`: For commander/admin decision authorization

## Entity: Notification (Unchanged)

Used to create alerts. No schema changes needed. Existing `new_fax` type covers all fax notification scenarios via different body text.

## Entity: AuditLog (Unchanged)

Used to log all fax operations. No schema changes needed. Existing `fax` module type and action types (`CREATE`, `UPDATE`, `VIEW`) cover all needed audit events.

## Relationships

```
User ──(1:N)──► Fax            (uploadedBy)
User ──(1:N)──► Fax            (forwardedToId, optional)
User ──(1:N)──► Fax            (closedBy, optional)
Fax  ──(N:N)──► Fax            (relatedFaxes, bidirectional)
User ──(1:N)──► Notification   (userId)
Fax  ──(1:N)──► Notification   (refId/refModel)
User ──(1:N)──► AuditLog       (userId)
Fax  ──(1:N)──► AuditLog       (targetId)
```
