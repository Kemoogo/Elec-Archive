# Tasks: Auth & User Management

**Input**: Design documents from `/specs/002-auth-user-mgmt/`
**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/

**Tests**: Not explicitly requested in the feature specification. Test tasks omitted.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- Source code: `next/` directory (Next.js App Router)
- Models: `next/lib/db/models/`
- Auth utilities: `next/lib/auth/`
- API routes: `next/app/api/`
- Pages: `next/app/`
- Validation: `next/validations/`
- Components: `next/components/`

---

## Phase 1: Setup

**Purpose**: Project initialization and environment configuration

- [X] T001 Create `.env.local` with MONGODB_URI and JWT_SECRET variables in `next/.env.local`
- [X] T002 [P] Configure ESLint and Prettier for the Next.js project in `next/eslint.config.mjs` and `next/.prettierrc`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [X] T003 Create Mongoose connection helper in `next/lib/db/connect.ts`
- [X] T004 Create User Mongoose model with bcrypt password hashing, permissions sub-schema (fax, officers, medical, students, education), indexes, and isActive/isLocked/failedLoginAttempts fields in `next/lib/db/models/User.ts`
- [X] T005 Create AuditLog Mongoose model with action enum, indexes, and auth-related event types in `next/lib/db/models/AuditLog.ts`
- [X] T006 [P] Create JWT sign/verify/extract-from-cookie helper functions in `next/lib/auth/jwt.ts`
- [X] T007 [P] Create auth TypeScript types (AuthUser, PermissionLevel, UserRole, etc.) in `next/lib/auth/types.ts`
- [X] T008 Create auth middleware that verifies JWT from HttpOnly cookie, checks isActive/isLocked, and attaches user to request context in `next/lib/auth/middleware.ts`
- [X] T009 Create audit logging utility that writes to AuditLog collection with userId, userName, action, module, description, ipAddress in `next/lib/auth/audit.ts`
- [X] T010 Create Zod validation schemas for login, createUser, and updateUser in `next/validations/auth.ts`

**Checkpoint**: Foundation ready — user story implementation can now begin

---

## Phase 3: User Story 2 - User Login and Logout (Priority: P1)

**Goal**: Users can authenticate with username/password, receive a session cookie, and log out. Unauthenticated users are blocked from protected pages.

**Independent Test**: Attempt login with valid credentials (success), invalid credentials (failure with generic error), log out and verify access denied, try accessing protected page while unauthenticated.

### Implementation for User Story 2

- [X] T011 [US2] Implement login API route — POST /api/auth/login with Zod validation, bcrypt comparison, account lock check, JWT cookie issuance, and audit logging in `next/app/api/auth/login/route.ts`
- [X] T012 [US2] Implement logout API route — POST /api/auth/logout that clears the token cookie and logs the logout event in `next/app/api/auth/logout/route.ts`
- [X] T013 [US2] Implement current user API route — GET /api/auth/me that returns the authenticated user's profile from the JWT in `next/app/api/auth/me/route.ts`
- [X] T014 [US2] Create auth route group layout — lightweight wrapper for login page (no auth guard; dashboard layout handles RBAC). Redirect authenticated users away from /login to the dashboard in `next/app/(auth)/layout.tsx`
- [X] T015 [US2] Create login page (Arabic RTL, dark theme) using Stitch MCP workflow in `next/app/(auth)/login/page.tsx`
- [X] T016 [US2] Create login client component with username/password form, error display, and redirect on success in `next/components/auth/login-form.tsx`

**Checkpoint**: User can log in, log out, and is blocked from protected pages when unauthenticated

---

## Phase 4: User Story 1 - Admin Creates New User Account (Priority: P1)

**Goal**: Admin can create new user accounts with username, password, full name, role, department, and per-module permissions. Duplicate usernames are rejected.

**Independent Test**: Log in as admin, create a user with specific role/permissions, verify the user appears in the list. Attempt to create a user with a duplicate username and verify rejection.

### Implementation for User Story 1

