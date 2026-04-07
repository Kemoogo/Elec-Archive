# Research: شئون الطلبة (Student Affairs)

## Technical Decisions

### Decision 1: Student Status Field Implementation
**Decision**: Add a `status` enum field to the existing Student model with values: `active`, `graduated`, `inactive`, `withdrawn`. Default to `active` on creation. Soft-delete ("deactivate") sets status to `inactive`.
**Rationale**: Aligns with the clarification decision (Option B). Preserves data integrity for audit trails and potential future course-participant references. Prevents accidental permanent data loss.
**Alternatives considered**: Hard delete (rejected — loses audit history), separate `isActive` boolean (rejected — insufficient for graduated/withdrawn distinction).

### Decision 2: Document Cleanup on Deactivation
**Decision**: When a student is deactivated, associated document files are deleted from the filesystem (`public/uploads/students/`) and the `documents` array in the Student record is cleared.
**Rationale**: Per clarification, deactivation removes associated files. The document metadata (name, upload date) could optionally be preserved, but the spec specifies removal. Simpler approach reduces orphaned file accumulation.
**Alternatives considered**: Keep files and mark inactive (rejected per clarification), archive to separate directory (rejected — adds unnecessary complexity for 10-30 user system).

### Decision 3: Concurrent Edit Strategy
**Decision**: Last-write-wins using Mongoose's built-in `updatedAt` timestamp. No optimistic locking or version field needed.
**Rationale**: Per clarification. For a 10-30 user offline system, concurrent edits to the same student are rare. The risk of data loss is minimal and acceptable. Mongoose automatically updates `updatedAt` on save.
**Alternatives considered**: Optimistic locking with version field (rejected — over-engineered for scale), pessimistic locking (rejected — poor UX for offline system).

### Decision 4: File Upload Validation
**Decision**: Validate file type by MIME type check (application/pdf, image/jpeg, image/png) AND file extension (.pdf, .jpg, .jpeg, .png). Reject files exceeding 10MB. Use Multer for multipart parsing.
**Rationale**: Dual validation (MIME + extension) prevents spoofing. 10MB limit per clarification. Multer is the standard multipart middleware for Node.js/Next.js.
**Alternatives considered**: Sharp for image processing (rejected — unnecessary for archival), Formidable (rejected — Multer more standard).

### Decision 5: Search Implementation
**Decision**: MongoDB regex search on `studentId` and `fullName` fields with case-insensitive matching. Client-side filtering for enrollment date range.
**Rationale**: For 5,000 students, regex search is performant enough without full-text search infrastructure. Text index would be overkill. Date filtering is simple range comparison.
**Alternatives considered**: MongoDB text index (rejected — over-engineered for 5k records), Elasticsearch (rejected — offline constraint).

### Decision 6: Stitch MCP Screen Generation
**Decision**: Generate 2 screens via Stitch MCP: (1) Student List page, (2) Student Profile page. Reference DESIGN.md for visual consistency.
**Rationale**: Per master-plan.md Phase 6 specification. The list page includes search bar and add button. The profile page includes document upload section.
**Alternatives considered**: Manual component creation (rejected — violates Design-Driven UI principle).

## Existing System Integration Points

- **Auth/RBAC**: Reuse JWT middleware from `lib/auth/` and permission checks from Phase 1
- **AuditLog**: Reuse existing AuditLog model at `lib/db/models/AuditLog.ts`
- **Upload pattern**: Follow existing pattern from Fax module (`public/uploads/fax/`) → `public/uploads/students/`
- **Zod validation**: Follow existing schema patterns from other modules
- **Student model**: Update existing `lib/db/models/Student.ts` — add `status` field
