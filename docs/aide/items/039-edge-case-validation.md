# Work Item: 039 - Edge Case Validation

## Description
Add strict server-side validation to prevent overlapping leave periods for the same officer and alert the user if two officers are assigned to the same core function. Include Arabic error messages.

## Acceptance Criteria
- [ ] Prevent overlapping leave periods for the same officer on the server side.
- [ ] Alert user if two officers are assigned to the same core position.
- [ ] All error messages are in Arabic.
- [ ] API routes enforce these business rules before DB operations.

## Implementation Steps
1. Review `next/lib/validations/arkan-harb.ts` and update with new validation logic if needed.
2. Update `next/app/api/arkan-harb/leaves/route.ts` to check for overlapping leaves.
3. Update `next/app/api/arkan-harb/positions/route.ts` to check for position conflicts.
4. Add unit tests for these validation rules.

## Testing Strategy
- Manual: Create overlapping leaves and verify 400 Bad Request with Arabic message.
- Manual: Assign two officers to the same position and verify warning/error.
- Automated: Add Jest/Vitest tests for the validation logic.

## Dependencies
- `arkan-harb` API routes.
- `PositionAssignment` and `Leave` models.

## Decisions & Trade-offs
To be updated during implementation.

## Completion Reminder
Update `docs/aide/progress.md` (📋 → 🚧 → ✅) when the item is completed.

## Testing Prerequisites
**Required Services**
- PostgreSQL 15+ (`docker compose up -d postgres`, 5432)

**Environment Configuration**
- `NEXT_PUBLIC_BASE_URL`

**Manual Validation Checklist**
- [ ] Build succeeds
- [ ] Tests pass
- [ ] Services started: `docker compose up -d`
- [ ] Application runs: `npm run dev`
- [ ] Feature verified: Overlap creation blocked
- [ ] Data verified: DB integrity
- [ ] Health checks pass: `/api/health`

## Expected Outcomes
- API rejects invalid operations with clear Arabic error messages.

## Validation Results
- [ ] Service started: [service name]
- [ ] Application started successfully
- [ ] Database tables verified: [list tables or N/A]
- [ ] Seed data verified: [describe or N/A]
- [ ] API endpoints verified: [list endpoints or N/A]
- [ ] Screenshots captured: [if UI changes]
