# Data Model: شئون الطلبة (Student Affairs)

## Entity: Student

**Collection**: `students`
**Existing file**: `next/lib/db/models/Student.ts`

### Fields

| Field | Type | Required | Unique | Default | Description |
|-------|------|----------|--------|---------|-------------|
| studentId | String | Yes | Yes | — | Unique student identifier |
| fullName | String | Yes | No | — | Student's full name (Arabic) |
| enrollDate | Date | Yes | No | — | Date of enrollment |
| status | Enum: `active`, `graduated`, `inactive`, `withdrawn` | No | No | `active` | Student lifecycle status |
| documents | Document[] | No | No | [] | Array of uploaded documents |
| notes | String | No | No | — | Free-text notes |
| createdAt | Date | Auto | No | now | Record creation timestamp |
| updatedAt | Date | Auto | No | now | Last update timestamp (used for concurrent edit resolution) |

### Embedded Sub-Document: StudentDocument

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| name | String | Yes | User-provided document name |
| fileUrl | String | Yes | Relative path to file (e.g., `/uploads/students/{filename}`) |
| uploadedAt | Date | No (default: now) | Upload timestamp |

### Indexes

| Index | Fields | Type | Purpose |
|-------|--------|------|---------|
| Primary lookup | studentId | Unique | Fast lookup by student ID, enforces uniqueness |
| Name search | fullName | Regular | Supports name-based search |
| Status filter | status | Regular | Filter active vs inactive students |

### Validation Rules (from spec)

- `studentId`: Required, unique, trimmed, non-empty string
- `fullName`: Required, trimmed, non-empty string
- `enrollDate`: Required, valid Date
- `status`: Must be one of `active`, `graduated`, `inactive`, `withdrawn`
- `documents[].name`: Required, non-empty string
- `documents[].fileUrl`: Required, non-empty string, must reference valid local path
- Upload constraints: File type must be PDF, JPEG, or PNG; file size must not exceed 10MB

### State Transitions

```
         ┌──────────┐
         │  active   │
         └────┬─────┘
              │
    ┌─────────┼─────────┐
    │         │         │
    ▼         ▼         ▼
┌────────┐ ┌──────────┐ ┌───────────┐
│graduated│ │ inactive │ │ withdrawn │
└────────┘ └──────────┘ └───────────┘
```

- **active → graduated**: Student completes program
- **active → inactive**: Deactivation (soft-delete) — documents removed from filesystem
- **active → withdrawn**: Student withdraws from program
- Any status → `inactive` is the "soft-delete" path (FR-006)

### Relationship to Other Entities

- **Student → Course** (via Course.participants [ObjectId]): A student may participate in training courses (managed in Phase 7 — Education module). No cascading behavior required in this phase.

## File Storage

**Directory**: `public/uploads/students/`
**Naming convention**: `{timestamp}-{sanitized-original-name}.{ext}`
**Cleanup on deactivation**: When status changes to `inactive`, delete all files referenced in `documents[].fileUrl` and clear the `documents` array.
