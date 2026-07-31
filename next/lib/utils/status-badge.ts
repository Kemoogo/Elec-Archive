/**
 * Shared status badge utilities for Arkan-Harb module.
 * Consolidates duplicated getStatusBadgeClass / getStatusLabel functions.
 */

// ─── Mission statuses ───

export type MissionStatusType = "scheduled" | "active" | "completed" | "cancelled";

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
      return "bg-(--app-info)/20 text-(--app-foreground)";
    case "active":
      return "bg-(--app-success)/10 text-(--app-success)";
    case "completed":
    case "ended":
      return "bg-(--app-surface-container) text-(--app-foreground)";
    case "cancelled":
      return "bg-(--app-error)/20 text-(--app-error)";
    default:
      return "bg-(--app-surface-container) text-(--app-foreground)";
  }
}
