# Data Model: التعليم (Education & Courses)

## Entity: Course

**Collection**: `courses`
**Existing file**: `next/lib/db/models/Course.ts`

### Fields

| Field | Type | Required | Unique | Default | Description |
|-------|------|----------|--------|---------|-------------|
| title | String | Yes | No | — | Course/training name |
| description | String | No | No | — | Course description |
| startDate | Date | Yes | No | — | Course start date |
| endDate | Date | Yes | No | — | Course end date (must be >= startDate) |
| status | Enum: `upcoming`, `ongoing`, `completed` | Yes | No | `upcoming` | Course lifecycle status |
| participantModel | Enum: `Officer`, `Student` | Yes | No | — | Determines which collection participants reference |
| participants | ObjectId[] | No | No | [] | Polymorphic refs to Officer or Student |
| documents | CourseDocument[] | No | No | [] | Array of uploaded documents |
| createdAt | Date | Auto | No | now | Record creation timestamp |
| updatedAt | Date | Auto | No | now | Last update timestamp |

### Embedded Sub-Document: CourseDocument

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| name | String | Yes | User-provided document name |
| fileUrl | String | Yes | Relative path to file |

### Indexes

| Index | Fields | Purpose |
|-------|--------|---------|
| Status filter | status | Filter by course status |
| Date sort | startDate | Sort courses by start date |

### Validation Rules

- `title`: Required, trimmed, non-empty string
- `startDate`: Required, valid Date
- `endDate`: Required, valid Date, must be >= startDate (pre-validate hook)
- `status`: Must be one of `upcoming`, `ongoing`, `completed`
- `participantModel`: Must be `Officer` or `Student` (set at creation, immutable)
- `documents[].name`: Required, non-empty string
- `documents[].fileUrl`: Required, non-empty string

### State Transitions (Manual Only)

```
    ┌──────────┐
    │ upcoming │ ← default on creation
    └────┬─────┘
         │ user action
         ▼
    ┌──────────┐
    │ ongoing  │
    └────┬─────┘
         │ user action
         ▼
    ┌───────────┐
    │ completed │
    └───────────┘
```

- All transitions are manual via edit form (FR-016)
- No automatic transitions based on dates

### Relationships

- **Course → Officer** (via participants + participantModel="Officer"): Many-to-many polymorphic
- **Course → Student** (via participants + participantModel="Student"): Many-to-many polymorphic
- Participant type is set at course creation and determines which collection is referenced

### Deletion Policy

- Courses with enrolled participants CANNOT be deleted
- All participants must be removed before deletion is permitted
- Documents are deleted from filesystem when course is deleted

## File Storage

**Directory**: `public/uploads/courses/`
**Naming convention**: `{timestamp}-{sanitized-original-name}.{ext}`
**Max file size**: 10MB per file
**Allowed types**: PDF, JPEG, PNG
