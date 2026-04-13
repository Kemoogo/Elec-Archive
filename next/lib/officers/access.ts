import type { AuthUser } from "@/lib/auth/types";

import { canViewModule, canEditModule } from "@/lib/auth/authorization";

export function canViewOfficers(user: AuthUser): boolean {
  return canViewModule(user, "officers") || canViewModule(user, "arkan_harb");
}

export function canEditOfficers(user: AuthUser): boolean {
  return canEditModule(user, "officers") || canEditModule(user, "arkan_harb");
}

export function canViewCommanderRollcall(user: AuthUser): boolean {
  return user.role === "admin" || user.role === "commander";
}

export function isCommander(user: AuthUser): boolean {
  return user.role === "commander" || user.role === "admin";
}
