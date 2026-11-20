# API Contracts: منظومة السجل التاريخي للوحدة (`/api/historical-record/*`)

**Feature Branch**: `014-historical-record`  
**Date**: 2026-11-15  
**Base Auth Pattern**: Every route enforces `authenticate()` → RBAC check → `checkApiRateLimit()` → `connectToDatabase()` → Zod validation → business logic → `logAuditEvent()` → standardized `{ success, data }` / `{ success: false, error }` response.

---

## 1. Important Visits Endpoints

### `GET /api/historical-record/visits`
- **Auth / RBAC**: `canViewHistoricalRecord(user)` (`admin`, `commander`, or `historical_record: view | edit`).
- **Query Params** (Zod-validated):
  - `search?: string` (trimmed; applied only if length `>= 2`, matches `title`, `visitorName`, `description`)
  - `year?: number` (4-digit year filtering `visitDate` range `[YYYY-01-01, YYYY-12-31]`)
  - `sortOrder?: "desc" | "asc"` (default `"desc"`, sorted by `visitDate` then `createdAt`)
- **Response `200`**:
  ```json
  {
    "success": true,
    "data": {
      "items": ["HistoricalVisitDTO"],
      "availableYears": [2026, 2025]
    }
  }
  ```

### `POST /api/historical-record/visits`
- **Auth / RBAC**: `canAddHistoricalRecord(user)` (`admin`, `commander`, or `historical_record: edit`).
- **Request**: `multipart/form-data`:
  - `title`: `string` (required, 2–200 chars)
  - `visitorName`: `string` (required, 2–200 chars)
  - `visitDate`: `string` (required, ISO `YYYY-MM-DD`)
  - `description`: `string` (optional, max 4000 chars)
  - `photos`: `File[]` (0–10 images, `.jpg/.jpeg/.png/.webp`, max 10 MB each, magic-byte verified, saved under `public/uploads/historical-record/visits/`)
- **AuditLog**: `action: "CREATE"`, `module: "historical_record"`, `targetId: visit._id.toString()`.
- **Response `201`**: `{ "success": true, "data": HistoricalVisitDTO }`.

### `PATCH /api/historical-record/visits/[id]`
- **Auth / RBAC**: **`Admin` ONLY** (`user.role === "admin"`). Returns `403` for all other roles (including `commander` and `edit` users).
- **Request**: `multipart/form-data` or `application/json`:
  - `title?: string`, `visitorName?: string`, `visitDate?: string`, `description?: string`
  - `keepPhotos?: string` (JSON array of existing photo URLs to retain; any existing photos omitted are unlinked from `public/uploads/historical-record/visits/`)
  - `newPhotos?: File[]` (new images to append, total `keepPhotos.length + newPhotos.length <= 10`)
  - `reason`: `string` (**required**, min 3 chars, max 500 chars)
  - `confirmed`: `"true"` / `true` (**required**, double confirmation flag)
- **AuditLog**: `action: "UPDATE"`, `module: "historical_record"`, `targetId: id`, `description` includes `reason`.
- **Response `200`**: `{ "success": true, "data": HistoricalVisitDTO }`.

### `DELETE /api/historical-record/visits/[id]`
- **Auth / RBAC**: **`Admin` ONLY** (`user.role === "admin"`).
- **Request Body (`application/json`)**:
  - `reason`: `string` (**required**, min 3 chars, max 500 chars)
  - `confirmed`: `true` (**required**)
- **Side Effects**: Deletes document and unlinks all its local photos under `public/uploads/historical-record/visits/`.
- **AuditLog**: `action: "DELETE"`, `module: "historical_record"`, `targetId: id`, `description` includes `reason`.
- **Response `200`**: `{ "success": true, "data": { "id": id } }`.

---

## 2. Unit Commanders Endpoints

### `GET /api/historical-record/officers-options`
- **Auth / RBAC**: `canViewHistoricalRecord(user)` or `canAddHistoricalRecord(user)`.
- **Purpose**: Returns ALL officers from `Officer` collection (`isInUnit: true | false`, sorted by seniority/name) for the historical commander selector (`CustomSelect`), independent of `officers` module permissions.
- **Response `200`**: `{ "success": true, "data": HistoricalOfficerOptionDTO[] }`.