- [X] T017 [US1] Implement user list API route — GET /api/auth/users with optional filters (role, department, isActive) and admin-only RBAC in `next/app/api/auth/users/route.ts`
- [X] T018 [US1] Implement user create API route — POST /api/auth/users with Zod validation, duplicate username check, bcrypt hashing, admin-only RBAC, and audit logging in `next/app/api/auth/users/route.ts`
- [X] T019 [US1] Implement user detail API route — GET /api/auth/users/[id] returns user profile, and DELETE soft-deactivates the user (isActive=false) with admin-only RBAC, session invalidation, and last-admin guard in `next/app/api/auth/users/[id]/route.ts`
- [X] T020 [US1] Create dashboard layout with RTL sidebar, role-based navigation, and session-aware header in `next/app/(dashboard)/layout.tsx`
- [X] T021 [US1] Create user management page (Arabic RTL, table with role badges, add/edit modal) using Stitch MCP workflow in `next/app/(dashboard)/admin/users/page.tsx`
- [X] T022 [US1] Create user management client component with user list table, create user modal form, and department/permission dropdowns in `next/components/admin/user-management.tsx`

**Checkpoint**: Admin can create user accounts that appear in the system and can be used for login

---

## Phase 5: User Story 3 - Admin Edits User Permissions (Priority: P2)

**Goal**: Admin can select an existing user and modify their role, department, or per-module permissions. Changes take effect on the user's next action.

**Independent Test**: Change a user from viewer to employee with edit permissions on a module, log in as that user, and verify new permissions are active.

### Implementation for User Story 3

- [X] T023 [US3] Implement user update API route — PATCH /api/auth/users/[id] handles role, department, permissions, fullName, and account lock/unlock updates with Zod validation, admin-only RBAC, and audit logging in `next/app/api/auth/users/[id]/route.ts`
- [X] T024 [US3] Create edit user modal component with pre-populated form fields, permission toggles, and save/cancel actions in `next/components/admin/edit-user-modal.tsx`
- [X] T025 [US3] Update RBAC middleware to re-read user permissions from database on each request (not cached from JWT) to reflect permission changes immediately in `next/lib/auth/middleware.ts`

**Checkpoint**: Admin can edit user permissions and changes take effect immediately on the user's next action

---

## Phase 6: User Story 4 - Admin Deactivates a User (Priority: P2)

**Goal**: Admin can deactivate a user account. The user can no longer log in and existing sessions are immediately invalidated. Self-deactivation is blocked if the admin is the only active admin.

**Independent Test**: Deactivate a user, attempt login (denied), verify active session is invalidated. Attempt self-deactivation as sole admin (blocked).

### Implementation for User Story 4

- [X] T026 [US4] Verify user deactivation flow in DELETE handler — ensure isActive=false is set, active sessions are invalidated, and self-deactivation is blocked if sole admin in `next/app/api/auth/users/[id]/route.ts` (covered by T019)
- [X] T027 [US4] Add account lockout logic to login API route — increment failedLoginAttempts on wrong password, lock account at threshold (5), return 423 when locked in `next/app/api/auth/login/route.ts`
- [X] T028 [US4] Verify admin unlock behavior in PATCH handler — ensure isLocked=false resets failedLoginAttempts and logs the unlock event in `next/app/api/auth/users/[id]/route.ts` (covered by T023)
- [X] T029 [US4] Update auth middleware to check isActive and isLocked on every request, reject deactivated/locked users immediately in `next/lib/auth/middleware.ts`
- [X] T030 [US4] Add deactivate button and unlock button to user management component in `next/components/admin/user-management.tsx`

**Checkpoint**: Admin can deactivate users (with last-admin guard), lockout works, admin can unlock accounts

---

## Phase 7: User Story 5 - Role-Based Dashboard Access (Priority: P3)

**Goal**: Each role sees a different landing page after login. The system enforces that users cannot access pages or actions outside their role's permissions.

**Independent Test**: Log in as each role type and verify the correct dashboard is displayed and unauthorized pages are blocked.

### Implementation for User Story 5

- [X] T031 [US5] Create dashboard home page with role-based redirect logic — admin→/admin/users, commander→dashboard overview, employee→assigned module, viewer→read-only summary in `next/app/(dashboard)/page.tsx`
- [X] T032 [US5] Create system unavailable error page displayed when database is unreachable in `next/app/(dashboard)/unavailable/page.tsx`
- [X] T033 [US5] Add per-route RBAC checks to dashboard layout that verify role and module permissions before rendering child pages in `next/app/(dashboard)/layout.tsx`

