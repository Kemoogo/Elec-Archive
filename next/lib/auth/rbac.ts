import type { AuthUser, ModulePermissions, UserRole } from "./types";

export type ModuleKey = keyof ModulePermissions;
export type AccessLevel = "view" | "edit";

export interface UserAccessPayload {
  role?: UserRole | string;
  permissions?: Partial<ModulePermissions>;
}

/**
 * Centralized Role-Based Access Control (RBAC) verification helper.
 *
 * Rules:
 * 1. Admin has automatic bypass (always returns true for any module and level).
 * 2. Commander has automatic view bypass (always returns true for "view").
 *    For "edit", Commander checks explicit module permissions.
 * 3. Employees / other roles check explicit module permissions in user.permissions:
 *    - "view" level requires either "view" or "edit" permission.
 *    - "edit" level strictly requires "edit" permission.
 */
export function hasModuleAccess(
  user: UserAccessPayload | AuthUser | null | undefined,
  module: ModuleKey,
  level: AccessLevel
): boolean {
  if (!user || !user.role) {
    return false;
  }

  // 1. Admin bypass: Full access to all modules and levels
  if (user.role === "admin") {
    return true;
  }

  // 2. Commander view bypass: Full view access to all modules
  if (user.role === "commander" && level === "view") {
    return true;
  }

  // 3. Check explicit module permission
  const userPermission = user.permissions?.[module];
  if (!userPermission || userPermission === "none") {
    return false;
  }

  if (level === "view") {
    return userPermission === "view" || userPermission === "edit";
  }

  if (level === "edit") {
    // Viewers cannot edit regardless of module permission values
    if (user.role === "viewer") {
      return false;
    }
    return userPermission === "edit";
  }

  return false;
}
