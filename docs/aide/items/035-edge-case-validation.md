# Work Item 035: معالجة الحالات الحدية (Edge Case Validation)

## Description
Implementation of advanced server-side validation logic for the Staff Operations (Arkan Harb) module to ensure data consistency and prevent logical conflicts in leaves and position assignments.

## Acceptance Criteria
1. **Leave Overlap Prevention**:
   - The system must reject the creation or update of a leave if the period (startDate to endDate) overlaps with an existing leave for the same officer.
   - Leaves with "rejected" status MUST be ignored during overlap checks.
   - Overlap logic: `(requestedStartDate <= existingEndDate) && (requestedEndDate >= existingStartDate)`.
   - Error message: "يوجد تداخل مع إجازة أخرى مسجلة لنفس الضابط في هذه الفترة".

2. **Position Assignment Validation**:
   - **One Primary Job per Officer**: An officer cannot have more than one "active" position assignment with `positionType: "primary"`.
   - **One Primary Holder per Position**: Warn or prevent multiple officers from having an "active" primary assignment for the exact same `positionTitle`.
   - **Substitute Validation**: Ensure the `substituteForOfficerId` is an active officer (basic check).
   - Error message 1: "الضابط لديه تعيين أساسي نشط بالفعل".
   - Error message 2: "هذه الوظيفة مشغولة بالفعل بصفة أساسية من قبل ضابط آخر".

3. **General**:
   - All validations must be implemented on the Server Side (API Routes).
   - Error responses must follow the project standard (`success: false, error: "message"`) and use Arabic.
   - UI forms must display these errors gracefully.

## Implementation Steps

### 1. Leave Validation
- Update `next/app/api/arkan-harb/leaves/route.ts` (POST) and `next/app/api/arkan-harb/leaves/[id]/route.ts` (PATCH).
- Before saving/updating, query the `Leave` model:
  ```typescript
  const overlap = await Leave.findOne({
    officerId,
    status: { $ne: "rejected" },
    _id: { $ne: currentId }, // for updates
    $or: [
      { startDate: { $lte: endDate }, endDate: { $gte: startDate } }
    ]
  });
  ```

### 2. Position Assignment Validation
- Update `next/app/api/arkan-harb/positions/route.ts` (POST) and `next/app/api/arkan-harb/positions/[id]/route.ts` (PATCH).
- If `positionType === 'primary'`, check:
  - If `officerId` already has an active primary assignment.
  - If `positionTitle` is already occupied by another officer as "primary".

### 3. Error Handling
- Use `NextResponse.json({ success: false, error: "..." }, { status: 400 })`.

## Testing Strategy

### Automated/Manual Tests
- [ ] **Test Leave Overlap**:
    - Day 1-10 exists. Try creating Day 5-15 (Should Fail).
    - Day 1-10 exists. Try creating Day 11-15 (Should Pass).
    - Day 1-10 exists but is "rejected". Try creating Day 5-15 (Should Pass).
- [ ] **Test Position Constraints**:
    - Officer A is primary "Branch Chief". Try making Officer A primary "Section Head" (Should Fail).
    - Officer A is primary "Branch Chief". Try making Officer B primary "Branch Chief" (Should Fail/Warn).
    - Change status of current assignment to "archived" or "ended", then try again (Should Pass).

## Dependencies
- `Leave` and `PositionAssignment` models.
- Existing API handlers for these modules.
## Decisions & Trade-offs
- **Interpretations of "Same Job"**: Since `positionTitle` is a free-text field, the check will be a case-sensitive exact match. In the future, a "Positions" master table might be needed for more robust occupancy tracking.
- **Strict vs. Warning**: For "One Primary Holder per Position", we will implement it as a strict rejection for now to align with "تحققات صارمة".
- **Leave status**: Based on the project `Leave` model, `cancelled` is used to represent invalid/rejected states for overlapping checks.

## Validation Results
- [x] Service started: MongoDB
- [x] Application started successfully
- [x] Leave overlap logic verified
- [x] Position occupancy logic verified
- [x] Arabic error messages displayed in UI

---
*Note: This work item is part of Stage 6: Quality Gates & Polish.*
Status: ✅ Complete
