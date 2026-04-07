# Data Model: Dashboard & Notifications

**Date**: 2026-03-26
**Feature**: Dashboard & Notifications (Phase 2)

## Entities

### Notification

Represents an alert sent to the Commander when a significant event occurs.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `userId` | ObjectId | Yes | Target user (Commander) — references `User` model |
| `type` | String (enum) | Yes | `new_fax`, `rollcall_submitted`, `medicine_expiry` |
| `title` | String | Yes | Short Arabic notification title (e.g., "فاكس جديد") |
| `body` | String | Yes | Arabic notification body with event details |
| `isRead` | Boolean | Yes | Default: `false` |
| `refId` | ObjectId | Yes | Reference to the source record (Fax, DailyRollcall, Medicine) |
| `refModel` | String | Yes | Model name for the reference (`Fax`, `DailyRollcall`, `Medicine`) |
| `createdAt` | Date | Yes | Auto-generated timestamp |

**Validation Rules**:
- `userId` must reference an existing User with role `commander`
- `type` must be one of the allowed enum values
- `title` and `body` must be non-empty Arabic strings
- `refId` and `refModel` must be consistent (refModel must be a valid Mongoose model name)

**State Transitions**:
- Created (isRead: false) → Read (isRead: true) — triggered by user click or "mark all as read"
- No auto-expiry or deletion per clarification session

**Indexes**:
- `{ userId, isRead, createdAt: -1 }` — for unread count query and notification list
- `{ userId, createdAt: -1 }` — for paginated notification retrieval

### AuditLog

Represents a recorded system operation for accountability and compliance.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `userId` | ObjectId | Yes | Performing user — references `User` model |
| `userName` | String | Yes | Denormalized username for display |
| `action` | String (enum) | Yes | `CREATE`, `UPDATE`, `DELETE`, `VIEW` |
| `module` | String (enum) | Yes | `fax`, `officers`, `medical`, `students`, `education`, `users` |
| `targetId` | ObjectId | Yes | ID of the affected record |
| `description` | String | Yes | Human-readable Arabic description of the operation |
| `ipAddress` | String | Yes | Client IP address |
| `createdAt` | Date | Yes | Auto-generated timestamp |

**Validation Rules**:
- `userId` must reference an existing User
- `action` and `module` must be valid enum values
- `description` must be a non-empty string
- `ipAddress` must be a valid IP format

**State Transitions**:
- Immutable — audit log entries are append-only, never modified or deleted

**Indexes**:
- `{ module, createdAt: -1 }` — for filtering by module
- `{ userId, createdAt: -1 }` — for filtering by user
- `{ action, createdAt: -1 }` — for filtering by action type
- `{ createdAt: -1 }` — for date range queries and pagination

### Dashboard Summary (Derived — Not Persisted)

Aggregated view computed at query time from existing entities.

| Card | Source Model | Query | Metric |
|------|-------------|-------|--------|
| Pending Faxes | Fax | Count where `status: 'pending'` | Number of pending faxes |
| Daily Rollcall | DailyRollcall | Latest entry for today | Submitted/not submitted + present/absent counts |
| Expired Medicines | Medicine | Count where `expiryDate < now()` OR `quantity < minThreshold` | Number of alerts |
| Active Courses | Course | Count where `status: 'ongoing'` or `'upcoming'` | Number of active courses |
| Student Count | Student | Total count of active students | Number of students |

**Access Rules**:
- Commander + Admin: See all 5 cards
- Employee: See only the card matching their `department` field

## Relationships

```
User (Commander) ←── Notification.userId
User              ←── AuditLog.userId
Fax               ←── Notification.refId (when type = new_fax)
DailyRollcall     ←── Notification.refId (when type = rollcall_submitted)
Medicine          ←── Notification.refId (when type = medicine_expiry)
```

## No New Models Required

Both `Notification` and `AuditLog` models are defined in the master plan. This feature implements the API routes, UI components, and business logic to populate and query these models. No schema changes are needed beyond what the master plan specifies.
