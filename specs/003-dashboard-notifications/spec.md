# Feature Specification: Dashboard & Notifications

**Feature Branch**: `[003-dashboard-notifications]`  
**Created**: 2026-03-26  
**Status**: Draft  
**Input**: User description: "read @master-plan.md and create a specification for PHASE 2 — Dashboard & Notifications"

## Overview

This feature delivers the Commander Dashboard, a real-time Notifications system, and a filterable Audit Log page. It provides the central command center for the system — allowing the Commander to monitor all departments at a glance, receive alerts on new faxes, rollcall submissions, and medicine expiry, and review a complete history of all operations performed by users.

## Clarifications

### Session 2026-03-26

- Q: Who receives real-time notifications? → A: Only the Commander role receives notifications. Other roles do not get notification alerts.
- Q: What happens when the SSE connection drops? → A: Client auto-reconnects with exponential backoff. A visible reconnection indicator is shown to the user. Missed notifications are delivered on reconnect.
- Q: Should old notifications be auto-archived or expired? → A: No auto-expiry. Users can manually mark individual notifications as read or use "mark all as read." No automatic deletion.
- Q: What should Employees see on the dashboard? → A: Employees see only the summary card for their assigned department. Commander and Admin see all department cards.
- Q: How should empty states be displayed? → A: Show a friendly Arabic message per card/panel (e.g., "لا توجد فاكسات معلقة" / "لا توجد إشعارات جديدة"). Do not hide empty cards.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Commander Dashboard Overview (Priority: P1)

The Commander logs in and lands on the main dashboard. The dashboard displays summary cards for each department showing key metrics: pending fax count, today's rollcall status, expired/low-stock medicines, active courses, and student counts. The Commander can immediately identify what needs attention.

**Why this priority**: The dashboard is the primary entry point for the Commander role. Without it, the Commander has no centralized view of operations. This is the core value of Phase 2.

**Independent Test**: Log in as Commander and verify that the dashboard page loads with summary cards showing real data from the database. Each card displays a count and a status indicator.

**Acceptance Scenarios**:

1. **Given** the Commander is authenticated, **When** the Commander navigates to the dashboard, **Then** summary cards are displayed for Faxes, Officers/Rollcall, Medical, Students, and Education departments
2. **Given** there are pending faxes in the system, **When** the dashboard loads, **Then** the Faxes card shows the count of pending faxes with a visual alert indicator
3. **Given** the daily rollcall has been submitted, **When** the Commander views the dashboard, **Then** the Officers card shows rollcall submission status and present/absent counts
4. **Given** there are medicines below minimum threshold or expired, **When** the dashboard loads, **Then** the Medical card shows a warning badge with the count
5. **Given** an Employee is authenticated with department "Officers", **When** the Employee views the dashboard, **Then** only the Officers summary card is displayed

---

### User Story 2 - Real-Time Notifications (Priority: P1)

The Commander receives real-time notifications when important events occur: a new fax is uploaded, a rollcall is submitted, or medicine stock falls below threshold. Only the Commander role is targeted for notifications. A notification bell icon in the top bar shows the unread count, and clicking it opens a slide-in panel with notification details.

**Why this priority**: Notifications are essential for the Commander to act promptly on time-sensitive events like new faxes. Without real-time alerts, the Commander must manually check for updates, reducing responsiveness.

**Independent Test**: Upload a new fax as an Employee and verify the Commander receives a notification alert in the top bar within seconds. Clicking the notification navigates to the relevant item.

**Acceptance Scenarios**:

1. **Given** a new fax is uploaded by an Employee, **When** the upload completes, **Then** a notification is created for the Commander with the fax subject and a link to the fax detail page
2. **Given** the Commander has unread notifications, **When** the Commander views any page, **Then** the notification bell shows the unread count as a badge
3. **Given** the Commander clicks the notification bell, **When** the panel opens, **Then** all notifications are listed with title, body, timestamp, and read/unread status
4. **Given** the Commander clicks on a notification, **When** the notification is selected, **Then** the notification is marked as read and the system navigates to the referenced item
5. **Given** a daily rollcall is submitted, **When** the submission completes, **Then** a notification is created for the Commander

---

### User Story 3 - Audit Log Viewing & Filtering (Priority: P2)

An Admin or Commander can view a complete log of all system operations (create, update, delete, view) with the ability to filter by user, action type, module, and date range. Each log entry shows who did what, when, and on which record.

**Why this priority**: Audit logging is critical for accountability and compliance in a military/institutional context. It enables tracking of all user actions for security and oversight purposes.

**Independent Test**: Perform several operations (create fax, edit user, delete record) and verify each appears in the audit log with correct details. Filter by module and verify only relevant entries appear.

**Acceptance Scenarios**:

1. **Given** the Admin views the Audit Log page, **When** the page loads, **Then** a paginated table of all operations is displayed with columns: user name, action, module, target, description, timestamp
2. **Given** the Admin applies filters (user, module, date range), **When** the filter is applied, **Then** only matching log entries are displayed
3. **Given** a user creates, updates, or deletes a record, **When** the operation completes, **Then** an audit log entry is automatically created with the user's name, action type, module, record ID, and timestamp
4. **Given** the Audit Log has many entries, **When** the Admin navigates pages, **Then** entries are paginated with a configurable page size

---

### User Story 4 - Quick Actions from Dashboard (Priority: P3)

From the dashboard summary cards, the Commander can click through to the relevant section (e.g., click "pending faxes" to go to the fax list filtered to pending). This provides a streamlined workflow from overview to action.

