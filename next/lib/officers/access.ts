import type { AuthUser } from "@/lib/auth/types";

export function canViewOfficers(user: AuthUser): boolean {
  return user.role === "admin" || user.permissions.officers !== "none";
}

export function canEditOfficers(user: AuthUser): boolean {
  return user.role === "admin" || user.permissions.officers === "edit";
}

export function canViewCommanderRollcall(user: AuthUser): boolean {
  return user.role === "admin" || user.role === "commander";
}

export function isCommander(user: AuthUser): boolean {
  return user.role === "commander" || user.role === "admin";
}
