export const DEFAULT_DUTY_ROLES = [
  { key: "duty_commander", title: "قائد منوب" },
  { key: "mobile_officer", title: "ضابط خفيف الحركة" },
  { key: "unit_duty", title: "ضابط نوبتجي" },
] as const;

export type DefaultDutyRoleKey = (typeof DEFAULT_DUTY_ROLES)[number]["key"];

export const DUTY_TYPES = [
  "duty_commander",
  "mobile_officer",
  "unit_duty",
  "guard_commander",
  "camp_officer",
  "store_guard",
  "security_duty",
  "assistant_duty",
  "custom",
] as const;

export type DutyType = (typeof DUTY_TYPES)[number] | string;

export const DUTY_TYPE_LABELS: Record<string, string> = {
  duty_commander: "قائد منوب",
  mobile_officer: "ضابط خفيف الحركة",
  unit_duty: "ضابط نوبتجي",
  guard_commander: "قائد الحرس",
  camp_officer: "ضابط خفر",
  store_guard: "نوبتجي مستودعات",
  security_duty: "ضابط أمن الوحدة",
  assistant_duty: "مساعد نوبتجي",
  custom: "خدمة مخصصة",
};

export const DUTY_ROSTER_STATUSES = ["draft", "submitted", "approved"] as const;
export type DutyRosterStatus = (typeof DUTY_ROSTER_STATUSES)[number];

export const DUTY_ROSTER_STATUS_LABELS: Record<DutyRosterStatus, string> = {
  draft: "مسودة",
  submitted: "مقدم للاعتماد",
  approved: "معتمد من القائد",
};

export interface IDutySwapRecord {
  fromOfficerId: string;
  fromOfficerName?: string;
  fromOfficerRank?: string;
  fromOfficerLabel?: string;
  toOfficerId: string;
  toOfficerName?: string;
  toOfficerRank?: string;
  toOfficerLabel?: string;
  targetRole: "primary" | "yadak";
  reason: string;
  swappedAt: string | Date;
  swappedBy?: string;
  swappedByName?: string;
}

export interface IDutyRosterEntry {
  date: Date | string;
  dutyType: string;
  dutyTitle: string;
  assignedOfficerId: string;
  assignedOfficerName?: string;
  assignedOfficerRank?: string;
  assignedOfficerLabel?: string;

  // Yadak (understudy/trainee) officer
  yadakOfficerId?: string;
  yadakOfficerName?: string;
  yadakOfficerRank?: string;
  yadakOfficerLabel?: string;

  // Swap / Exchange tracking
  isSwapped?: boolean;
  originalOfficerId?: string;
  originalOfficerName?: string;
  originalOfficerRank?: string;
  originalOfficerLabel?: string;
  swapReason?: string;
  swappedAt?: string | Date;
  swappedBy?: string;
  swapHistory?: IDutySwapRecord[];

  // Legacy compatibility
  substituteOfficerId?: string;
  substituteOfficerName?: string;

  isForcedAssignment?: boolean;
  notes?: string;
  isHoliday: boolean;
}

export interface IOfficerDutyEquityStat {
  officerId: string;
  officerName: string;
  rankLabel?: string;
  totalDuties: number;
  weekendDuties?: number;
}

export interface WeekDayInfo {
  dayIndex: number; // 1 to 8 (1 = Saturday, 8 = Next Saturday)
  date: Date;
  dateString: string; // YYYY-MM-DD
  dayName: string;
  isWeekend: boolean;
  isPreviewDay?: boolean;
}
