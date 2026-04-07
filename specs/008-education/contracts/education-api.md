# API Contract: Education Module

## Base URL: `/api/education`

All endpoints require authentication (JWT in HttpOnly Cookie) and RBAC permission check (`education` module).

---

### GET `/api/education`
**Description**: List all courses with optional status filter.
**Permission**: `education: view` or `education: edit`

**Query Parameters**:

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| status | string | No | Filter: `upcoming`, `ongoing`, `completed`, `all` |
| search | string | No | Search by title (case-insensitive regex) |
| page | number | No | Page number (default: 1) |
| limit | number | No | Items per page (default: 20, max: 100) |

**Response**: `200 OK`

```json
{
  "success": true,
  "data": {
    "items": [
      {
        "_id": "string",
        "title": "string",
        "description": "string",
        "startDate": "2024-01-15T00:00:00.000Z",
        "endDate": "2024-02-15T00:00:00.000Z",
        "status": "upcoming",
        "participantModel": "Officer",
        "participantCount": 15,
        "createdAt": "..."
      }
    ],
    "total": 50,
    "page": 1,
    "totalPages": 3
  }
}
```

**Error Responses**: `401`, `403`

---

### POST `/api/education`
**Description**: Create a new course.
**Permission**: `education: edit`

**Request Body** (Zod validated):

```json
{
  "title": "دورة الأمن السيبراني",
  "description": "دورة تدريبية في أساسيات الأمن السيبراني",
  "startDate": "2026-04-01",
  "endDate": "2026-04-15",
  "participantModel": "Officer"
}
```

**Validation**:
- `title`: Required, 1-200 chars, trimmed
- `description`: Optional, max 2000 chars
- `startDate`: Required, valid ISO date
- `endDate`: Required, valid ISO date, must be >= startDate
- `participantModel`: Required, `Officer` or `Student`

**Response**: `201 Created` — Course object with status `upcoming`.

**Error Responses**: `400` (validation), `401`, `403`

---

### GET `/api/education/[id]`
**Description**: Get course detail with populated participants.
**Permission**: `education: view` or `education: edit`

**Response**: `200 OK` — Full course object with participants populated (name, type info).

**Error Responses**: `401`, `403`, `404`

---

### PATCH `/api/education/[id]`
**Description**: Update course information.
**Permission**: `education: edit`

**Request Body** (partial):

```json
{
  "title": "Updated title",
  "status": "ongoing"
}
```

**Response**: `200 OK` — Updated course object.

**Error Responses**: `400`, `401`, `403`, `404`

---

### DELETE `/api/education/[id]`
**Description**: Delete a course. Only allowed if no participants are enrolled.
**Permission**: `education: edit`

**Response**: `200 OK`

**Error Responses**: `400` (has participants), `401`, `403`, `404`

**Side Effects**: Documents deleted from filesystem. AuditLog entry created.

---

### POST `/api/education/[id]/participants`
**Description**: Add a participant to the course.
**Permission**: `education: edit`

**Request Body**:

```json
{
  "participantId": "string"
}
```

**Validation**: participantId must reference an existing Officer or Student (based on course's participantModel). Must not already be enrolled.

**Response**: `200 OK`

**Error Responses**: `400` (duplicate, invalid type), `401`, `403`, `404`

---

### DELETE `/api/education/[id]/participants`
**Description**: Remove a participant from the course.
**Permission**: `education: edit`

**Request Body**:

```json
{
  "participantId": "string"
}
```

**Response**: `200 OK`

**Error Responses**: `400`, `401`, `403`, `404`

---

### POST `/api/education/[id]/documents`
**Description**: Upload a document to a course.
**Permission**: `education: edit`

**Request**: `multipart/form-data` with `name` (string) and `file` (PDF/JPEG/PNG, max 10MB).

**Response**: `201 Created`

**Error Responses**: `400` (type/size), `401`, `403`, `404`

---

### DELETE `/api/education/[id]/documents`
**Description**: Remove a document from a course.
**Permission**: `education: edit`

**Request Body**:

```json
{
  "fileUrl": "/uploads/courses/..."
}
```

**Response**: `200 OK`

**Error Responses**: `400`, `401`, `403`, `404`
