# API Contract: شئون الضباط — Officers Affairs Module

Base path: `/api/officers`

## Auth rules

- All endpoints require authenticated users.
- Read endpoints require `permissions.officers` in `view|edit` unless otherwise stated.
- Mutation endpoints require `permissions.officers = edit`.
- Commander rollcall summary access is read-only.
- Every mutation writes an `AuditLog` entry with `module = "officers"`.

## 1. List / Create Officers

### `GET /api/officers`

**Purpose**: Return officer list with search and status filtering.

**Query params**

| Name | Type | Notes |
|------|------|-------|
| `search` | string | Matches `fullName` or `militaryId` |
| `status` | string | `active`, `inactive`, `retired` |
| `page` | number | Default `1` |
| `limit` | number | Default `20`, max `100` |

**200 response**

```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "officer_id",
        "militaryId": "1234-56",
        "fullName": "الاسم الكامل",
        "rank": "captain",
        "position": "رئيس فرع",
        "employmentStatus": "active"
      }
    ],
    "total": 1,
    "page": 1,
    "totalPages": 1
  }
}
```

### `POST /api/officers`

**Purpose**: Create officer master record.

**Request body**

```json
{
  "militaryId": "1234-56",
  "fullName": "الاسم الكامل",
  "rank": "captain",
  "unit": "الكتيبة أ",
  "position": "رئيس فرع",
  "phone": "01000000000",
  "nationalId": "29901011234567",
  "employmentStatus": "active",
  "joinDate": "2020-01-01",
  "birthDate": "1990-01-01"
}
```

**Rules**
- `militaryId` must match `XXXX-YY`.
- `militaryId` must be unique.
- Arabic error messages returned for validation failures.

## 2. Get / Update Officer

### `GET /api/officers/{id}`

**Purpose**: Return complete officer file including documents, leave history, assignment timeline, and current metadata.

### `PATCH /api/officers/{id}`

**Purpose**: Update officer master record.

**Patchable fields**
- `fullName`
- `rank`
- `unit`
- `position`
- `phone`
- `nationalId`
- `employmentStatus`
- `joinDate`
- `birthDate`

**Rules**
- `militaryId` remains unique if editable; otherwise treat as immutable after creation.
- Concurrency check must reject updates if officer became inactive/retired during a dependent workflow.

## 3. Officer Documents

### `POST /api/officers/{id}/documents`

**Purpose**: Upload a PDF document to the officer record.

**Request**
- `multipart/form-data`
- field name: `file`

**Rules**
- PDF only
- Max 5MB
- Max 20 documents per officer

**201 response**

```json
{
  "success": true,
  "data": {
    "document": {
      "id": "doc_id",
      "originalName": "service-record.pdf",
      "uploadedAt": "2026-03-26T09:00:00.000Z"
    }
  }
}
```

### `DELETE /api/officers/{id}/documents`

**Purpose**: Remove one officer document.

**Request body**

```json
{
  "documentId": "doc_id"
}
```

## 4. Daily Rollcall

### `GET /api/officers/rollcall?date=YYYY-MM-DD`

**Purpose**: Return the rollcall state for a specific date.

**200 response states**
- `draft`: return target roster + draft entries
- `submitted`: return read-only submitted summary + entries
- `not_found`: return today's active roster template when no draft exists yet

### `POST /api/officers/rollcall`

**Purpose**: Save or submit a daily rollcall.

**Request body**

```json
{
  "date": "2026-03-26",
  "action": "submit",
  "entries": [
    {
      "officerId": "officer_id",
      "status": "present",
      "note": ""
    }
  ]
}
```

**Rules**
- Allowed `action`: `save_draft`, `submit`
- Allowed statuses: `present`, `absent`, `leave`, `mission`
- `submit` requires one status for every active officer in scope
- After `submit`, the day becomes immutable
- Duplicate submission for the same date is rejected
- Submission emits commander notification and audit log

## 5. Leave Register

### `GET /api/officers/leaves`

**Purpose**: Return leave/absence records with officer and date filters.

**Query params**
- `officerId`
- `status`
- `type`
- `from`
- `to`

### `POST /api/officers/leaves`

**Purpose**: Create a leave/absence record.

**Request body**

```json
{
  "officerId": "officer_id",
  "category": "leave",
  "type": "annual",
  "startDate": "2026-04-01",
  "endDate": "2026-04-05",
  "reason": "سبب الإجازة"
}
```

**Rules**
- Reject `endDate < startDate`
- Reject overlapping active ranges for the same officer
- Only active officers can receive new records

### `PATCH /api/officers/leaves/{id}`

**Purpose**: Update leave details or status.

## 6. Assignment Timeline

### `GET /api/officers/assignments`

**Purpose**: Return assignment/promotion/mission records filtered by officer and type.

### `POST /api/officers/assignments`

**Purpose**: Create a timeline event.

**Request body**

```json
{
  "officerId": "officer_id",
  "type": "mission",
  "title": "مأمورية خارجية",
  "description": "تفاصيل مختصرة",
  "effectiveDate": "2026-04-10",
  "endDate": "2026-04-12"
}
```

### `PATCH /api/officers/assignments/{id}`

**Purpose**: Update an assignment timeline event.

## 7. Error contract

All failures return:

```json
{
  "success": false,
  "error": "رسالة خطأ عربية واضحة"
}
```

Representative failure cases:
- `400` invalid payload / invalid date range / unsupported file
- `401` unauthenticated
- `403` insufficient permissions
- `404` officer or related record not found
- `409` duplicate military ID / overlapping leave / rollcall already submitted
