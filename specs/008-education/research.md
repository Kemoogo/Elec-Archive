# Research: التعليم (Education & Courses)

## Technical Decisions

### Decision 1: Course Model — No Changes Needed
**Decision**: The existing Course Mongoose model at `next/lib/db/models/Course.ts` already has all required fields: title, description, startDate, endDate, status (upcoming/ongoing/completed), participantModel (Officer/Student), participants (polymorphic ObjectId[]), documents. No schema changes needed.
**Rationale**: The model was pre-defined in the master plan with polymorphic participant references using `refPath`. This eliminates migration work and ensures consistency with the plan.
**Alternatives considered**: Separate enrollment junction table (rejected — unnecessary for embedded array pattern already established in the codebase).

### Decision 2: Polymorphic Participant Enrollment
**Decision**: Use the existing `participantModel` field with `refPath` to dynamically reference either `Officer` or `Student` collections. The `participants` array stores ObjectIds that resolve based on `participantModel`.
**Rationale**: This is already implemented in the Course model. It allows a single course to have either officers or students as participants (not mixed, enforced by participantModel being set at course creation).
**Alternatives considered**: Separate enrollment table with explicit type field (rejected — over-engineered for this scale), mixed participant types (rejected — spec requires participant type to be set at course creation).

### Decision 3: Course Deletion Policy
**Decision**: Course deletion is blocked while participants are enrolled. All participants must be removed first. This prevents accidental data loss for enrollment records.
**Rationale**: Per clarification. Hard-deleting a course with enrolled participants would lose the enrollment history. Requiring participant removal first creates an explicit safety gate.
**Alternatives considered**: Soft-delete with archive status (rejected — adds complexity), cascade delete (rejected — loses audit history).

### Decision 4: Status Transitions — Manual Only
**Decision**: Course status (upcoming/ongoing/completed) changes only through explicit user action via the edit form. No automatic status changes based on dates.
**Rationale**: Per clarification. Gives users full control over when a course transitions. A course's start date passing doesn't necessarily mean it has begun (delays, cancellations).
**Alternatives considered**: Auto-transition based on dates (rejected per clarification — too rigid), auto-suggest with user confirmation (rejected — adds unnecessary UI complexity).

### Decision 5: Concurrent Edit Handling — Last-Write-Wins
**Decision**: Use Mongoose's built-in `updatedAt` timestamp. Last-write-wins.
**Rationale**: Per clarification and consistent with the Student Affairs module. For a 10-30 user system, concurrent course edits are rare.
**Alternatives considered**: Optimistic locking with version field (rejected — over-engineered).

### Decision 6: Document Upload — Reuse Existing Pattern
**Decision**: Follow the same upload pattern as the Student Affairs and Fax modules. Store files in `public/uploads/courses/`. Validate MIME type + extension + 10MB size limit.
**Rationale**: Consistent with established project patterns. Multer/file handling already proven in other modules.
**Alternatives considered**: Cloud storage (rejected — offline constraint), dedicated upload service (rejected — unnecessary abstraction).

## Existing System Integration Points

- **Auth/RBAC**: Reuse JWT middleware from `lib/auth/` — `education` permission already in ModulePermissions type
- **AuditLog**: Reuse existing AuditLog model — `education` already in AuditModule type
- **Course model**: Already exists at `lib/db/models/Course.ts` — no changes needed
- **Officer/Student models**: Populate participants dynamically using `refPath`
- **Upload pattern**: Follow existing pattern from Student/Fax modules → `public/uploads/courses/`
