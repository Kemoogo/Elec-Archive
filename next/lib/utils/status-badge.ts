/**
 * Shared status badge utilities for Arkan-Harb module.
 * Consolidates duplicated getStatusBadgeClass / getStatusLabel functions.
 */

// ─── Mission statuses ───

export type MissionStatusType = "scheduled" | "active" | "completed" | "cancelled" | "postponed";

export function getMissionStatusLabel(status: string): string {
  switch (status) {
    case "scheduled":
      return "مجدولة";
    case "active":
      return "نشطة";
    case "completed":
      return "مكتملة";
    case "cancelled":
      return "ملغاة";
    case "postponed":
      return "مؤجلة";
    default:
      return status;
  }
}

// ─── Position statuses ───

export type PositionStatusType = "active" | "ended";

export function getPositionStatusLabel(status: string): string {
  switch (status) {
    case "active":
      return "ساري";
    case "ended":
      return "منتهي";
    default:
      return status;
  }
}

// ─── Unified badge class mapper ───

/**
 * Returns Tailwind classes for a status badge.
 * Handles all statuses used across Missions & Positions modules.
 */
export function getStatusBadgeClass(status: string): string {
  switch (status) {
    case "scheduled":
      return "bg-(--app-info)/10 text-(--app-info) border border-(--app-info)/20";
    case "active":
      return "bg-(--color-primary)/10 text-(--color-primary) border border-(--color-primary)/20";
    case "completed":
    case "ended":
      return "bg-(--app-surface-container) text-(--app-muted-foreground) border border-(--app-border)";
    case "cancelled":
      return "bg-(--app-surface-container) text-(--app-muted-foreground) border border-(--app-border)";
    case "postponed":
      return "bg-(--app-surface-container) text-(--app-muted-foreground) border border-(--app-border)";
    default:
      return "bg-(--app-surface-container) text-(--app-muted-foreground) border border-(--app-border)";
  }
}