**Checkpoint**: Each role sees appropriate dashboard; unauthorized access is blocked across all protected routes

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [X] T034 Create seed script that generates the initial admin account (username: admin, fullName: مدير النظام) in `next/scripts/seed-admin.ts`
- [X] T035 Add localStorage form data preservation on session expiry — save form state before redirect, restore after re-authentication in `next/components/auth/form-persistence.ts`
- [X] T036 [P] Add rate limiting configuration (5 attempts threshold) to login route in `next/app/api/auth/login/route.ts`
- [X] T037 Run `npm run build` and fix all errors and warnings in `next/`
- [X] T038 Run quickstart.md validation (Performance check) — manually verify login speed (<10s) and user creation speed (<3m). Record results in a feature-closure comment, verify login, user CRUD, RBAC, lockout, audit log, and build pass.


---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion — BLOCKS all user stories
- **User Stories (Phase 3–7)**: All depend on Foundational phase completion
  - US2 (Login) should be implemented FIRST since all other stories require authenticated users
  - US1 (Create User) can proceed after US2 since login is needed to test user creation
  - US3 (Edit Permissions) depends on US1 (users must exist to edit)
  - US4 (Deactivate) depends on US1 (users must exist to deactivate)
  - US5 (RBAC Dashboard) depends on US2 (login) and is enhanced by US1/US3/US4
- **Polish (Phase 8)**: Depends on all desired user stories being complete

### User Story Dependencies

- **User Story 2 (Login, P1)**: Can start after Foundational — no story dependencies
- **User Story 1 (Create User, P1)**: Can start after US2 — needs login to test admin creating users
- **User Story 3 (Edit Permissions, P2)**: Can start after US1 — needs existing users to edit
- **User Story 4 (Deactivate, P2)**: Can start after US1 — needs existing users to deactivate
- **User Story 5 (RBAC Dashboard, P3)**: Can start after US2 — enhanced by US1/US3/US4

### Within Each User Story

- Models and utilities (Foundational) before API routes
- API routes before UI pages
- Core implementation before integration components

### Parallel Opportunities

- T006 and T007 can run in parallel (different files in `next/lib/auth/`)
- T014 and T015 can run in parallel (layout vs page, different files)
- T024 and T025 can run in parallel (component vs middleware, different files)
- T034, T035, T036 can run in parallel (different files)

---

## Parallel Example: Foundational Phase

```bash
# Launch JWT helpers and types together:
Task: "Create JWT sign/verify/extract-from-cookie helper in next/lib/auth/jwt.ts"
Task: "Create auth TypeScript types in next/lib/auth/types.ts"

# Launch models together:
Task: "Create User model in next/lib/db/models/user.ts"
Task: "Create AuditLog model in next/lib/db/models/audit-log.ts"
```

---

## Implementation Strategy

### MVP First (User Story 2 + User Story 1)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL — blocks all stories)
3. Complete Phase 3: User Story 2 (Login/Logout)
4. Complete Phase 4: User Story 1 (Admin Creates Users)
5. **STOP and VALIDATE**: Admin can log in and create users — the system is usable
6. Deploy/demo if ready

### Incremental Delivery

1. Setup + Foundational → Foundation ready
2. Add US2 (Login) → Test independently
3. Add US1 (Create User) → Test independently → **MVP!**
4. Add US3 (Edit Permissions) → Test independently
5. Add US4 (Deactivate/Lockout) → Test independently
6. Add US5 (RBAC Dashboard) → Test independently
7. Polish → Build validation → Ready for production

### Parallel Team Strategy

With multiple developers:

1. Team completes Setup + Foundational together
2. Once Foundational is done:
   - Developer A: User Story 2 (Login) — all other stories depend on this
   - Developer B: User Story 1 (Create User) — can start once US2 is done
3. Once US1 and US2 are done:
   - Developer A: User Story 3 (Edit Permissions)
   - Developer B: User Story 4 (Deactivate)
   - Developer C: User Story 5 (RBAC Dashboard)
4. Polish together

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- Avoid: vague tasks, same file conflicts, cross-story dependencies that break independence
- Stop at any checkpoint to validate story independently

---

## Tech Debt Tasks (Generated by /speckit.cleanup)

**Generated**: 2026-04-04
**Source**: Post-implementation cleanup across all specs
**Priority**: Address before next feature iteration

### Detected Issues

- [x] TD001 Replace `forwardRef<any, ...>` in `components/admin/user-management.tsx:26` with proper ref type
- [x] TD002 Replace `useRef<any>(null)` in `app/(dashboard)/admin/users/page.tsx:11` with proper ref type
- [x] TD003 Replace `Record<string, any>` filter in `app/api/auth/users/route.ts:30` with properly typed filter interface
