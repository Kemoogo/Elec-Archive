# API Contract: Students Module

## Base URL: `/api/students`

All endpoints require authentication (JWT in HttpOnly Cookie) and RBAC permission check (`students` module).

---

### GET `/api/students`
**Description**: List all students with optional search and status filter.
**Permission**: `students: view` or `students: edit`

**Query Parameters**:

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| search | string | No | Search by name or student ID (case-insensitive regex) |
| status | string | No | Filter by status: `active`, `graduated`, `inactive`, `withdrawn`, `all` |
| page | number | No | Page number (default: 1) |
| limit | number | No | Items per page (default: 20, max: 100) |

**Response**: `200 OK`

```json
{
  "data": [
    {
      "_id": "string",
      "studentId": "string",
      "fullName": "string",
      "enrollDate": "2024-01-15T00:00:00.000Z",
      "status": "active",
      "documents": [...],
      "notes": "string",
      "createdAt": "...",
      "updatedAt": "..."
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "pages": 8
  }
}
```

**Error Responses**:
- `401 Unauthorized` — No valid JWT
- `403 Forbidden` — No `students` permission

---

### POST `/api/students`
**Description**: Create a new student record.
**Permission**: `students: edit`

**Request Body** (Zod validated):

```json
{
  "studentId": "STU-2024-001",
  "fullName": "أحمد محمد علي",
  "enrollDate": "2024-01-15",
  "notes": "Optional notes"
}
```

**Validation**:
- `studentId`: Required, string, trimmed, 1-50 chars, unique
- `fullName`: Required, string, trimmed, 1-200 chars
- `enrollDate`: Required, valid ISO date string
- `notes`: Optional, string, max 2000 chars

**Response**: `201 Created` — Returns the created student object.

**Error Responses**:
- `400 Bad Request` — Validation failure
- `401 Unauthorized`
- `403 Forbidden`
- `409 Conflict` — Duplicate `studentId`

---

### GET `/api/students/[id]`
**Description**: Get a single student's full profile.
**Permission**: `students: view` or `students: edit`

**Path Parameters**:

| Param | Type | Description |
|-------|------|-------------|
| id | string | MongoDB ObjectId of the student |

**Response**: `200 OK` — Full student object.

**Error Responses**:
- `401 Unauthorized`
- `403 Forbidden`
- `404 Not Found` — Student ID does not exist

---

### PATCH `/api/students/[id]`
**Description**: Update student information (name, enrollment date, notes).
**Permission**: `students: edit`

**Request Body** (partial, all fields optional):

```json
{
  "fullName": "أحمد محمد علي",
  "enrollDate": "2024-02-01",
  "notes": "Updated notes"
}
```

**Response**: `200 OK` — Updated student object.

**Error Responses**:
- `400 Bad Request` — Validation failure
- `401 Unauthorized`
- `403 Forbidden`
- `404 Not Found`

---

### DELETE `/api/students/[id]`
**Description**: Deactivate a student (soft-delete). Sets status to `inactive`, removes associated documents from filesystem.
**Permission**: `students: edit`

**Response**: `200 OK`

```json
{
  "message": "Student deactivated successfully",
  "student": { /* deactivated student with status: "inactive" */ }
}
```

**Error Responses**:
- `401 Unauthorized`
- `403 Forbidden`
- `404 Not Found`

**Side Effects**:
- Status set to `inactive`
- All files in `documents[].fileUrl` deleted from filesystem
- `documents` array cleared
- AuditLog entry created with action: `UPDATE`, description: "Student deactivated"

---

### POST `/api/students/[id]/documents`
**Description**: Upload a document to a student's profile.
**Permission**: `students: edit`

**Request**: `multipart/form-data`

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| name | string | Yes | Document display name |
| file | File | Yes | PDF, JPEG, or PNG, max 10MB |

**Validation**:
- MIME type: `application/pdf`, `image/jpeg`, `image/png`
- File extension: `.pdf`, `.jpg`, `.jpeg`, `.png`
- File size: max 10MB (10,485,760 bytes)

**Response**: `201 Created`

```json
{
  "message": "Document uploaded successfully",
  "document": {
    "name": "شهادة التخرج",
    "fileUrl": "/uploads/students/1711584000000-grad-cert.pdf",
    "uploadedAt": "2026-03-28T12:00:00.000Z"
  }
}
```

**Error Responses**:
- `400 Bad Request` — Invalid file type or size exceeded
- `401 Unauthorized`
- `403 Forbidden`
- `404 Not Found` — Student not found
- `507 Insufficient Storage` — Filesystem full

---

### DELETE `/api/students/[id]/documents`
**Description**: Remove a document from a student's profile.
**Permission**: `students: edit`

**Request Body**:

```json
{
  "fileUrl": "/uploads/students/1711584000000-grad-cert.pdf"
}
```

**Response**: `200 OK`

```json
{
  "message": "Document removed successfully"
}
```

**Error Responses**:
- `400 Bad Request` — Missing fileUrl
- `401 Unauthorized`
- `403 Forbidden`
- `404 Not Found` — Student or document not found

**Side Effects**:
- File deleted from filesystem
- Document entry removed from Student.documents array
- AuditLog entry created with action: `DELETE`, description: "Document removed"
