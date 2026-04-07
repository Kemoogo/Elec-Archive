# Data Model: Auth & User Management

## Entities

### User

The core entity representing a system user with credentials and access rights.

**Collection**: `users`

| Field | Type | Required | Constraints | Description |
|-------|------|----------|-------------|-------------|
| `_id` | ObjectId | Auto | Primary key | MongoDB auto-generated ID |
| `username` | String | Yes | Unique, 3-50 chars, alphanumeric + underscore | Login identifier |
| `password` | String | Yes | bcrypt hashed, min 6 chars before hash | One-way hashed credential |
| `fullName` | String | Yes | 2-100 chars | Display name (Arabic) |
| `role` | String | Yes | Enum: `admin`, `commander`, `employee`, `viewer` | System role |
| `department` | String | Yes | Enum: `fax`, `officers`, `medical`, `students`, `education` | Assigned department |
| `permissions` | Object | Yes | See sub-schema below | Per-module access rights |
| `isActive` | Boolean | Yes | Default: `true` | Account active status |
| `isLocked` | Boolean | Yes | Default: `false` | Locked due to failed login attempts |
| `failedLoginAttempts` | Number | Yes | Default: `0`, max: 5 | Consecutive failed login counter |
| `createdAt` | Date | Auto | - | Record creation timestamp |
| `updatedAt` | Date | Auto | - | Last modification timestamp |

#### Permissions Sub-Schema

| Field | Type | Required | Constraints | Description |
|-------|------|----------|-------------|-------------|
| `fax` | String | Yes | Enum: `none`, `view`, `edit` | Fax module access |
| `officers` | String | Yes | Enum: `none`, `view`, `edit` | Officers module access |
| `medical` | String | Yes | Enum: `none`, `view`, `edit` | Medical module access |
| `students` | String | Yes | Enum: `none`, `view`, `edit` | Students module access |
| `education` | String | Yes | Enum: `none`, `view`, `edit` | Education module access |

#### Indexes

- `{ username: 1 }` — Unique index for login lookup
- `{ role: 1, isActive: 1 }` — For admin user listing and admin count queries

#### State Transitions

```
[New] → isActive=true, isLocked=false
  ↓ (failed login ≥ threshold)
isActive=true, isLocked=true
  ↓ (admin unlocks)
isActive=true, isLocked=false
  ↓ (admin deactivates)
isActive=false, isLocked=false
```

#### Validation Rules

- Username: unique across all users, 3-50 characters, alphanumeric and underscore only
- Password (on create/update): minimum 6 characters before hashing
- fullName: minimum 2 characters, supports Arabic characters
- Role: must be one of the four defined roles
- Department: must be one of the five defined departments
- Permissions: each module must have `none`, `view`, or `edit`
- Admin self-deactivation: blocked if this is the only active admin

---

### AuditLog

Records all system actions for security and compliance tracking.

**Collection**: `auditlogs`

| Field | Type | Required | Constraints | Description |
|-------|------|----------|-------------|-------------|
| `_id` | ObjectId | Auto | Primary key | MongoDB auto-generated ID |
| `userId` | ObjectId | Yes | References User._id | Who performed the action |
| `userName` | String | Yes | - | Username at time of action (denormalized) |
| `action` | String | Yes | Enum: `CREATE`, `UPDATE`, `DELETE`, `VIEW`, `LOGIN`, `LOGIN_FAILED`, `LOGOUT`, `LOCK`, `UNLOCK` | Action type |
| `module` | String | Yes | - | Module affected (e.g., `auth`, `users`) |
| `targetId` | ObjectId | No | - | ID of affected record |
| `description` | String | Yes | - | Human-readable description |
| `ipAddress` | String | No | - | Client IP address |
| `createdAt` | Date | Auto | - | When the action occurred |

#### Indexes

- `{ createdAt: -1 }` — For chronological listing
- `{ userId: 1, createdAt: -1 }` — For per-user audit trail
- `{ module: 1, createdAt: -1 }` — For per-module filtering

#### Auth-Related Audit Events

| Action | When | Description |
|--------|------|-------------|
| `LOGIN` | Successful login | "User {username} logged in" |
| `LOGIN_FAILED` | Failed login attempt | "Failed login attempt for username {username}" |
| `LOGOUT` | User logs out | "User {username} logged out" |
| `CREATE` | Admin creates user | "Admin created user {username} with role {role}" |
| `UPDATE` | Admin edits user | "Admin updated user {username}: {changes}" |
| `DELETE` | Admin deactivates user | "Admin deactivated user {username}" |
| `LOCK` | Account locked | "Account {username} locked after {n} failed attempts" |
| `UNLOCK` | Admin unlocks account | "Admin unlocked account {username}" |

---

## Relationships

- **User → AuditLog**: One-to-many. A user performs many actions; each audit log entry references one user.
- **Session** (not persisted): The session is stateless (JWT in cookie). The JWT payload contains `{ userId, role, iat, exp }`. No database collection is needed.

## Default Data

A seed script must create the initial admin account:

| Field | Value |
|-------|-------|
| username | `admin` |
| password | Hashed default password (must be changed on first login) |
| fullName | `مدير النظام` |
| role | `admin` |
| department | `fax` (arbitrary, admin has full access) |
| permissions | All modules set to `edit` |
| isActive | `true` |
