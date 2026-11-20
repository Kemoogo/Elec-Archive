import type { AuthUser } from "@/lib/auth/types";
import { hasModuleAccess, type UserAccessPayload } from "@/lib/auth/rbac";
import type { HistoricalRecordCapabilities } from "@/types/historical-record";

type AccessSubject = AuthUser | UserAccessPayload | null | undefined;

/**
 * Checks whether the user can view the Historical Record module and its data.
 * Automatic access for Admin and Commander; explicit "view" or "edit" for others.
 */
export function canViewHistoricalRecord(user: AccessSubject): boolean {
  return hasModuleAccess(user, "historical_record", "view");
}

/**
 * Checks whether the user can add new entries to the Historical Record
 * (and perform inline atomic closure of the previous current commander on POST).
 * Automatic access for Admin and Commander; explicit "edit" for employees.
 */
export function canAddHistoricalRecord(user: AccessSubject): boolean {
  return hasModuleAccess(user, "historical_record", "edit");
}

/**
 * Strict Historical Data Governance check (FR-003):
 * Editing or deleting any saved Historical Record entry (or Unit Profile)
 * is exclusively restricted to the Admin role.
 */
export function canMutateOrDeleteHistoricalRecord(user: AccessSubject): boolean {
  return Boolean(user && user.role === "admin");
}

/**
 * Serializes user capabilities for SSR page props.
 */
export function getHistoricalRecordCapabilities(
  user: AccessSubject,
): HistoricalRecordCapabilities {
  return {
    canView: canViewHistoricalRecord(user),
    canAdd: canAddHistoricalRecord(user),
    isAdmin: canMutateOrDeleteHistoricalRecord(user),
  };
}
