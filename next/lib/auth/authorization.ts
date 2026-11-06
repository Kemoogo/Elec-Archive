import { AuthUser, ModulePermissions, PermissionLevel } from "./types";
import { hasModuleAccess } from "./rbac";

/**
 * Checks if a user has view or edit access to a specific module.
 * Admin always has full access. Commander has view access.
 */
export function canViewModule(user: AuthUser, module: keyof ModulePermissions): boolean {
  return hasModuleAccess(user, module, "view");
}

/**
 * Checks if a user has edit access to a specific module.
 * Admin always has full access.
 */
export function canEditModule(user: AuthUser, module: keyof ModulePermissions): boolean {
  return hasModuleAccess(user, module, "edit");
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
  if (requiredLevel === "none") return true;
  return hasModuleAccess(user, module, requiredLevel);
}
