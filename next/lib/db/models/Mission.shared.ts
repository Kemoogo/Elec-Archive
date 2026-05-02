export const MISSION_STATUSES = [
  "scheduled",
  "active",
  "completed",
  "cancelled",
] as const;
export type MissionStatus = (typeof MISSION_STATUSES)[number];

export const MISSION_STATUS_LABELS: Record<MissionStatus, string> = {
  scheduled: "مجدولة",
  active: "نشطة",
  completed: "منتهية",
  cancelled: "ملغاة",
};

export const MISSION_STATUS_COLORS: Record<MissionStatus, string> = {
  scheduled: "bg-amber-50 text-amber-700 border-amber-100",
  active: "bg-(--app-success)/10 text-(--app-success) border-(--app-success)/20",
  completed: "bg-(--app-surface-container) text-(--app-muted-foreground) border-(--app-border)",
  cancelled: "bg-rose-50 text-rose-700 border-rose-100",
};
