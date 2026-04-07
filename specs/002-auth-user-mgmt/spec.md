# Feature Specification: Auth & User Management

**Feature Branch**: `[002-auth-user-mgmt]`  
**Created**: 2026-03-23  
**Status**: Draft  
**Input**: User description: "read @master-plan.md and create a specification for phase 1 Auth & User Management only."

## User Scenarios & Testing

### User Story 1 - Admin Creates New User Account (Priority: P1)

An admin logs into the system and navigates to the user management panel. They fill in a new user's details (username, full name, password, role, department) and set per-module permissions (fax, officers, medical, students, education) for each module. The system creates the account and logs the action.

**Why this priority**: Without the ability to create user accounts, no one else can access the system. This is the foundational capability for all other features.

**Independent Test**: Can be fully tested by logging in as admin, creating a new user with specific role and permissions, and verifying the user appears in the list with correct details.

**Acceptance Scenarios**:

1. **Given** admin is logged in, **When** admin fills in all required fields and submits the new user form, **Then** the user account is created and appears in the user list
2. **Given** admin creates a user with "employee" role and "view" permission on fax module, **When** the new user logs in, **Then** they can only view fax data and cannot edit
3. **Given** admin tries to create a user with a duplicate username, **When** the form is submitted, **Then** the system rejects the submission with a clear error message

---

### User Story 2 - User Login and Logout (Priority: P1)

A registered user enters their username and password on the login page. The system validates credentials and grants access according to their role and permissions. The user can log out, which invalidates their session.

**Why this priority**: Login is the primary entry point for all users. Without it, no one can use the system at all.

**Independent Test**: Can be fully tested by attempting login with valid credentials (success) and invalid credentials (failure), then logging out and verifying access is denied.

**Acceptance Scenarios**:

1. **Given** a user account exists with username "ahmed" and a valid password, **When** "ahmed" enters correct credentials, **Then** the system grants access and redirects to the appropriate dashboard
2. **Given** a user enters incorrect credentials, **When** the login form is submitted, **Then** the system displays a generic error message without revealing whether the username or password was wrong
3. **Given** a user is logged in, **When** they click the logout button, **Then** their session is terminated and they are redirected to the login page
4. **Given** a logged-out user tries to access a protected page, **When** the system checks their session, **Then** they are redirected to the login page

---

### User Story 3 - Admin Edits User Permissions (Priority: P2)

An admin selects an existing user from the management panel and modifies their role, department, or per-module permissions. The changes take effect immediately for the affected user's next action.

**Why this priority**: Permission changes are essential for operational flexibility, but the system can function with initial permission assignment alone.

**Independent Test**: Can be tested by changing a user from "viewer" to "employee" with edit permissions on a specific module, logging in as that user, and verifying the new permissions are active.

**Acceptance Scenarios**:

1. **Given** admin selects a viewer user, **When** admin changes their role to "employee" and grants "edit" permission on the officers module, **Then** the user can now edit officer records
2. **Given** admin changes a user's department, **When** the user performs their next action, **Then** access is evaluated against the updated department assignment

---

### User Story 4 - Admin Deactivates a User (Priority: P2)

An admin marks a user account as inactive. The deactivated user can no longer log in, and any active sessions for that user are terminated.

**Why this priority**: Deactivation is important for security when personnel leave, but is not needed on day one of operations.

**Independent Test**: Can be tested by deactivating a user, attempting login with that user's credentials, and verifying access is denied.

**Acceptance Scenarios**:

1. **Given** admin deactivates an active user, **When** that user attempts to log in, **Then** the system denies access with an appropriate message
2. **Given** a deactivated user has an active session, **When** the deactivation is applied, **Then** the system immediately invalidates their session and any subsequent request is rejected

---

### User Story 5 - Role-Based Dashboard Access (Priority: P3)

Each role sees a different landing experience: the admin sees the user management panel, the commander sees a department overview, the employee sees their assigned module, and the viewer sees a read-only summary. The system enforces that users cannot access pages or actions outside their role's permissions.

**Why this priority**: Role-based views improve workflow efficiency but the core authentication and authorization work without them.

**Independent Test**: Can be tested by logging in as each role type and verifying the correct dashboard is displayed and unauthorized pages are blocked.

**Acceptance Scenarios**:

1. **Given** a commander logs in, **When** the dashboard loads, **Then** the commander sees a summary of all department activity
2. **Given** an employee with fax "view" permission only, **When** they attempt to access the fax upload page, **Then** the system denies access
3. **Given** a viewer, **When** they attempt any create/edit/delete action, **Then** the system denies the action

---

### Edge Cases

- Admin self-deactivation is blocked if they are the only active admin in the system
- When a user's session expires during form entry, the system redirects to login and attempts to preserve unsaved form data for recovery after re-authentication
- System displays a "system unavailable" error page and blocks all access when the database is unreachable