**Why this priority**: Click-through navigation enhances usability by reducing the number of steps to reach actionable items. It is a UX improvement that builds on the core dashboard.

**Independent Test**: Click on a dashboard card and verify navigation to the relevant filtered list page.

**Acceptance Scenarios**:

1. **Given** the Commander views the dashboard, **When** the Commander clicks on the pending faxes count, **Then** the system navigates to the fax list filtered to show only pending faxes
2. **Given** the Commander views the dashboard, **When** the Commander clicks on the rollcall card, **Then** the system navigates to the daily rollcall page

### Edge Cases

- What happens when the database is unavailable when loading the dashboard — the system shows a graceful error message per card rather than crashing the entire page
- How does the system handle notification delivery when the user is not connected — notifications are stored in the database and delivered when the user next loads a page or reconnects via SSE
- What happens when the SSE connection drops mid-session — client auto-reconnects with exponential backoff and shows a reconnection indicator; missed notifications are fetched on reconnect
- What happens when the audit log grows very large — pagination and filtering must remain performant via database indexing
- How does the system handle concurrent notification creation for multiple users — each user receives their own notification independently
- What does the user see when a dashboard card or notification panel has no data — a friendly Arabic empty state message is displayed (e.g., "لا توجد فاكسات معلقة"), and the card remains visible rather than hidden

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST display a Commander Dashboard with summary cards for each department (Faxes, Officers, Medical, Students, Education)
- **FR-002**: Each summary card MUST show a count of pending or actionable items for its department
- **FR-003**: System MUST provide a notification bell icon in the top navigation bar showing unread notification count
- **FR-004**: System MUST create notifications for the Commander when: a new fax is uploaded, a rollcall is submitted, or medicine stock falls below threshold. No other roles receive notifications.
- **FR-005**: System MUST display a slide-in notification panel listing all notifications with title, body, timestamp, and read/unread status
- **FR-006**: System MUST mark a notification as read when the user clicks on it
- **FR-007**: System MUST provide an Audit Log page showing a paginated table of all system operations
- **FR-008**: Audit Log entries MUST include: user name, action type (CREATE/UPDATE/DELETE/VIEW), module name, target record ID, description, and timestamp
- **FR-009**: System MUST allow filtering the Audit Log by user, action type, module, and date range
- **FR-010**: System MUST automatically create audit log entries for all create, update, and delete operations across all modules
- **FR-011**: Dashboard cards MUST be clickable and navigate to the relevant filtered list page
- **FR-012**: Notifications MUST be delivered to the target user within 3 seconds of the triggering event for connected users via Server-Sent Events (SSE)
- **FR-013**: Dashboard MUST handle database connection failures gracefully by showing an error message rather than crashing
- **FR-014**: Notification panel MUST support marking all notifications as read with a single action
- **FR-015**: Dashboard MUST restrict visibility based on user role — Commander and Admin see all department cards, Employees see only their assigned department's card
- **FR-016**: Audit Log MUST be accessible only to Admin and Commander roles
- **FR-017**: SSE notification connection MUST auto-reconnect with exponential backoff when the connection drops, and display a visible reconnection indicator to the user
- **FR-018**: All dashboard cards, notification panels, and audit log views MUST display friendly Arabic empty state messages when no data is available (e.g., "لا توجد فاكسات معلقة", "لا توجد إشعارات جديدة")
- **FR-019**: Notifications MUST NOT auto-expire or auto-delete. Users can mark individual notifications as read or use "mark all as read."

### Key Entities *(include if feature involves data)*

- **Notification**: Represents an alert sent to a specific user. Key attributes: target user (userId), type (new_fax / rollcall_submitted / medicine_expiry), title, body text, read status (isRead), reference to the source record (refId, refModel), and creation timestamp.
- **AuditLog**: Represents a recorded system operation. Key attributes: performing user (userId, userName), action type (CREATE/UPDATE/DELETE/VIEW), module name, target record ID (targetId), human-readable description, IP address, and timestamp.
- **Dashboard Summary**: Aggregated view derived from existing entities (Fax, DailyRollcall, Medicine, Course, Student) — not a separate stored entity but computed at query time from existing data.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Commander can view a complete operational overview within 5 seconds of landing on the dashboard
- **SC-002**: Notifications are delivered to the target user within 3 seconds of the triggering event
- **SC-003**: 95% of users can identify pending actions on the dashboard without training
- **SC-004**: Audit Log search results load within 2 seconds for up to 10,000 log entries
- **SC-005**: 100% of create/update/delete operations are recorded in the audit log with zero missed entries
- **SC-006**: Dashboard summary counts are accurate and match actual database records at the time of page load
- **SC-007**: Notification unread count is always in sync with actual unread notifications in the database

## Assumptions

- The system operates in an offline (no internet) environment on a local network. Real-time notification delivery is limited to users who are currently logged in and have an active browser session.
- The Commander role is the primary consumer of the dashboard, but Admin users should also have access.
- Audit logging applies to all modules (Fax, Officers, Medical, Students, Education, Users) and all operation types (CREATE, UPDATE, DELETE, VIEW).
- The dashboard aggregates data from existing models (Fax, DailyRollcall, Medicine, Course, Student) — no new persistent models are needed for dashboard data itself.
- The Notification and AuditLog Mongoose models already exist as defined in the master plan.
- Pagination for the Audit Log defaults to 20 entries per page.
- The notification panel displays the most recent 50 notifications by default, with a "Load more" option.
