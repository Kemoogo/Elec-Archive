# Work Item 022: Leave Record Tab (تبويبة سجل الإجازات)

## Description
Create the second tab for the officer detail page (`/officers/[id]`) to display a mini-table of the officer's leave history. This component will fetch its own data on the client side to keep the initial page load fast and focused on primary data.

## Acceptance Criteria
- [x] Tab 2 is labeled "الإجازات" and correctly displays when selected.
- [x] Displays a table with columns: "نوع الإجازة" (Type), "من" (From), "إلى" (To), and "الحالة" (Status).
- [x] Data is fetched from `/api/arkan-harb/leaves?officer_id={id}`.
- [x] Displays a loading state while fetching data.
- [x] Displays an empty state message ("لا توجد إجازات مسجلة") if no records are found.
- [x] Includes a "عرض الكل" (View All) link/button that redirects to `/arkan-harb/leaves?officer_id={id}`.
- [x] Component is fully RTL compatible and matches the project's design system.
- [x] No build errors or lint warnings.

## Implementation Steps
1. [x] **Create Component**: Create `next/components/officers/tabs/LeaveRecordTab.tsx`.
2. [x] **State Management**: Implement `useState` and `useEffect` to fetch leave data for the specific officer.
3. [x] **API Integration**: Call the existing `/api/arkan-harb/leaves` endpoint with the `officerId` filter.
4. [x] **UI Construction**:
    - Use `Table` components from shadcn/ui.
    - Implement a skeleton or spinner for the loading state.
    - Style the status cells with appropriate colors (e.g., Badge colors for Finished, Ongoing, etc.).
5. [x] **Add Navigation**: Add the "View All" link at the bottom or top-right of the tab content.
6. [x] **Register Tab**: Integrate the new component into the `OfficerDetailTabs` component created in Item 020.

## Testing Strategy
- **Manual Verification**:
    - Navigate to an officer's detail page.
    - Click on the "الإجازات" tab.
    - Verify that data loads and is displayed correctly.
    - Verify that the "View All" link redirects to the filtered leaves page.
- **Data Integrity**: Verify that only leaves belonging to that specific officer are shown.
- **Empty State**: Verify the empty state message for an officer with no leaves.

## Decisions & Trade-offs
- **Client-Side Fetching**: Refactored from server-side to client-side fetching within the tab to optimize initial page load performance.
- **Standardized Table**: Switched from bare HTML `<table>` to the project's `MainTable` component for consistent styling and features.
- **Enhanced Metadata**: Added "الفئة" (Category) column to clearly distinguish between Leaves and Absences in the summary view.
- **Animation**: Implemented `animate-in fade-in` for smoother entry when switching tabs.

## Dependencies
- Item 020 (OfficerDetailTabs component)
- Existing `/api/arkan-harb/leaves` API route

## Testing Prerequisites (CRITICAL)

**Required Services**
- MongoDB 7+ (Docker: `docker-compose up -d mongo`, Port: 27017)

**Environment Configuration**
- `NEXTAUTH_SECRET` must be set.
- User must have `arkan_harb:view` or `officers:view` permission.

**Manual Validation Checklist**
- [ ] Build succeeds: `npm run build`
- [ ] **Services started**: MongoDB is running
- [ ] **Application runs**: `npm run dev`
- [ ] **Feature verified**: Navigate to `/officers/[id]`, switch to "الإجازات" tab.
- [ ] **Data verified**: Verify table content matches the data in the database for that officer.
- [ ] **Health checks pass**: `/api/arkan-harb/leaves?officer_id=...` returns 200 OK.

## Validation Documentation Template

```markdown
## Validation Results (022)
- [ ] Service started: MongoDB
- [ ] Application started successfully
- [ ] Tab switching verified
- [ ] API integration verified (leaves fetched for correct officer)
- [ ] "View All" redirection verified
- [ ] Screenshots captured
```

---
> [!IMPORTANT]
> Remember to update `docs/aide/progress.md` (📋 → 🚧 → ✅) upon completion.
