export const MISSION_TYPES = ["internal_daily", "external_multiday"] as const;
export type MissionType = (typeof MISSION_TYPES)[number];

export const MISSION_TYPE_LABELS: Record<MissionType, string> = {
  internal_daily: "مأمورية يومية داخلية",
  external_multiday: "مأمورية خارجية متعددة الأيام",
};

export const MISSION_STATUSES = [
  "scheduled",
  "active",
  "completed",
  "cancelled",
  "postponed",
] as const;
export type MissionStatus = (typeof MISSION_STATUSES)[number];

export const MISSION_STATUS_LABELS: Record<MissionStatus, string> = {
  scheduled: "مجدولة",
  active: "نشطة",
  completed: "منتهية",
  cancelled: "ملغاة",
  postponed: "مؤجلة",
};

export const MISSION_STATUS_COLORS: Record<MissionStatus, string> = {
  scheduled: "bg-(--app-warning)/10 text-(--app-warning) border-(--app-warning)/20",
  active: "bg-(--app-success)/10 text-(--app-success) border-(--app-success)/20",
  completed: "bg-(--app-surface-container) text-(--app-muted-foreground) border-(--app-border)",
  cancelled: "bg-(--app-error)/10 text-(--app-error) border-(--app-error)/20",
  postponed: "bg-purple-500/10 text-purple-600 border-purple-500/20 dark:bg-purple-500/20 dark:text-purple-400 dark:border-purple-500/30",
};
