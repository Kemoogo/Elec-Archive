# Work Item: Primary Data Tab (تبويبة البيانات الأساسية)

## Description
Move current officer page content (personal info, documents, controls) into the "Primary Data" tab of the `OfficerDetailTabs` component. This ensures the first tab provides a comprehensive view of the officer's core record while transitioning the page to a tabbed interface.

## Acceptance Criteria
- [ ] The "Primary Data" tab (البيانات الأساسية) contains:
    - Personal Info Card (Name, Rank, Status, Unit, Position).
    - Detailed Info Items (Military ID, Seniority, National ID, etc.).
    - File 121 Link (if exists).
    - `OfficerDocuments` component.
    - Officer control buttons (Edit, Delete).
- [ ] UI layout within the tab is clean, responsive, and matches the premium design system.
- [ ] Action buttons (Edit via `OfficerForm`, Delete via `DeleteOfficerButton`) work correctly.
- [ ] Server-Side Rendering (SSR) is preserved for the data passed to these components.
- [ ] No regressions in file upload/viewing functionality within `OfficerDocuments`.
- [ ] RTL and Arabic language support is fully maintained.

## Implementation Steps
1. **Prepare Content Components**:
   - Extract the personal info card and grid into a dedicated section or sub-component if it helps organization.
   - Extract the File 121 and `OfficerDocuments` logic.

2. **Integrate with `OfficerDetailTabs`**:
   - Locate the `TabsContent` for the "Primary Data" tab in `OfficerDetailTabs.tsx`.
   - Inject the extracted content and controls.

3. **Update `OfficerDetailPage` (`/officers/[id]/page.tsx`)**:
   - Import `OfficerDetailTabs`.
   - Replace the current specific display blocks with the `OfficerDetailTabs` component.
   - Pass necessary data (officer details, documents, user permissions) to the component.

4. **Refactor Action Buttons**:
   - Move the logic for `OfficerForm` (edit mode) and `DeleteOfficerButton` from the `PageHeader` actions to the top or bottom of the Primary Data tab content, following the design preference (usually top-right of the content area).

5. **Style and Layout**:
   - Ensure the grid layout previously used in the main page works well within the `TabsContent` container.
   - Use shadcn/ui Tabs and consistent spacing tokens.

## Testing Strategy
- **Manual Verification**:
  - Open an officer's detail page.
  - Verify "Primary Data" is the first tab and contains all info.
  - Click "Edit" and confirm the modal opens with correct data.
  - Test "Delete" (without final confirmation if on real data, or on a test record).
  - Verify document list loads and files can be viewed.
- **Data Integrity**:
  - Check that all 8-10 `InfoItem` fields show the correct translated/formatted data.
- **Responsive Check**:
  - Verify the tab content stacks correctly on mobile.

## Decisions & Trade-offs
- **Button Placement**: Moved "Edit" and "Delete" buttons from the `PageHeader` actions to the top-right of the "Basic Info" card within the tab. This keeps the header clean and ensures actions are contextually tied to the data they modify.
- **Data Passing**: Re-organized content into `basicInfoTab`, `leavesTab`, and `careerTab` variables within the Server Component (`page.tsx`) and passed them as props to the Client Component (`OfficerDetailTabs`). This maintains SSR for the initial content while allowing client-side tab switching.
- **Backward Compatibility**: Updated the "View All" link in the leaves summary to point to the new `/arkan-harb/leaves` route as per Phase 3 redirects.
- **Build Unblocking**: Fixed a type error in `/app/(dashboard)/arkan-harb/page.tsx` where `DashboardCard` was being used with incorrect props (value/description/trend instead of count/subtitle). This was necessary to verify the build integrity of the project.

## Completion Reminder
`docs/aide/progress.md` MUST be updated (📋 → 🚧 → ✅) when the item is completed.

## Testing Prerequisites

**Required Services**
- MongoDB 7 (Docker: `docker compose up -d mongo`, Port: 27017)
- Elec-Archive App (Command: `npm run dev`)

**Environment Configuration**
- Ensure `MONGODB_URI` and `JWT_SECRET` are set.
- A user with `officers: edit` permission is needed for testing controls.

**Manual Validation Checklist**
- [ ] Build succeeds: `npm run build`
- [ ] Services started: MongoDB is running.
- [ ] Application runs: `npm run dev`
- [ ] **Feature verified**: Navigate to `/officers/[id]`. Verify content is inside the tab.
- [ ] **Controls verified**: Edit a field, Save, and verify change reflects in tab.
- [ ] **Data verified**: Verify Military ID and other info items are present.
- [ ] **Documents verified**: Ensure document list is visible.

## Validation Results
- [ ] Service started: MongoDB
- [ ] Application started successfully
- [ ] Database tables verified: Officer, Documents
- [ ] API endpoints verified: `/api/officers/[id]`
- [ ] Screenshots captured: [Primary Data Tab View]
