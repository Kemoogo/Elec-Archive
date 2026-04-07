# API Contracts: قسم الفاكس — Fax Module

**Date**: 2026-03-26  
**Feature**: 004-fax-module  
**Base Path**: `/api/fax`

---

## POST /api/fax — Create New Fax

**Description**: Upload a new fax with file attachment and metadata.  
**Auth**: Required. Permission: `fax: edit`  
**Content-Type**: `multipart/form-data`

### Request Body (FormData)

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `file` | File | ✅ | PDF, JPEG, or PNG. Max 10MB |
| `faxNumber` | string | ✅ | Fax reference number |
| `date` | string (ISO date) | ✅ | Date of the fax |
| `fromEntity` | string | ✅ | Sending entity name |
| `toEntity` | string | ✅ | Receiving entity name |
| `subject` | string | ✅ | Fax subject |
| `relatedFaxId` | string | ❌ | ObjectId of related fax (for threading) |

### Response: 201 Created

```json
{
  "success": true,
  "data": {
    "_id": "string",
    "faxNumber": "string",
    "date": "ISO date",
    "fromEntity": "string",
    "toEntity": "string",
    "subject": "string",
    "fileUrl": "string",
    "fileType": "pdf | image",
    "status": "pending",
    "uploadedBy": "ObjectId",
    "relatedFaxes": ["ObjectId"],
    "createdAt": "ISO date"
  }
}
```

### Error Responses

| Status | Condition |
|--------|-----------|
| 400 | Missing required fields, invalid file type, file too large, duplicate faxNumber+date |
| 401 | Not authenticated |
| 403 | No `edit` permission on fax |
| 500 | Server error |

---

## GET /api/fax — List Faxes

**Description**: Paginated, filterable, sortable list of faxes.  
**Auth**: Required. Permission: `fax: view` or `fax: edit`

### Query Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `page` | number | 1 | Page number |
| `limit` | number | 20 | Items per page (max 100) |
| `status` | string | - | Filter: `pending`, `forwarded`, `closed` |
| `search` | string | - | Search in faxNumber, subject, fromEntity |
| `dateFrom` | string (ISO) | - | Start of date range |
| `dateTo` | string (ISO) | - | End of date range |
| `sort` | string | `-date` | Sort field with direction prefix: `date`, `-date`, `faxNumber`, `-faxNumber`, `status`, `-status` |
| `forwardedToMe` | boolean | false | Filter faxes forwarded to the current user or their department |

### Response: 200 OK

```json
{
  "success": true,
  "data": {
    "faxes": [
      {
        "_id": "string",
        "faxNumber": "string",
        "date": "ISO date",
        "fromEntity": "string",
        "subject": "string",
        "status": "pending | forwarded | closed",
        "uploadedBy": { "_id": "string", "fullName": "string" },
        "createdAt": "ISO date"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 150,
      "totalPages": 8
    }
  }
}
```

---

## GET /api/fax/[id] — Get Fax Detail

**Description**: Full details of a single fax including file URL, decision, forwarding info, and related faxes.  
**Auth**: Required. Permission: `fax: view` or `fax: edit`

### Response: 200 OK

```json
{
  "success": true,
  "data": {
    "_id": "string",
    "faxNumber": "string",
    "date": "ISO date",
    "fromEntity": "string",
    "toEntity": "string",
    "subject": "string",
    "fileUrl": "string",
    "fileType": "pdf | image",
    "status": "pending | forwarded | closed",
    "commanderDecision": "string | null",
    "commanderDecisionAt": "ISO date | null",
    "forwardedToType": "user | department | null",
    "forwardedToId": { "_id": "string", "fullName": "string" } | null,
    "forwardedToDepartment": "string | null",
    "closedBy": { "_id": "string", "fullName": "string" } | null,
    "closedAt": "ISO date | null",
    "relatedFaxes": [
      {
        "_id": "string",
        "faxNumber": "string",
        "date": "ISO date",
        "subject": "string",
        "status": "string"
      }
    ],
    "uploadedBy": { "_id": "string", "fullName": "string" },
    "createdAt": "ISO date",
    "updatedAt": "ISO date"
  }
}
```

