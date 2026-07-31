# Research: Patient Medical Record — الملف الطبي للمريض

## Research Tasks

### 1. PatientMedicalRecord Model Design

**Decision**: Create a new `PatientMedicalRecord` Mongoose model with the following schema:
- `patientId`: string (required, trimmed, indexed — links to existing `MedicalPatient.patientId`)
- `patientName`: string (required, trimmed — denormalized for display convenience)
- `allergies`: string[] (default empty array)
- `chronicConditions`: string[] (default empty array)
- `bloodType`: string (optional, enum: A+, A-, B+, B-, AB+, AB-, O+, O-)
- `medicalNotes`: string (default "")
- `severityNotes`: string (default "", free-text for allergy/condition severity context)
- `version`: number (default 0, incremented on each update for optimistic concurrency)

**Rationale**: The spec requires one record per patient with patient-level medical details. The existing `MedicalPatient` model has `allergies`, `chronicDiseases`, and `bloodType` as simple strings — not arrays. Creating a new model avoids breaking existing functionality and provides the structured array-based storage the spec requires. The `version` field enables optimistic concurrency control per FR-012.

**Alternatives considered**:
- Modify existing `MedicalPatient` model — rejected because it would break backward compatibility with existing medical visits that reference it
- Store all medical details as JSON blob — rejected because it loses type safety and queryability

### 2. Aggregated Medication History Query

**Decision**: Build a server-side aggregation pipeline that:
1. Fetches all `MedicalVisit` documents for a given `patientId` (populated with medicine references)
2. Flattens the `dispensedMedicines` arrays across all visits
3. Groups by `medicineId` and computes: total quantity, last dispense date
4. Populates medicine details (name, concentration, unit) to display full name including dosage/formulation

**Rationale**: FR-003 requires listing medicines with same base name but different dosages as separate entries. The existing `Medicine` model has a compound unique index on `{ name, unit, concentration }`, so each unique formulation is already a separate document. Grouping by `medicineId` naturally handles this.

**Alternatives considered**:
- Pre-compute and cache medication aggregates in `PatientMedicalRecord` — rejected because it adds write complexity and cache invalidation issues; on-demand aggregation is fast enough for 10-30 users
- Client-side aggregation — rejected because it would require fetching all visits and processing in browser, increasing payload size

### 3. Tabbed Modal Implementation Pattern

**Decision**: Use a client-side `PatientRecordModal` component with internal tab state:
- Parent: `PatientRecordModal` (client component) manages `activeTab` state, fetches data on mount
- Children: `VisitsTab`, `MedicationsTab`, `MedicalDetailsTab` (client components) receive data as props
- Tab navigation: simple button-based tabs with active state styling matching the existing `FolderTabs` pattern
- Content area: each tab scrolls internally with `max-h-[60vh] overflow-y-auto`

**Rationale**: The spec requires tabbed navigation within the modal (FR-001). The existing `FolderTabs` pattern is for page-level navigation, not modal internals. A simpler button-based tab pattern is more appropriate for modal content. Internal scroll per tab ensures the modal stays within 85vh max height.

**Alternatives considered**:
- Use existing `FolderTabs` component — rejected because it's designed for page-level navigation with URL routing, not modal internal navigation
- Server-rendered tabs with client-side switching — rejected because modal data is dynamic per patient; server rendering would require route changes

### 4. Optimistic Concurrency Implementation

**Decision**: Implement optimistic concurrency at the API route level:
1. GET returns current `version` field with the record data
2. PUT request includes `version` in the request body
3. Server performs: `findOneAndUpdate({ patientId, version: submittedVersion }, { $set: updates, $inc: { version: 1 } })`
4. If `modifiedCount === 0`, return HTTP 409 with Arabic conflict message and latest data
5. Client shows conflict message, refreshes modal data, lets user retry

**Rationale**: FR-012 specifies optimistic concurrency with version field. Mongoose's `findOneAndUpdate` with atomic `$inc` ensures the version check and increment happen in a single database operation, preventing race conditions.