## Requirements

### Functional Requirements

- **FR-001**: System MUST provide a login page where users enter username and password to gain access
- **FR-002**: System MUST reject login attempts with incorrect credentials and display a generic error message (not revealing which field was wrong)
- **FR-003**: System MUST implement rate limiting on login attempts to prevent brute-force attacks, locking the account after a configurable number of failed attempts; locked accounts can only be unlocked by an admin
- **FR-004**: System MUST restrict user account creation exclusively to admin users; no self-registration is allowed
- **FR-005**: Admin MUST be able to create new user accounts with fields: username, fullName, password, role, and department
- **FR-006**: Admin MUST be able to assign per-module permissions (none, view, edit) to each user for the following modules: fax, officers, medical, students, education
- **FR-007**: Admin MUST be able to view a list of all users with their roles, departments, and active status
- **FR-008**: Admin MUST be able to edit an existing user's role, department, and permissions
- **FR-009**: Admin MUST be able to deactivate a user account, preventing that user from logging in
- **FR-010**: System MUST enforce role-based access control, checking permissions on every protected page and API operation. Unauthorized users MUST be redirected to an "Access Denied" page (UI) or receive a 403 Forbidden status code (API).
- **FR-011**: System MUST define four roles: admin (full access + user management), commander (department overview + actions), employee (per-module access based on assignments), viewer (read-only across assigned modules)
- **FR-012**: System MUST log all authentication and user management events (login success, login failure, logout, account creation, account update, account deactivation, permission changes, account lock, account unlock) to the audit log with user name and timestamp
- **FR-013**: System MUST persist user sessions securely so that unauthorized parties cannot forge or steal session tokens
- **FR-014**: System MUST require password entry during user creation and editing; password storage MUST be one-way hashed
- **FR-015**: System MUST enforce a minimum password length of 6 characters with no complexity requirements
- **FR-016**: System MUST prevent an admin from deactivating their own account if they are the only active admin in the system
- **FR-017**: Admin MUST be able to unlock a locked user account from the user management panel
- **FR-018**: System MUST display a "system unavailable" error page and block all access when the database is unreachable
- **FR-019**: System MUST preserve unsaved form data in local storage for ALL system modules (fax, officers, medical, etc.) when a session expires, and restore it automatically after the user re-authenticates.
- **FR-020**: System MUST redirect unauthenticated users to the login page when they attempt to access any protected resource
- **FR-021**: System MUST validate all user input (username format, required fields, unique username constraint) before persisting data

### Key Entities

- **User**: Represents a system user with credentials and access rights. Key attributes: username, fullName, hashed password, role (admin/commander/employee/viewer), department, per-module permissions (none/view/edit for fax, officers, medical, students, education), active status, creation timestamp
- **AuditLog**: Represents a record of system actions. Key attributes: user who performed the action, action type, module affected, description, timestamp. Used to track all authentication and user management events
- **Session**: Conceptual only (not persisted). Implemented as a stateless JWT token stored in an HttpOnly cookie. The JWT payload contains `{ userId, role, iat, exp }`. Governed by cookie expiration (defaults to 8 hours). See data-model.md for details.

## Success Criteria

### Measurable Outcomes

- **SC-001**: An admin can create a new user account with all required fields and permissions in under 3 minutes
- **SC-002**: Users can log in and reach their appropriate dashboard in under 10 seconds after entering valid credentials
- **SC-003**: 100% of unauthorized access attempts (wrong role, wrong permissions, unauthenticated) are blocked with appropriate feedback
- **SC-004**: Brute-force login attempts are automatically blocked after 5 consecutive failures within 5 minutes
- **SC-005**: Every user management action (create, edit, deactivate, permission change) is recorded in the audit log within 1 second of the action
- **SC-006**: Permission changes take effect immediately on the user's next action without requiring a system restart

## Clarifications

### Session 2026-03-23

- Q: What password policy should the system enforce? → A: Minimum 6 characters, no complexity requirements
- Q: What happens when an admin deactivates their own account? → A: Allow self-deactivation only if at least one other active admin exists
- Q: How are locked accounts unlocked after brute-force detection? → A: Admin must manually unlock the account
- Q: When should a deactivated user's existing session be invalidated? → A: Immediately invalidate all active sessions upon deactivation
- Q: How should the system behave when the database is unreachable during authentication? → A: Show a "system unavailable" error page and block all access until DB recovers

### Session 2026-03-23 (continued)

- Q: What happens when a user's session expires while filling out a form? → A: Redirect to login and preserve unsaved form data in local storage for recovery

## Assumptions

- The system runs completely offline on a local network with 10-30 users
- An initial admin account will be created via a seeding process during system setup (not through the UI)
- Departments correspond to the system modules: fax, officers, medical, students, education
- Session duration defaults to 8 hours to match a typical workday
- Arabic (RTL) is the primary language for all user-facing text
