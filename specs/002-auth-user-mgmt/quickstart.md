# Quickstart: Auth & User Management

## Prerequisites

- Node.js 18+ installed
- Docker and Docker Compose installed
- MongoDB running via `docker-compose up -d mongo`

## Setup

1. **Install dependencies**:
   ```bash
   cd next && npm install
   ```

2. **Set environment variables** in `.env.local`:
   ```
   MONGODB_URI=mongodb://localhost:27017/elec-archive
   JWT_SECRET=your-secret-key-here
   ```

3. **Run the seed script** to create the initial admin:
   ```bash
   npx ts-node scripts/seed-admin.ts
   ```
   Default admin credentials:
   - Username: `admin`
   - Password: `admin123` (must be changed after first login)

4. **Start the dev server**:
   ```bash
   npm run dev
   ```

## Verify Login Flow

1. Navigate to `http://localhost:3000/login`
2. Enter admin credentials
3. Verify redirect to dashboard
4. Check that HttpOnly cookie `token` is set (visible in DevTools > Application > Cookies, but not accessible via JS)

## Verify User Management

1. Log in as admin
2. Navigate to `/admin/users`
3. Create a new user:
   - Username: `testuser`
   - Password: `test123`
   - Full Name: `مستخدم تجريبي`
   - Role: `employee`
   - Department: `fax`
   - Permissions: `fax: view`, others: `none`
4. Verify the user appears in the list
5. Log out and log in as `testuser`
6. Verify restricted access (can view fax, cannot edit)

## Verify RBAC

1. Log in as the `testuser` employee
2. Try to access `/admin/users` → should be denied (403 or redirect)
3. Try to access an unauthorized module → should be denied
4. Log in as admin → verify full access

## Verify Rate Limiting

1. Attempt 5 failed logins with wrong password
2. Verify account is locked
3. Log in as admin
4. Unlock the account from user management
5. Verify the user can log in again

## Verify Audit Log

1. Perform login, user creation, user edit, user deactivation
2. Check that each action appears in the audit log with:
   - Correct user name
   - Correct action type
   - Timestamp
   - Description

## Build Validation

```bash
npm run build
```

Must pass with zero errors and zero warnings.
