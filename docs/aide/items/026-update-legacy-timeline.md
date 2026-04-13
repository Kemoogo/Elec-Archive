# Work Item: 026-update-legacy-timeline

## Description
This work item focuses on finalizing the transition from the legacy `AssignmentTimeline.tsx` component to the new `CareerTimeline.tsx` component. While the main Officer Detail page has been updated, the legacy component and its associated API calls still exist in the codebase. This task ensures the removal of dead code and formal deprecation of the old `Assignment` model usage in the UI layer.

## Acceptance Criteria
- [ ] `npm run build` succeeds after removal.

## Implementation Steps
1. **Usage Audit**:
   - Perform a final grep search to ensure `AssignmentTimeline` is not imported anywhere else.
2. **Component Removal**:
   - Delete `next/components/officers/AssignmentTimeline.tsx`.
3. **API Cleanup**:
   - Check if the backend route `next/app/api/officers/assignments/route.ts` can be safely removed or marked as deprecated (keep if needed for legacy migration scripts, but ensure no UI needs it).
4. **Verification**:
   - Run a full build to ensure no broken references remain.
5. **Documentation**:
   - Update `docs/aide/progress.md` to confirm the complete removal/replacement.

## Testing Strategy
- **Static Analysis**: Grep/IDE search for references.
- **Build Validation**: `npm run build` to catch ghost imports.

## Dependencies
- Item 023 (Career Timeline) - Completed.
- Item 025 (Update Officer Page) - Completed.

## Decisions & Trade-offs
- **Removal vs. Modification**: Decided to remove the component entirely rather than update it, as `CareerTimeline` provides a more comprehensive view including missions and promotions, making the old timeline redundant.
- **API Preservation**: The legacy API route `/api/officers/assignments` will be kept for now to avoid breaking any potential external integrations or historical logs, but it has been marked as **Deprecated** in the code and should not be used for new development.
- **Component Deletion**: Verified via grep that `AssignmentTimeline` was no longer imported in the application, making its removal safe.

## Testing Prerequisites (CRITICAL)

**Required Services**
- MongoDB 7 (Docker: `docker-compose up -d mongo`, Port: 27017)

**Environment Configuration**
- `DATABASE_URL` pointing to the local/docker MongoDB.

**Manual Validation Checklist**
- [ ] Build succeeds: `npm run build`
- [ ] **Feature verified**: Officer detail page still displays `CareerTimeline` correctly.
- [ ] **No Dead Code**: Verified no imports of `AssignmentTimeline` remain.

**Expected Outcomes**
- Clean removal of `AssignmentTimeline.tsx`.
- 0 build errors.

## Validation Results
- [x] Component removed: `next/components/officers/AssignmentTimeline.tsx`
- [x] Search confirmed 0 references.
- [x] API Route tagged as deprecated: `next/app/api/officers/assignments/route.ts`

## Completion Reminder
`docs/aide/progress.md` MUST be updated (📋 → 🚧 → ✅) when the item is completed.
