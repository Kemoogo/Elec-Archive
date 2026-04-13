# Work Item 031: RBAC Navigation Visibility

## Description
Implement conditional visibility for Arkan Harb navigation links in the sidebar/navbar. Links should only be visible to users with `arkan_harb: view`, `admin`, or `commander` permissions. This ensures that unauthorized users cannot see or access the Arkan Harb module routes from the UI.

## Acceptance Criteria
- [ ] Arkan Harb (⚔️) navigation item is hidden for users with `arkan_harb` permission set to `none`, unless they are `admin` or `commander`.
- [ ] Arkan Harb (⚔️) navigation item is visible for users with `role: 'admin'`.
- [ ] Arkan Harb (⚔️) navigation item is visible for users with `role: 'commander'`.
- [ ] Arkan Harb (⚔️) navigation item is visible for users with `arkan_harb` permission set to `view` or `edit`.
- [ ] Sub-menu links follow the same visibility rules.
- [ ] The `DashboardLayout` logic correctly filters the `accessibleModules` list and enforces route access.

## Implementation Steps
1.  **Update Layout Logic**: Modify `next/app/(dashboard)/layout.tsx` to ensure the `commander` role is included in the broad access check for both `checkRouteAccess` and `accessibleModules` filtering.
2.  **Verify Navbar Component**: Check `next/components/layout/AuthenticatedNavbar.tsx` (and any related sidebar components) to ensure they only render modules present in the passed `accessibleModules` list.
3.  **Permission Schema Check**: Verify that `Role` and `PermissionLevel` constants are used consistently from `next/lib/auth/types.ts`.
4.  **Local Testing**: Manually verify visibility by logging in with users of different roles (Admin, Commander, Employee with varying permissions).

## Testing Strategy
- **Manual Validation**:
    - **Admin**: Log in and verify "Arkan Harb" is visible in the navbar.
    - **Commander**: Log in and verify "Arkan Harb" is visible in the navbar.
    - **Employee (No Access)**: Log in with `arkan_harb: 'none'` and verify "Arkan Harb" is NOT visible.
    - **Employee (View Access)**: Log in with `arkan_harb: 'view'` and verify "Arkan Harb" IS visible.
- **Direct Access Test**: Attempt to navigate directly to `/arkan-harb` as an unauthorized user and ensure the server-side redirect to `/` (or login) triggers.

## Dependencies
- `next/app/(dashboard)/layout.tsx`
- `next/components/layout/AuthenticatedNavbar.tsx`
- `next/lib/auth/types.ts`

## Decisions & Trade-offs
- **Granting Commander Access**: Commanders are treated as high-level supervisors who should see all operational modules (including Arkan Harb) by default, similar to Admins, but potentially with read-only intent (though the UI visibility is the same).
- **SSR Enforcement**: Access checks will be performed in the Server Component (`DashboardLayout`) to prevent layout shifting and ensure secure gating before the page even reaches the client.
- **Universal Commander Access**: Decided to let `commander` role bypass the module-specific permission check for visibility and route access, similar to `admin`. This ensures they have a bird's-eye view of all operations as per military hierarchy requirements.
- **Unified Navigation Logic**: Maintained the logic within `DashboardLayout` to keep `AuthenticatedNavbar` clean and focused only on rendering what it's given.

## Completion Reminder
- Update `docs/aide/progress.md` (📋 → 🚧 → ✅) when the item is completed.

## Testing Prerequisites (CRITICAL)

**Required Services**
- MongoDB 7 (Docker: `docker-compose up -d mongo`, Port: 27017)

**Environment Configuration**
- `JWT_SECRET` must be set in `.env` for authentication.
- `NEXT_PUBLIC_APP_URL` should be defined.

**Manual Validation Checklist**
- [ ] Build succeeds: `npm run build`
- [ ] Tests pass: No lint errors in modified files.
- [ ] **Services started**: `docker-compose up -d mongo`
- [ ] **Application runs**: `npm run dev`
- [ ] **Feature verified**: Sidebar/Navbar elements appear/disappear based on the logged-in user's role and permissions.
- [ ] **Data verified**: Checked user object in `DashboardLayout` via logging if necessary.

**Expected Outcomes**
- The "Arkan Harb" module is securely gated in the UI.
- Only authorized users see the navigation entry.
- Unauthorized users are redirected if they attempt direct URL access.

## Validation Documentation Template

```markdown
## Validation Results
- [ ] Service started: MongoDB
- [ ] Application started successfully
- [ ] Database users checked: Admin, Commander, restricted Employee
- [ ] Navigation visibility confirmed for all test cases
- [ ] Unauthorized direct access blocked by redirect
- [ ] Screenshots captured: Navbar states for different users
```