### Error Responses

| Status | Condition |
|--------|-----------|
| 401 | Not authenticated |
| 403 | No `view`/`edit` permission on fax |
| 404 | Fax not found |

---

## PATCH /api/fax/[id]/decision — Commander Decision

**Description**: Commander or Admin makes a decision on a pending fax: forward to user/department or close directly.  
**Auth**: Required. Role: `commander` or `admin`

### Request Body

```json
{
  "decision": "string (required, non-empty)",
  "action": "forward | close",
  "forwardToType": "user | department (required if action=forward)",
  "forwardToId": "ObjectId (required if forwardToType=user)",
  "forwardToDepartment": "string (required if forwardToType=department)"
}
```

### Response: 200 OK

```json
{
  "success": true,
  "data": {
    "_id": "string",
    "status": "forwarded | closed",
    "commanderDecision": "string",
    "commanderDecisionAt": "ISO date",
    "forwardedToType": "user | department | null",
    "forwardedToId": "ObjectId | null",
    "forwardedToDepartment": "string | null"
  }
}
```

### Error Responses

| Status | Condition |
|--------|-----------|
| 400 | Missing decision text, invalid action, missing forwarding target |
| 401 | Not authenticated |
| 403 | Not commander/admin |
| 404 | Fax not found |
| 409 | Fax is not in `pending` status |

---

## PATCH /api/fax/[id]/close — Close Forwarded Fax

**Description**: Forwarded-to user (or dept member) or commander/admin closes a forwarded fax.  
**Auth**: Required. Must be forwarded-to user, authorized department member, commander, or admin.

### Request Body

```json
{
  "note": "string (optional, closure note)"
}
```

### Response: 200 OK

```json
{
  "success": true,
  "data": {
    "_id": "string",
    "status": "closed",
    "closedBy": "ObjectId",
    "closedAt": "ISO date"
  }
}
```

### Error Responses

| Status | Condition |
|--------|-----------|
| 401 | Not authenticated |
| 403 | User not authorized to close this fax |
| 404 | Fax not found |
| 409 | Fax is not in `forwarded` status |

---

## POST /api/fax/[id]/link — Link Faxes (Threading)

**Description**: Link current fax to another fax (bidirectional).  
**Auth**: Required. Permission: `fax: edit`

### Request Body

```json
{
  "relatedFaxId": "ObjectId (required)"
}
```

### Response: 200 OK

```json
{
  "success": true,
  "data": {
    "linkedFaxes": ["ObjectId"]
  }
}
```

### Error Responses

| Status | Condition |
|--------|-----------|
| 400 | Self-linking, already linked, invalid ID |
| 401 | Not authenticated |
| 403 | No `edit` permission |
| 404 | Source or target fax not found |

---

## DELETE /api/fax/[id]/link — Unlink Faxes

**Description**: Remove link between two faxes (bidirectional).  
**Auth**: Required. Permission: `fax: edit`

### Request Body

```json
{
  "relatedFaxId": "ObjectId (required)"
}
```

### Response: 200 OK

```json
{
  "success": true,
  "data": {
    "unlinkedFaxId": "ObjectId"
  }
}
```

---

## GET /api/fax/search — Search Faxes for Linking

**Description**: Lightweight search endpoint for the fax linking UI. Returns minimal fax data for autocomplete.  
**Auth**: Required. Permission: `fax: view` or `fax: edit`

### Query Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `q` | string | Search query (faxNumber or subject) |
| `exclude` | string | Fax ID to exclude from results (the current fax) |
| `limit` | number | Max results (default: 10) |

### Response: 200 OK

```json
{
  "success": true,
  "data": [
    {
      "_id": "string",
      "faxNumber": "string",
      "date": "ISO date",
      "subject": "string",
      "status": "string"
    }
  ]
}
```
