# Work Item 024: Job Record Tab

## Description
Build the `PositionHistory.tsx` component to display an officer's job assignments history. This component will fetch and display data from the `PositionAssignment` model, showing the full history of roles held by the officer, including current and past assignments, their types (primary/substitute), dates, and status.

## Acceptance Criteria
- [ ] New component `next/components/officers/PositionHistory.tsx` created.
- [ ] Fetches data from `/api/arkan-harb/positions?officerId=[id]`.
- [ ] Displays a table with columns: Job Title (مسمى الوظيفة), Type (النوع: أساسي/بديل), Start Date (من), End Date (إلى), and Status (الحالة).
- [ ] Highlights the "Active" (نشط) assignment visually (e.g., subtle green background or badge).
- [ ] Handles empty states gracefully with a message in Arabic.
- [ ] Supports RTL layout and matches the project's design system (shadcn/ui + Tailwind).
- [ ] Ensures type safety using TypeScript (no `any`).

## Implementation Steps
1. **Create Component**: Create `next/components/officers/PositionHistory.tsx` as a `'use client'` component.
2. **Data Fetching**: Implement a fetch call to `/api/arkan-harb/positions` with the `officerId` parameter.
3. **UI Layout**:
    - Use `Table` components from shadcn/ui.
    - Map through position assignments.
    - Format dates using a helper (e.g., `toLocaleDateString('ar-EG')`).
4. **Styling**: Apply consistent styling with other tabs in the officer detail page.
5. **Integration**: Prepare the component to be imported into the `OfficerDetailTabs` component (implemented in Item 020).

## Testing Strategy
- **Manual Verification**:
    - Access an officer detail page and switch to the "Job Record" tab.
    - Verify that assignments are displayed correctly.
    - Ensure the "Active" assignment is clearly distinguishable.
    - Test with officers having multiple assignments, one assignment, and no assignments.
- **Console Check**: Verify no React or hydration errors in the browser console.

## Dependencies
- `PositionAssignment` model and API routes (Phase 2).
- `OfficerDetailTabs` component (Item 020).
- shadcn/ui Table components.

## Decisions & Trade-offs
- **Component Choice**: Used the project's `MainTable` component to handle rendering, ensuring consistent styling with other tables in the system.
- **Visual Highlighting**: Implemented a custom green background for the "Active" status badge to make it immediately distinguishable, as requested.
- **Data Fetching**: Added a `limit=100` parameter to the fetch call. While the current API defaults to 10, a full job record might exceed this, and pagination is less critical for a single officer's history compared to a global list.
- **Loading State**: Added a `Loader2` animation with Arabic "Loading" text for better UX.
- **Empty State**: Implemented a clear Arabic message when no records are found.

## Testing Prerequisites
(Same as above)

## Validation Results
- [x] Component implemented: `PositionHistory.tsx`
- [x] Integrated into `OfficerDetailPage` via `OfficerDetailTabs`.
- [x] API integrated: `/api/arkan-harb/positions?officerId=[id]`
- [x] Type safety verified: No `any` used.
- [x] UI verified: RTL and Design System compliant.

---
**Reminder**: `docs/aide/progress.md` MUST be updated (📋 → 🚧 → ✅) when this item is completed.