### `GET /api/historical-record/commanders`
- **Auth / RBAC**: `canViewHistoricalRecord(user)`.
- **Query Params**:
  - `search?: string` (trimmed; if length `>= 2`, matches `officerSnapshot.fullName`, `officerSnapshot.militaryId`, `officerSnapshot.rank`, `notes`)
  - `year?: number` (filters commanders whose tenure `[startDate, endDate || now]` intersects `YYYY`)
  - `status?: "all" | "current" | "former"` (default `"all"`)
  - `sortOrder?: "desc" | "asc"` (default `"desc"`, sorted by `startDate`)
- **Response `200`**:
  ```json
  {
    "success": true,
    "data": {
      "items": ["HistoricalCommanderDTO"],
      "currentCommander": "HistoricalCommanderDTO | null",
      "availableYears": [2026, 2024]
    }
  }
  ```

### `POST /api/historical-record/commanders`
- **Auth / RBAC**: `canAddHistoricalRecord(user)` (`admin`, `commander`, or `historical_record: edit`).
- **Request**: `multipart/form-data`:
  - `officerId`: `string` (required valid ObjectId in `Officer`, regardless of `isInUnit`)
  - `startDate`: `string` (required, ISO `YYYY-MM-DD`)
  - `isCurrent`: `"true" | "false"`
  - `endDate`: `string` (required when `isCurrent === "false"`, must satisfy `endDate >= startDate`; must be omitted when `isCurrent === "true"`)
  - `previousCommanderEndDate`: `string` (**required** when `isCurrent === "true"` AND an active `isCurrent: true` commander already exists; must satisfy `prev.startDate <= previousCommanderEndDate <= startDate`)
  - `notes`: `string` (optional, max 4000 chars)
  - `photo`: `File` (optional custom commander photo; if omitted, server physically copies `officer.photoUrl` if present to `public/uploads/historical-record/commanders/`)
- **Server Validations**:
  - Rejects `endDate < startDate` (`400`).
  - Checks interval overlap against all existing commanders (accounting for the closed `previousCommanderEndDate` if closing previous current commander); rejects overlapping periods (`409`).
  - Builds immutable `officerSnapshot` from `Officer`.
  - Executes atomic closure of previous current commander (with compensating rollback if insert fails).
- **AuditLog**:
  - If previous current commander closed: `UPDATE` on `previousCommander._id.toString()`.
  - `CREATE` on `newCommander._id.toString()`.
- **Response `201`**: `{ "success": true, "data": HistoricalCommanderDTO }`.

### `PATCH /api/historical-record/commanders/[id]`
- **Auth / RBAC**: **`Admin` ONLY** (`user.role === "admin"`).
- **Request**: `multipart/form-data` or `application/json`:
  - Editable fields: `startDate`, `endDate`, `isCurrent`, `previousCommanderEndDate` (required if switching to `isCurrent: true` while another active `isCurrent: true` commander exists), `notes`, `officerSnapshot` (`militaryId`, `fullName`, `rank`, `seniorityNumber`), optional new `photo` `File`, optional `removePhoto` flag.
  - Governance fields: `reason` (**required**, min 3 chars), `confirmed` (`true` **required**).
- **Validations**:
  - Enforces `endDate >= startDate` when `!isCurrent` and rejects explicit `endDate` when `isCurrent === true`, prevents second active `isCurrent: true` (requiring `previousCommanderEndDate` within `[other.startDate, startDate]` to close it atomically, or returning `409`), checks interval overlap excluding `[id]`.
  - Cleans up old file in `public/uploads/historical-record/commanders/` only if replaced/removed.
- **AuditLog**: `action: "UPDATE"`, `module: "historical_record"`, `targetId: id` (plus `UPDATE` on `otherCurrent._id` when atomically closed), `description` includes `reason`.

