# Work Item 032: Rollcall Reminders (نظام تنبيهات التمام)

## Description
This work item involves implementing a dual-purpose notification system for the Staff Operations (Arkan Harb) branch. 
1. **Daily Reminder**: A scheduled check every workday (Sunday to Thursday) at 09:00. If the daily rollcall for the current date has not been submitted yet, a system notification should be generated for users with Staff Operations permissions.
2. **Approval Notification**: When a Staff Operations officer approves/certifies the daily rollcall, a notification should be immediately sent to the Commander (and admins) to inform them that the rollcall is ready for review.

## Acceptance Criteria
- [ ] A background job or a scheduled function triggers every Sunday-Thursday at 09:00.
- [ ] The system checks if a rollcall exists for the current date.
- [ ] if no rollcall exists at 09:00, a "Pending Rollcall" notification is created for all users with `arkan_harb` or `admin` roles.
- [ ] When a rollcall is approved (status updated to 'certified' or similar), a notification is created for users with the `commander` role.
- [ ] Notifications appear in the system's notification center (if implemented) or are logged appropriately for UI display.
- [ ] The logic for "Workdays" (Sun-Thu) is correctly implemented.
- [ ] No external dependencies (like Cron) should be used if a simpler internal scheduling mechanism (like a check on page load or a specific API trigger) is preferred per project constraints, but ideally, it should be a robust background process.

## Implementation Steps
1. **Notification Schema Utility**: Ensure the existing notification system can handle these specific types (`ROLLCALL_REMINDER`, `ROLLCALL_APPROVED`).
2. **Scheduling Logic**:
   - Implement a mechanism to trigger the 09:00 check. Since this is a Next.js app without a permanent background worker by default, consider using an edge function, a helper script triggered by a scheduler, or a "check-on-first-load" logic if a true cron isn't available.
   - *Note*: Given the project's "No External Dependencies" rule, we might need a custom internal scheduler or a route that can be pinged.
3. **Rollcall Check Function**:
   - Create a service function that queries the `Rollcall` model for today's date.
   - If missing, create a notification document.
4. **Approval Hook**:
   - Update the rollcall approval API/Logic to trigger a notification creation for the Commander.
5. **Localization**: All notification messages must be in Arabic.
   - Reminder: "تنبيه: لم يتم تقديم التمام اليومي حتى الآن (الساعة 09:00)."
   - Approval: "تم اعتماد التمام اليومي من قبل ضابط أركان الحرب."

## Testing Strategy
- **Unit Tests**: Mock the date and time to verify the "Sun-Thu" logic.
- **Integration Tests**: 
  - Trigger the check function and verify a notification is added to the DB if the rollcall is missing.
  - Submit/Approve a rollcall and verify the Commander receives a notification.
- **Manual Verification**: Use the UI to check notifications after performing the actions.

## Decisions & Trade-offs
- **Internal Scheduler**: Since the project doesn't use a background worker (like Redis/Bull), we implemented the Daily Reminder check using a "check-on-load" pattern in the `DashboardLayout`.
- **Duplicate Prevention**: To avoid spamming notifications on every page load, the system checks if a reminder notification was already created for the current date.
- **Permission Scoping**: The periodic check is only triggered for users with Arkan Harb or Admin permissions to minimize database overhead.
- **Approval Logic**: Reused the existing rollcall submission as the "certification" point, updating it to notify commanders with the specific Arabic message requested.
- **Notification Model**: Updated the `Notification` model to include `rollcall_reminder` and `rollcall_approved` types for better classification.

## Completion Reminder
- [ ] Update `docs/aide/progress.md` (📋 → 🚧 → ✅) upon completion.

## Testing Prerequisites (CRITICAL)

### Required Services
- **MongoDB 7**: (Docker: `docker compose up -d mongo`, Port: 27017)

### Environment Configuration
- No new environment variables required.
- Ensure the application is running on port 3000.

### Manual Validation Checklist
- [ ] Build succeeds: `npm run build`
- [ ] Services started: `docker compose up -d mongo`
- [ ] Application runs: `npm run dev`
- [ ] **Feature verified**:
    - [ ] Manually trigger the 09:00 check function (via a temporary API route or script).
    - [ ] Confirm a notification appears for Staff Operations users if rollcall is missing.
    - [ ] Approve a rollcall as `staff_ops`.
    - [ ] Log in as `commander` and confirm the arrival of the approval notification.
- [ ] **Data verified**: 
    - [ ] `db.notifications.find()` shows the new records with correct `type` and `recipient`.
- [ ] **Health checks pass**: `/api/health` (or similar) returns 200.

## Validation Results
- [ ] Service started: MongoDB
- [ ] Application started successfully
- [ ] Database tables verified: Notifications, Rollcalls
- [ ] Seed data verified: N/A
- [ ] API endpoints verified: `/api/arkan-harb/rollcall/approve` (or equivalent)
- [ ] Screenshots captured: Notification center view if applicable
