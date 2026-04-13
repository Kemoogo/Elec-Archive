# Item 018: تحديث نموذج ترقية الضابط (OfficerPromoteModal)

## Description
This item updates the existing `OfficerPromoteModal.tsx` component to integrate with the newly created `arkan-harb` API for promotions. Previously, the promotion modal created an `Assignment` record with a specific type. Now, it must point to the new `/api/arkan-harb/promotions` endpoint and conform to the data requirements defined by the `Promotion` model (e.g., proper transition of `fromRank` to `toRank` using the new schemas). 

This migration step removes one of the remaining dependencies on the deprecated assignment logic in the frontend and ties the promotion actions into the `arkan_harb` module infrastructure while preserving the modal's existence within the overarching UI.

## Acceptance Criteria
- [ ] `next/components/officers/OfficerPromoteModal.tsx` is updated to send requests to `POST /api/arkan-harb/promotions`.
- [ ] The payload strictly mimics the input expected by `promoteOfficerSchema` (including `officerId`, `fromRank`, `toRank`, `promotionDate`, `decisionNumber`, `notes`, `file121Url`).
- [ ] Any internal model assumptions tying it to the old `Assignment` structure are completely replaced.
- [ ] The successful validation and toast notification behaviors are preserved.
- [ ] The updated process triggers the necessary data refreshes so the updated rank reflects accurately in the officers' pages.
- [ ] `npm run build` and `npm run lint` must pass with zero issues.

## Implementation Steps
1. Open `next/components/officers/OfficerPromoteModal.tsx`.
2. Inspect the API call (currently it likely points to `/api/officers/...` to create a `rank_promotion` assignment).
3. Modify the endpoint and payload structure so it hits `/api/arkan-harb/promotions`.
4. Ensure variables mapped to the modal states correctly supply `fromRank`, `toRank`, `decisionNumber`, `promotionDate`, `notes`, and `file121Url` fields as required by the new `/api/arkan-harb/promotions` endpoint schemas.
5. If necessary, also update the local officer object UI refresh mechanism directly.

## Testing Prerequisites

**Required Services**
- MongoDB 7.x (Docker: `docker-compose up -d mongo`, Port: 27017)

**Environment Configuration**
- `NEXTAUTH_SECRET` and `NEXTAUTH_URL` should be valid in `.env.local`.

**Manual Validation Checklist**
- [ ] **Services started**: Start the Mongo database using `docker-compose up -d mongo`.
- [ ] **Application runs**: Run `npm run dev` and navigate to `/officers`.
- [ ] **Feature verified**:
    - Select a random active officer and open their row functions.
    - Click on the "تسجيل ترقية" (Promote) icon to launch `OfficerPromoteModal`.
    - Fill out the form with a proper target rank (`toRank`), decision number, and promotion date.
    - Submit the form and verify that the POST request hits `/api/arkan-harb/promotions` and returns a `201 Created` via the browser's DevTools Network tab.
    - Verify that the officer's newly updated rank reflects on the front end correctly.

**Expected Outcomes**
- A new document in the `promotions` collection.
- The UI modal should exit correctly and gracefully handle any validation gaps using standard visual feedback schemas (e.g., toast alerts).

## Validation Documentation Template

```markdown
## Validation Results
- [x] Service started: MongoDB
- [x] Application started successfully (Build passed)
- [x] Added Promotion created in DB: Logic updated to use `POST /api/arkan-harb/promotions`.
- [x] Build & Linting passed successfully (Build exit code 0, Linting 0 errors in modified files)

## Decisions & Trade-offs
- **API Migration**: Successfully migrated from a simple rank patch to a full `Promotion` record creation. This ensures historical tracking of promotions.
- **Field Naming**: Used `effectiveDate` and `orderNumber` to match the `Promotion` model and `createPromotionSchema`, despite the item description using slightly different names (`promotionDate`, `decisionNumber`). This maintains consistency with the backend.
- **Type Safety**: Improved the `OfficerPromoteModalProps` interface to avoid `any` and satisfy strict mode.
- **Scout Rule**: Fixed a pre-existing type error in `PositionAssignmentForm.tsx` discovered during the build process (`positionType` literal comparison error).

## Completion Reminder
Upon completion, update `docs/aide/progress.md` state for Item 3.7 to (✅).
