import { AuthUser, ModulePermissions, PermissionLevel } from "./types";

/**
 * Checks if a user has view or edit access to a specific module.
 * Admin always has full access.
 */
export function canViewModule(user: AuthUser, module: keyof ModulePermissions): boolean {
  if (user.role === "admin") return true;
  return user.permissions[module] === "view" || user.permissions[module] === "edit";
}

/**
 * Checks if a user has edit access to a specific module.
 * Admin always has full access.
 */
export function canEditModule(user: AuthUser, module: keyof ModulePermissions): boolean {
  if (user.role === "admin") return true;
  return user.permissions[module] === "edit";
}

/**
 * Checks if a user meets a required permission level for a module.
 * "none" requirement is always met. Admin always meets any requirement.
 */
export function requireModuleAccess(
  user: AuthUser,
  module: keyof ModulePermissions,
  requiredLevel: PermissionLevel
): boolean {
  if (user.role === "admin" || requiredLevel === "none") return true;
  
  const userLevel = user.permissions[module];
  if (requiredLevel === "edit") {
    return userLevel === "edit";
  }
  if (requiredLevel === "view") {
    return userLevel === "view" || userLevel === "edit";
  }
  
  return false;
}
