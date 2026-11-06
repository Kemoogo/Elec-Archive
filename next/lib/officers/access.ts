import type { AuthUser } from "@/lib/auth/types";
import { hasModuleAccess } from "@/lib/auth/rbac";

export function canViewOfficers(user: AuthUser): boolean {
  return hasModuleAccess(user, "officers", "view") || hasModuleAccess(user, "arkan_harb", "view");
}

export function canEditOfficers(user: AuthUser): boolean {
  return hasModuleAccess(user, "officers", "edit") || hasModuleAccess(user, "arkan_harb", "edit");
}

export function canViewCommanderRollcall(user: AuthUser): boolean {
  return user.role === "admin" || user.role === "commander";
}

export function isCommander(user: AuthUser): boolean {
  return user.role === "commander" || user.role === "admin";
}
