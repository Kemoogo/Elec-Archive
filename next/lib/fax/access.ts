import type { AuthUser } from "@/lib/auth/types";
import type { IFax } from "@/lib/db/models/Fax";

export function canViewFax(user: AuthUser): boolean {
  return user.permissions.fax === "view" || user.permissions.fax === "edit";
}

export function canEditFax(user: AuthUser): boolean {
  return user.permissions.fax === "edit";
}

export function canMakeDecision(user: AuthUser): boolean {
  return user.role === "commander" || user.role === "admin";
}

export function canCloseFax(user: AuthUser, fax: IFax): boolean {
  if (user.role === "admin" || user.role === "commander") {
    return true;
  }

  if (fax.status !== "forwarded") {
    return false;
  }

  if (fax.forwardedToType === "user") {
    return fax.forwardedToId?.toString() === user.id;
  }

  if (fax.forwardedToType === "department") {
    return (
      fax.forwardedToDepartment === user.department &&
      user.permissions.fax === "edit"
    );
  }

  return false;
}

export function canModifyFax(user: AuthUser, fax: IFax): boolean {
  if (fax.status === "closed") {
    return false;
  }

  return user.permissions.fax === "edit";
}

export function canLinkFax(user: AuthUser): boolean {
  return user.permissions.fax === "edit";
}
