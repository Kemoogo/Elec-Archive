# Quickstart: شئون الضباط — Officers Affairs Module

## Prerequisites

- MongoDB container is running locally.
- App dependencies are installed in `next/`.
- At least one active user exists with `permissions.officers = edit`.
- At least one commander user exists to verify submitted rollcall visibility.

## 1. Prepare the workspace

```bash
cd /home/karim/Elec-Archive/next
npm install
```

## 2. Start local services

```bash
cd /home/karim/Elec-Archive
docker-compose up -d mongo
cd /home/karim/Elec-Archive/next
npm run dev
```

## 3. Implement in this order

1. Tighten the existing officers-related Mongoose models to match `data-model.md`.
2. Add `next/lib/validations/officers.ts` and `next/lib/officers/access.ts`.
3. Build SSR pages for officer list, officer detail, rollcall, and leave register.
4. Add officers API routes for officer CRUD, documents, rollcall, leaves, and assignments.
5. Integrate officer document upload rules and local storage pathing.
6. Add per-route rate limiting for all officers APIs.
7. Reuse audit logging and notifications for rollcall submission.
8. Add the automatic 09:00 reminder worker and local scheduling configuration.

## 4. Manual verification checklist

### Officer registry
- Create an officer with a valid `militaryId` and confirm it appears in `/officers`.
- Search by name and military ID.
- Filter by employment status.
- Attempt duplicate `militaryId` creation and confirm Arabic validation error.

### Officer detail + documents
- Open `/officers/[id]` and confirm personal, professional, leave, assignment, and document sections render.
- Upload a PDF under 5MB and confirm it appears in the officer file.
- Attempt a non-PDF or >5MB file and confirm rejection.

### Daily rollcall
- Open `/officers/rollcall` as an editor and confirm all active officers appear once.
- Try to submit with one missing status and confirm submission is blocked.
- Submit a completed day and confirm the record becomes read-only.
- Try to resubmit the same date and confirm duplicate prevention.
- Simulate connection loss before successful submission and confirm the unsent draft is restored when the page is reopened.
- Change an officer to inactive or remove an officer record during rollcall entry, then confirm submission is blocked with a clear Arabic conflict message until the roster is refreshed.
- Complete and submit a realistic daily roster sample and confirm the full workflow stays within the SC-002 target of less than 10 minutes.

### Commander review
- Sign in as commander and open `/officers/rollcall`.
- Confirm the submitted summary is visible with totals for present, absent, leave, and mission.
- Confirm no edit controls are available.

### Leave + assignments
- Create a leave record and confirm it appears in both the leave register and officer file.
- Create an absence record and confirm it appears in the same register and officer file with the correct category.
- Change a leave or absence record through the allowed status transitions and confirm invalid transitions are rejected.
- Attempt a conflicting date range for the same officer and confirm rejection.
- Add assignment, promotion, and mission records and verify timeline ordering.

## 5. Quality gates

```bash
cd /home/karim/Elec-Archive/next
npm run lint
npm run build
```

## 6. Reminder verification

- Workdays in this phase are Sunday through Thursday using the server's local time.
- Confirm the automatic reminder worker is configured to run at 09:00 local time without external services.
- Trigger the local reminder entry point manually to verify the worker payload.
- Confirm only active users with `permissions.officers = edit` receive the reminder notification.
- Confirm reminder text indicates whether that day's rollcall has already been submitted.

## 7. Performance verification

- Confirm officer search/filter results render within the `<1s` system target during manual verification.
- Confirm end-to-end access to an officer record via search/filter stays within the SC-001 target of less than 15 seconds.
- Confirm a full daily rollcall entry/submission cycle stays within the SC-002 target of less than 10 minutes.
- Confirm commander rollcall summary becomes visible within the SC-006 target after submission.

## 8. Rate-limiting verification

- Confirm read-heavy traffic to `/api/officers/**` is throttled after the configured 120 requests/minute threshold per authenticated user.
- Confirm create/update/submit operations are throttled after the configured 30 requests/minute threshold per authenticated user.
- Confirm officer document uploads are throttled after the configured 10 requests/5 minutes threshold per authenticated user.
- Confirm rate-limit rejections return HTTP `429` with a clear Arabic error message.
