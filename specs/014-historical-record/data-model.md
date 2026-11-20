# Data Model: منظومة السجل التاريخي للوحدة (Phase 5)

**Feature Branch**: `014-historical-record`  
**Date**: 2026-11-15  
**Spec**: [spec.md](file:///home/karim/projects/Elec-Archive/specs/014-historical-record/spec.md)

## 1. Centralized Types (`next/types/historical-record.ts`)

All domain interfaces, DTOs, filter types, and union types MUST be defined in `next/types/historical-record.ts` and re-exported from `next/types/index.ts`. Zero ad-hoc entity interfaces in pages/components.

- `HistoricalRecordTab`: `"visits" | "commanders" | "unit-info"`
- `TimelineSortOrder`: `"desc" | "asc"`
- `UnitMilestoneCategory`: `"founding" | "upgrade" | "mission" | "honor" | "other"`
- `OfficerSnapshotDTO`:
  - `militaryId: string`
  - `fullName: string`
  - `rank: string`
  - `rankLabel?: string`
  - `seniorityNumber?: string`
- `HistoricalVisitDTO`:
  - `id: string`
  - `title: string`
  - `visitorName: string`
  - `visitDate: string` (ISO `YYYY-MM-DD`)
  - `description?: string`
  - `photos: string[]`
  - `createdBy: string`
  - `createdByName?: string`
  - `createdAt: string`
  - `updatedAt: string`
- `HistoricalCommanderDTO`:
  - `id: string`
  - `officerId?: string`
  - `officerSnapshot: OfficerSnapshotDTO`
  - `photoUrl?: string`
  - `startDate: string` (ISO `YYYY-MM-DD`)
  - `endDate?: string` (ISO `YYYY-MM-DD`, omitted when `isCurrent === true`)
  - `isCurrent: boolean`
  - `durationLabel: string` (computed server/client display string)
  - `notes?: string`
  - `createdBy: string`
  - `createdByName?: string`
  - `createdAt: string`
  - `updatedAt: string`
- `UnitHistoricalProfileDTO`:
  - `id: string`
  - `unitName: string`
  - `foundingDate?: string` (ISO `YYYY-MM-DD`)
  - `affiliation?: string`
  - `location?: string`
  - `motto?: string`
  - `mission?: string`
  - `emblemUrl?: string`
  - `updatedBy?: string`
  - `updatedAt: string`
- `UnitHistoricalMilestoneDTO`:
  - `id: string`
  - `milestoneDate: string` (ISO `YYYY-MM-DD`)
  - `title: string`
  - `category: UnitMilestoneCategory`
  - `categoryLabel: string`
  - `description?: string`
  - `photos: string[]`
  - `createdBy: string`
  - `createdByName?: string`
  - `createdAt: string`
  - `updatedAt: string`
- `HistoricalOfficerOptionDTO`:
  - `id: string`
  - `militaryId: string`
  - `seniorityNumber: string`
  - `fullName: string`
  - `rank: string`
  - `rankLabel: string`
  - `isInUnit: boolean`
  - `employmentStatus: string`
  - `photoUrl?: string`

## 2. Database Models (`next/lib/db/models/`)

### 2.1 `HistoricalVisit.ts`
- **Collection**: `historicalvisits`
- **Fields**:
  - `title`: `String`, required, trimmed, max 200
  - `visitorName`: `String`, required, trimmed, max 200
  - `visitDate`: `Date`, required
  - `description`: `String`, optional, trimmed, max 4000
  - `photos`: `[String]`, default `[]` (paths under `/uploads/historical-record/visits/...`)
  - `createdBy`: `Schema.Types.ObjectId`, ref `"User"`, required
  - `timestamps: true` (`createdAt`, `updatedAt`)
- **Indexes**:
  - `{ visitDate: -1, createdAt: -1 }`
  - `{ title: "text", visitorName: "text", description: "text" }` (or regex search with `escapeRegex`)

### 2.2 `HistoricalCommander.ts`
- **Collection**: `historicalcommanders`
- **Fields**:
  - `officerId`: `Schema.Types.ObjectId`, ref `"Officer"`, optional (non-cascading reference; never unique to allow multiple non-overlapping terms per Clarification Q2)
  - `officerSnapshot`: sub-schema `{ militaryId: String (required), fullName: String (required), rank: String (required), seniorityNumber: String (optional) }` (`_id: false`)
  - `photoUrl`: `String`, optional (independent copy under `/uploads/historical-record/commanders/...`)
  - `startDate`: `Date`, required
  - `endDate`: `Date`, optional (MUST be undefined/unset when `isCurrent === true`)
  - `isCurrent`: `Boolean`, required, default `false`
  - `notes`: `String`, optional, trimmed, max 4000
  - `createdBy`: `Schema.Types.ObjectId`, ref `"User"`, required
  - `timestamps: true`
- **Indexes**:
  - `{ startDate: -1, createdAt: -1 }`
  - `{ isCurrent: 1 }` (partial unique index `{ isCurrent: 1 }, { unique: true, partialFilterExpression: { isCurrent: true } }` to guarantee at most ONE current commander at the DB level!)
  - `{ officerId: 1 }` (non-unique index for lookup)
- **Schema Validation**:
  - If `isCurrent === true`, `endDate` must be absent.
  - If `isCurrent === false`, `endDate` is required and `endDate >= startDate`.

### 2.3 `UnitHistoricalInfo.ts` (+ `UnitHistoricalInfo.shared.ts`)
Contains two models + shared category labels/constants:
1. **`UnitHistoricalProfile`** (singleton document):
   - `singletonKey`: `String`, default `"default"`, `unique: true` (enforces single unit profile record)
   - `unitName`: `String`, required, trimmed, max 200
   - `foundingDate`: `Date`, optional
   - `affiliation`: `String`, optional, trimmed, max 200
   - `location`: `String`, optional, trimmed, max 200
   - `motto`: `String`, optional, trimmed, max 300
   - `mission`: `String`, optional, trimmed, max 2000
   - `emblemUrl`: `String`, optional (path under `/uploads/historical-record/unit/...`)
   - `updatedBy`: `Schema.Types.ObjectId`, ref `"User"`, optional
   - `timestamps: true`
2. **`UnitHistoricalMilestone`**:
   - `milestoneDate`: `Date`, required
   - `title`: `String`, required, trimmed, max 200
   - `category`: `String`, enum `["founding", "upgrade", "mission", "honor", "other"]`, required, default `"other"`
   - `description`: `String`, optional, trimmed, max 4000
   - `photos`: `[String]`, default `[]` (paths under `/uploads/historical-record/milestones/...`)
   - `createdBy`: `Schema.Types.ObjectId`, ref `"User"`, required
   - `timestamps: true`
   - **Indexes**: `{ milestoneDate: -1, createdAt: -1 }`, `{ category: 1, milestoneDate: -1 }`

### 2.4 Existing Model Updates
1. **`User.ts`** (`next/lib/db/models/User.ts`):
   - Add `historical_record: ModulePermission` to `IUser.permissions` and `UserSchema.permissions` (`default: "none"`).
2. **`AuditLog.ts`** (`next/lib/db/models/AuditLog.ts`):
   - Add `"historical_record"` to `AuditModule` union type and `AuditLogSchema.module.enum`.
   - Ensure `next/lib/validations/audit.ts` (`AUDIT_MODULES`), `next/components/dashboard/AuditLogPageClient.tsx`, and `next/components/dashboard/AuditLogTable.tsx` include `"historical_record": "السجل التاريخي"`.

## 3. State Transitions & Invariants

1. **Commander `isCurrent` Lifecycle**:
   - State 1: `isCurrent: true, endDate: undefined` ("حتى الآن") — at most 1 record in collection via partial unique index.
   - Transition on `POST /commanders` with `isCurrent: true` when State 1 exists:
     - Requires `previousCommanderEndDate` (`>= prev.startDate` and `<= new.startDate`).
     - Atomically closes previous commander (`isCurrent: false, endDate: previousCommanderEndDate`) before inserting new `isCurrent: true` commander (with rollback on error).
   - State 2: `isCurrent: false, endDate: Date` (`endDate >= startDate`).
2. **Non-Cascading Isolation with `Officer`**:
   - Deleting or updating `Officer` (`DELETE /api/officers/[id]`, `PATCH /api/officers/[id]`, `POST /api/officers/[id]/photo`) performs ZERO operations on `HistoricalCommander` and ZERO file deletions in `public/uploads/historical-record/`.
3. **Unit Profile Singleton Lifecycle**:
   - Absent (`null`) → First `PUT /unit-profile` by `Admin` creates singleton document (`AuditAction: "CREATE"`, no reason required).
   - Present → Subsequent `PUT /unit-profile` by `Admin` updates singleton document (`AuditAction: "UPDATE"`, double confirmation + mandatory `reason` required).
