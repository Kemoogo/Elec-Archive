# Research: النقطة الطبية — Medical Point Module

## Technology Decisions

### Atomic Stock Operations
- **Decision**: Use MongoDB `findOneAndUpdate` with a pre-check filter `quantity: { $gte: requestedQty }` and update `{ $inc: { quantity: -requestedQty } }`
- **Rationale**: MongoDB's `findOneAndUpdate` is atomic at the document level. By including `quantity: { $gte: requestedQty }` in the filter, the update only succeeds if stock is sufficient. No negative stock is possible without transactions.
- **Alternatives considered**: 
  - MongoDB multi-document transactions — overkill for single-document stock field; adds latency
  - Application-level locking — complex, not needed for 10-30 users
  - Separate StockMovement collection — adds complexity for this phase; consider for batch tracking later

### Patient Model — `unique: true` on `patientId`
- **Decision**: Remove `unique: true` from `patientId` field on Patient schema
- **Rationale**: The spec (Edge Case: "Duplicate patient ID") explicitly states "Two visits for the same patient on the same day must be allowed." A patient can have multiple visit records over time. The current model has `unique: true` which would prevent this.
- **Alternatives considered**: Compound index `(patientId, visitDate)` — rejected as over-complication; same patient can visit twice in one day too.

### Notification Types
- **Decision**: Add `low_stock` to `NotificationType` enum in Notification model
- **Rationale**: The existing Notification model has `medicine_expiry` but not `low_stock`. The spec (FR-010) requires notifications for both expired and low-stock medicines.
- **Alternatives considered**: Use `medicine_expiry` for both — rejected as semantically incorrect; different alert types need different handling/display.

### Rate Limiting
- **Decision**: Reuse existing rate-limiting middleware from fax/officers modules
- **Rationale**: The spec (FR-016) references "defined read/write thresholds." Existing modules already apply per-route rate limiting. Same pattern can be applied to medical routes.
- **Alternatives considered**: New rate-limiting library — unnecessary; existing infrastructure is sufficient.

### Expiry Check Scheduling
- **Decision**: Provide an API endpoint (`/api/medical/checks`) that runs on-demand; optionally integrate with a cron-like mechanism later
- **Rationale**: The spec mentions "the system runs the expiry check" but doesn't specify scheduling. An on-demand endpoint is the simplest approach. Can be called from a dashboard button or a simple server-side timer.
- **Alternatives considered**: 
  - Node.js `setInterval` — works but fragile across restarts
  - MongoDB change streams — overkill for this use case
  - External cron — violates offline-first principle

### Search Performance (SC-007)
- **Decision**: Use MongoDB text indexes or regex on `patientName` and `patientId` fields
- **Rationale**: For up to 500 records, regex search with indexed fields will easily meet the <1s target. Text indexes provide better performance for larger datasets.
- **Alternatives considered**: Full-text search engine (Elasticsearch) — overkill for 500 records, violates offline-first.

### Medicine Delete with Historical References (Edge Case)
- **Decision**: Block deletion if medicine has any visit references; do NOT soft-delete
- **Rationale**: FR-008 specifies "deletion of medicines only when they have no visit references." Historical visit records reference medicines by ObjectId. If a medicine is deleted, Mongoose `populate()` on old visits will return null for that medicine. This is acceptable — the visit record itself is preserved.
- **Alternatives considered**: 
  - Soft-delete (add `isDeleted` flag) — more complex, requires filtering everywhere
  - Allow deletion and keep denormalized name in visit — requires schema change

### Stitch MCP UI Generation
- **Decision**: Use live Stitch MCP server (project `14721618739991060852`) with "Vault Modern" design system for all medical screens
- **Rationale**: Constitution Principle VI mandates Stitch MCP workflow for all frontend pages. The existing project already has the design system configured with Arabic RTL support, glassmorphism styling, and the Executive Deep Blue color palette.
- **Workflow**: Generate screens via `stitch_generate_screen_from_text`, apply design system via `stitch_apply_design_system`, extract HTML/CSS, convert to Next.js components with Tailwind CSS + shadcn/ui.
- **Alternatives considered**: Manual component creation — violates constitution; must use Stitch MCP.

## Existing Infrastructure Reuse

| Component | Status | Location |
|-----------|--------|----------|
| Auth middleware | ✅ Exists | `next/lib/auth/middleware.ts` |
| Audit logging | ✅ Exists | `next/lib/auth/audit.ts` |
| Notification creation | ✅ Exists | `next/lib/notifications/createNotification.ts` |
| Error messages (Arabic) | ✅ Exists | `next/lib/auth/errors.ts` |
| Patient model | ✅ Exists (needs `unique` removal) | `next/lib/db/models/Patient.ts` |
| Medicine model | ✅ Exists | `next/lib/db/models/Medicine.ts` |
| Notification model | ✅ Exists (needs `low_stock` type) | `next/lib/db/models/Notification.ts` |
| AuditLog model | ✅ Exists (already has `medical` module) | `next/lib/db/models/AuditLog.ts` |
| User model | ✅ Exists (already has `medical` permission) | `next/lib/db/models/User.ts` |
| Stitch MCP Design System | ✅ Live | Project `14721618739991060852`, "Vault Modern" |
