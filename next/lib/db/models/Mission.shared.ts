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
