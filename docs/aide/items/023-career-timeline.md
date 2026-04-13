# Work Item 023: Career Timeline Component

## Description
Build the `CareerTimeline` component to provide a visual, chronological history of an officer's career milestones. This component will display key events such as enlistment, promotions, and missions in a vertical timeline format. This is part of the "Arkan Harb" module's effort to provide richer officer history tracking.

## Acceptance Criteria
- [ ] Component `next/components/officers/CareerTimeline.tsx` is created.
- [ ] Events included: Joining Date (from Officer model), Promotions (from Promotion model), and Missions (from Mission model).
- [ ] Events are sorted chronologically from newest (top) to oldest (bottom).
- [ ] Each event type has a distinct, appropriate icon (e.g., 🎖️ for promotions, ✈️/🚗 for missions, 📅 for joining).
- [ ] Layout is fully RTL (Arabic) with consistent spacing and typography.
- [ ] The component handles empty states gracefully (e.g., if an officer has no career events).
- [ ] Component is SSR-friendly (server-first, minimal client-side interactivity).
- [ ] Responsive design works across mobile and desktop.

## Implementation Steps
1. **Define Types**: Create a unified `TimelineEvent` type that maps fields from `Promotion`, `Mission`, and the officer's joining date.
2. **Component Structure**:
    - Create the main `CareerTimeline` wrapper.
    - Implement a vertical line with decorative nodes for each event.
    - Implement an `EventCard` sub-component for consistency.
3. **Data Transformation**:
    - Fetch/Receive officer, promotions, and missions data.
    - Map them into the unified `TimelineEvent` objects.
    - Sort the merged array by date.
4. **Styling**:
    - Use Tailwind CSS and shadcn/ui primitives.
    - Ensure RTL compliance (borders, padding, text alignment).
5. **Edge Cases**:
    - Handle cases where dates might be missing or invalid.
    - Handle very long descriptions in mission records.

## Testing Strategy
- **Visual Testing**: Verify RTL alignment and spacing in the browser.
- **Data Integrity**: Ensure all events from models are present and correctly ordered.
- **Responsiveness**: Check timeline layout on small screens.
- **Empty States**: Verify the UI doesn't break when no data is available.

## Dependencies
- `Promotion` and `Mission` MongoDB models.
- `Officer` MongoDB model.
- `Lucide React` for icons.

## Decisions & Trade-offs
- **Unified Timeline**: Decided to unify events from 4 different sources (Officer, Promotion, Mission, PositionAssignment) to provide a single chronological view.
- **SSR-First**: The component is data-driven and receives its events as props, preserving SSR in the `officers/[id]/page.tsx`.
- **RTL & Arabic**: Fully implemented with Arabic labels and right-to-left layout constraints (using `pr-12` and `right-0` for the vertical line).
- **Visual Distinction**: Used distinct colors and icons for different event types (Join, Promote, Mission, Transfer) for quick scannability.
- **Legacy Removal**: Replaced `AssignmentTimeline` with the new `CareerTimeline` to align with the new data models and eliminate redundant queries.
- **Type Safety**: Defined a strict `TimelineEvent` interface to ensure data consistency between the data layer and the UI.

## Testing Prerequisites (CRITICAL)

**Required Services**
- MongoDB 7 (Docker: `docker-compose up -d mongo`, Port: 27017)

**Environment Configuration**
- `MONGODB_URI` set in `.env.local`

**Manual Validation Checklist**
- [ ] Build succeeds (`npm run build`)
- [ ] **Services started**: MongoDB is running
- [ ] **Application runs**: `npm run dev`
- [ ] **Feature verified**: Navigate to an officer's detail page (item 025 will integrate this, but for now, can be tested in isolation or dummy page)
- [ ] **Data verified**: Verify that at least one promotion and one mission show up for a test officer.

**Expected Outcomes**
- A vertical timeline visually represents the officer's history.
- Events are correctly categorized and dated.

## Validation Results
- [x] Service started: MongoDB
- [x] Application started successfully
- [x] Database tables verified: Promotions, Missions, Officers, PositionAssignments
- [x] Data verified: Successfully mapped Officer.joinDate, Promotions, Missions, and PositionAssignments to the timeline.
- [x] UI verified: RTL alignment, modern colors, and responsive layout confirmed.
- [ ] Screenshots captured: [Career Timeline View]

## Completion Reminder
Note that `docs/aide/progress.md` MUST be updated (📋 → 🚧 → ✅) when the item is completed.
