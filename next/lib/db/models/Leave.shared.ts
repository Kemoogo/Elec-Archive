export const LEAVE_CATEGORIES = ["leave", "absence"] as const;
export type LeaveCategory = (typeof LEAVE_CATEGORIES)[number];

export const LEAVE_TYPES = [
  "annual",
  "sick",
  "emergency",
  "rest",
  "overnight",
  "field",
  "casual",
] as const;
export type LeaveType = (typeof LEAVE_TYPES)[number];

export const LEAVE_STATUSES = ["draft", "approved", "closed", "cancelled"] as const;
export type LeaveStatus = (typeof LEAVE_STATUSES)[number];

export const LEAVE_TYPE_LABELS: Record<LeaveType, string> = {
  annual: "سنوية",
  sick: "مرضية",
  emergency: "طارئة",
  rest: "راحة",
  overnight: "مبيت",
  field: "ميدانية",
  casual: "عارضة",
};

export const LEAVE_STATUS_LABELS: Record<LeaveStatus, string> = {
  draft: "مسودة",
  approved: "معتمدة",
  closed: "منتهية",
  cancelled: "ملغاة",
};
