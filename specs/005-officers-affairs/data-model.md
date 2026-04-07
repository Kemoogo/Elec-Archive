# Data Model: شئون الضباط — Officers Affairs Module

## 1. Officer

**Purpose**: Canonical personnel record used by list, detail, rollcall targeting, leaves, assignments, and officer document management.

| Field | Type | Rules / Validation |
|-------|------|--------------------|
| `_id` | ObjectId | Primary key |
| `militaryId` | string | Required, unique, format `XXXX-YY`, indexed |
| `fullName` | string | Required, trimmed, indexed for search |
| `rank` | enum | Required: `second_lieutenant`, `first_lieutenant`, `captain`, `major`, `lieutenant_colonel`, `colonel`, `brigadier`, `major_general` |
| `unit` | string | Required, trimmed |
| `position` | string | Required, trimmed |
| `phone` | string | Optional, normalized phone format |
| `nationalId` | string | Optional, normalized, unique if present |
| `employmentStatus` | enum | Required: `active`, `inactive`, `retired` |
| `joinDate` | date | Required |
| `birthDate` | date | Required, must be before `joinDate` |
| `documents` | OfficerDocument[] | Max 20 embedded documents |
| `createdAt` | date | Auto |
| `updatedAt` | date | Auto |

**Relationships**:
- One `Officer` has many `LeaveRecord` rows.
- One `Officer` has many `AssignmentRecord` rows.
- One `Officer` can appear in many `RollcallEntry` snapshots.

## 2. OfficerDocument

**Purpose**: Embedded metadata for official officer PDFs.

| Field | Type | Rules / Validation |
|-------|------|--------------------|
| `id` | string/ObjectId | Stable identifier for delete/download operations |
| `originalName` | string | Required |
| `storedPath` | string | Required, local path under `public/uploads/officers/` |
| `mimeType` | string | Must be `application/pdf` |
| `sizeBytes` | number | `> 0` and `<= 5MB` |
| `uploadedAt` | date | Auto |
| `uploadedBy` | ObjectId | Required, ref `User` |

**Validation rules**:
- PDF only.
- Maximum 5MB per file.
- Maximum 20 documents per officer.

## 3. DailyRollcall

**Purpose**: Official daily attendance record for the current officer roster.

| Field | Type | Rules / Validation |
|-------|------|--------------------|
| `_id` | ObjectId | Primary key |
| `date` | date | Required, normalized to start-of-day, unique per calendar day |
| `status` | enum | `draft` or `submitted` |
| `targetOfficerCount` | number | Required, snapshot count of active officers included that day |
| `entries` | RollcallEntry[] | Required, one row per targeted active officer |
| `submittedBy` | ObjectId | Required when `status=submitted`, ref `User` |
| `submittedAt` | date | Required when `status=submitted` |
| `viewedByCommander` | boolean | Default `false` |
| `createdAt` | date | Auto |
| `updatedAt` | date | Auto until submission; no edits after submission |

**Validation rules**:
- Only one submitted rollcall per day.
- Submission blocked until `entries.length === targetOfficerCount` and every targeted officer has one status.
- Submitted rollcall becomes immutable.
- Duplicate submission for the same date is rejected.

**State transitions**:
- `draft -> submitted` when validation passes.
- `submitted` is terminal for this phase.

## 4. RollcallEntry

**Purpose**: Snapshot of one officer's official status within a daily rollcall.

| Field | Type | Rules / Validation |
|-------|------|--------------------|
| `officerId` | ObjectId | Required, ref `Officer` |
| `militaryId` | string | Required snapshot |
| `fullName` | string | Required snapshot |
| `rank` | string | Required snapshot |
| `status` | enum | Required: `present`, `absent`, `leave`, `mission` |
| `note` | string | Optional, trimmed |
| `relatedLeaveId` | ObjectId | Optional, ref `Leave` |
| `relatedAssignmentId` | ObjectId | Optional, ref `Assignment` |

**Validation rules**:
- Exactly one entry per targeted officer per day.
- `relatedLeaveId` allowed only when `status=leave`.
- `relatedAssignmentId` allowed only when `status=mission`.

## 5. LeaveRecord (`Leave` collection)

**Purpose**: Official leave/absence period tied to an officer and reused in profile and rollcall reconciliation.

| Field | Type | Rules / Validation |
|-------|------|--------------------|
| `_id` | ObjectId | Primary key |
| `officerId` | ObjectId | Required, ref `Officer`, indexed |
| `category` | enum | `leave` or `absence` |
| `type` | enum | `annual`, `sick`, `emergency`, `rest`, `overnight`, `field`, `casual` |
| `startDate` | date | Required |
| `endDate` | date | Required, `>= startDate` |
| `reason` | string | Optional, trimmed |
| `status` | enum | `draft`, `approved`, `closed`, `cancelled` |
| `createdBy` | ObjectId | Required, ref `User` |
| `updatedBy` | ObjectId | Required, ref `User` |
| `createdAt` | date | Auto |
| `updatedAt` | date | Auto |

**Validation rules**:
- Reject end date before start date.
- Reject overlapping active periods for the same officer when ranges conflict.
- Only active officers can receive new leave/absence entries.

**State transitions**:
- `draft -> approved`
- `approved -> closed`
- `draft|approved -> cancelled`

## 6. AssignmentRecord (`Assignment` collection)

**Purpose**: Officer professional timeline for assignments, promotions, and missions.

| Field | Type | Rules / Validation |
|-------|------|--------------------|
| `_id` | ObjectId | Primary key |
| `officerId` | ObjectId | Required, ref `Officer`, indexed |
| `type` | enum | `assignment`, `promotion`, `mission` |
| `title` | string | Required |
| `description` | string | Optional |
| `effectiveDate` | date | Required |
| `endDate` | date | Optional, must be `>= effectiveDate` when present |
| `status` | enum | `scheduled`, `active`, `completed`, `cancelled` |
| `createdBy` | ObjectId | Required, ref `User` |
| `updatedBy` | ObjectId | Required, ref `User` |
| `createdAt` | date | Auto |
| `updatedAt` | date | Auto |

**Validation rules**:
- `promotion` usually omits `endDate`.
- `mission` can be date-ranged and may be linked from rollcall entries.
- Timeline sorts by `effectiveDate` descending in officer detail.

**State transitions**:
- `scheduled -> active -> completed`
- `scheduled|active -> cancelled`

## 7. Supporting Integrations

### Notification
- Extend `Notification.type` to include an officers reminder event.
- Reuse `rollcall_submitted` for commander-facing submission alerts.

### AuditLog
- Reuse `module="officers"` for officer CRUD, document upload/delete, leave updates, assignment updates, and rollcall submission/view events.

## Indexing Summary

- `Officer`: unique `militaryId`, optional unique `nationalId`, index on `fullName`, `employmentStatus`
- `DailyRollcall`: unique `date`, index on `status`, `submittedAt`
- `Leave`: compound index on `officerId`, `startDate`, `endDate`, `status`
- `Assignment`: compound index on `officerId`, `effectiveDate`, `type`

## Derived Read Models

- **Officer List Row**: `militaryId`, `fullName`, `rank`, `position`, `employmentStatus`
- **Commander Rollcall Summary**: totals for `present`, `absent`, `leave`, `mission`, submission timestamp, submitted-by user
- **Officer File Timeline**: merged leave + assignment chronology rendered in the detail page