**Alternatives considered**:
- Mongoose built-in `versionKey` (`__v`) — rejected because it's designed for document array operations, not application-level concurrency control; custom `version` field is clearer
- Timestamp-based concurrency — rejected because integer version is simpler to compare and debug

### 5. Patient Search API Design

**Decision**: Single search endpoint `/api/medical/patients/search` that:
- Accepts query params: `q` (search term), `limit` (default 20, max 50)
- Searches `MedicalPatient` collection using text index on `patientName` and regex on `patientId`
- Returns list of `{ patientId, patientName }` matches
- No auth beyond basic `permissions.medical !== "none"` (read-only)

**Rationale**: FR-007 requires search by patient ID or name. The existing `MedicalPatient` model already has a text index on `patientName`. Adding a regex search on `patientId` covers both search modes. Simple query params avoid the complexity of POST-based search.

**Alternatives considered**:
- Separate endpoints for ID search and name search — rejected because it adds API surface; single endpoint with smart matching is simpler
- Full-text search with MongoDB text scoring — rejected because exact ID match is more important than relevance scoring for this use case

### 6. Rate Limiting Strategy

**Decision**: Use the existing `checkApiRateLimit()` utility with two rate limit buckets:
- Read operations (GET): 60 requests per minute per user
- Write operations (PUT/POST): 20 requests per minute per user
- On violation: return HTTP 429 with Arabic message "تم تجاوز الحد المسموح، يرجى المحاولة لاحقاً" and `Retry-After` header

**Rationale**: FR-014 specifies exact rate limits. The existing `checkApiRateLimit()` function (used in other medical routes) provides the infrastructure. Need to verify it supports per-user rate limiting and custom limits.

**Alternatives considered**:
- Global rate limiting (not per-user) — rejected because it would unfairly penalize users when others are active
- Sliding window algorithm — if existing implementation uses fixed window, may need upgrade; will verify in implementation

### 7. Empty State Messages

**Decision**: Define consistent Arabic empty state messages:
- No visits: "لا توجد زيارات سابقة"
- No medications: "لا توجد أدوية سابقة"
- No medical details: "لم يتم إدخال تفاصيل طبية بعد"
- Search no results: "لا يوجد مريض بهذا الرقم" (for ID search) / "لا توجد نتائج مطابقة" (for name search)

**Rationale**: FR-008 requires Arabic empty state messages. These align with messages already specified in the spec's acceptance scenarios.

**Alternatives considered**: N/A — spec provides explicit messages

## Dependencies & Best Practices

### Existing Pattern Reuse

All new API routes will follow the established pattern from existing medical routes:
1. `authenticate()` from `@/lib/auth/middleware`
2. RBAC check on `auth.user!.permissions.medical`
3. `checkApiRateLimit()` with appropriate limits
4. `connectToDatabase()` from `@/lib/db/connect`
5. Zod validation from new `@/lib/validations/medical-record`
6. Business logic
7. `logAuditEvent()` from `@/lib/auth/audit`
8. Standardized JSON response

### Component Pattern Reuse

- Modal: `ModalShell` from `@/components/ui/modal-shell`
- Actions: `ModalActions` from `@/components/ui/modal-actions`
- Date display: `formatDateArabic()` utility (existing)
- Form fields: Officer-style labels with `text-xs font-bold text-(--app-muted-foreground)`
- Focus states: `focus:ring-blue-500/20 focus:border-blue-500`
- Select fields: Custom wrapper with `ChevronDown` icon

## Summary of Decisions

| # | Decision | Resolves |
|---|----------|----------|
| 1 | New `PatientMedicalRecord` model with arrays + version field | NEEDS CLARIFICATION: model structure |
| 2 | Server-side MongoDB aggregation for medication history | Best practice: data aggregation |
| 3 | Client-side tab state within ModalShell | Integration pattern: modal tabs |
| 4 | `findOneAndUpdate` with atomic version check + increment | FR-012: optimistic concurrency |
| 5 | Single search endpoint with text index + regex | FR-007: patient search |
| 6 | Existing `checkApiRateLimit()` with read/write buckets | FR-014: rate limiting |
| 7 | Defined Arabic empty state messages | FR-008: empty states |