### `DELETE /api/historical-record/commanders/[id]`
- **Auth / RBAC**: **`Admin` ONLY** (`user.role === "admin"`).
- **Request Body**: `{ "reason": string (>=3), "confirmed": true }`.
- **Side Effects**: Deletes `HistoricalCommander` doc and its local photo under `public/uploads/historical-record/commanders/` (never touches `Officer` or `/uploads/officers/`).
- **AuditLog**: `action: "DELETE"`, `module: "historical_record"`, `targetId: id`, `description` includes `reason`.

---

## 3. Unit Profile & Milestones Endpoints

### `GET /api/historical-record/unit-profile`
- **Auth / RBAC**: `canViewHistoricalRecord(user)`.
- **Response `200`**: `{ "success": true, "data": UnitHistoricalProfileDTO | null }`.

### `PUT /api/historical-record/unit-profile`
- **Auth / RBAC**: **`Admin` ONLY** (`user.role === "admin"`).
- **Request**: `multipart/form-data`:
  - `unitName`: `string` (required, 2–200 chars)
  - `foundingDate?: string` (ISO `YYYY-MM-DD`)
  - `affiliation?: string`, `location?: string`, `motto?: string`, `mission?: string`
  - `emblem?: File` (optional image saved to `public/uploads/historical-record/unit/`)
  - `removeEmblem?: "true" | "false"`
  - **Conditional Governance**:
    - If `UnitHistoricalProfile` does **NOT** exist yet (initial setup per Clarification Q4): treated as `CREATE`; `reason` / `confirmed` optional.
    - If `UnitHistoricalProfile` **already exists**: treated as `UPDATE`; requires `reason` (min 3 chars) and `confirmed === "true"`.
- **AuditLog**: `action: existing ? "UPDATE" : "CREATE"`, `module: "historical_record"`, `targetId: profile._id.toString()`.
- **Response `200`**: `{ "success": true, "data": UnitHistoricalProfileDTO }`.

### `GET /api/historical-record/milestones`
- **Auth / RBAC**: `canViewHistoricalRecord(user)`.
- **Query Params**: `search?`, `year?`, `category?: UnitMilestoneCategory`, `sortOrder?: "desc" | "asc"` (default `"desc"`).
- **Response `200`**:
  ```json
  {
    "success": true,
    "data": {
      "items": ["UnitHistoricalMilestoneDTO"],
      "availableYears": [2026, 2020]
    }
  }
  ```

### `POST /api/historical-record/milestones`
- **Auth / RBAC**: `canAddHistoricalRecord(user)` (`admin`, `commander`, or `historical_record: edit`).
- **Request**: `multipart/form-data`:
  - `milestoneDate`: `string` (required ISO `YYYY-MM-DD`)
  - `title`: `string` (required, 2–200 chars)
  - `category`: `"founding" | "upgrade" | "mission" | "honor" | "other"`
  - `description?: string`
  - `photos`: `File[]` (0–10 images saved under `public/uploads/historical-record/milestones/`)
- **AuditLog**: `action: "CREATE"`, `module: "historical_record"`, `targetId: milestone._id.toString()`.
- **Response `201`**: `{ "success": true, "data": UnitHistoricalMilestoneDTO }`.

### `PATCH /api/historical-record/milestones/[id]`
- **Auth / RBAC**: **`Admin` ONLY** (`user.role === "admin"`).
- **Request**: `multipart/form-data` or JSON with `milestoneDate?`, `title?`, `category?`, `description?`, `keepPhotos?`, `newPhotos?`, `reason` (**required** min 3 chars), `confirmed` (`true` **required**).
- **AuditLog**: `action: "UPDATE"`, `module: "historical_record"`, `targetId: id`, `description` includes `reason`.

### `DELETE /api/historical-record/milestones/[id]`
- **Auth / RBAC**: **`Admin` ONLY** (`user.role === "admin"`).
- **Request Body**: `{ "reason": string (>=3), "confirmed": true }`.
- **Side Effects**: Deletes document and unlinks its photos under `public/uploads/historical-record/milestones/`.
- **AuditLog**: `action: "DELETE"`, `module: "historical_record"`, `targetId: id`, `description` includes `reason`.
