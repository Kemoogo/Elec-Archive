export const LEAVE_CATEGORIES = ["leave", "absence"] as const;
export type LeaveCategory = (typeof LEAVE_CATEGORIES)[number];

export const LEAVE_TYPES = [
  "field",           // ميدانية
  "weekly_rest",     // راحة أسبوعية
  "daily_sleep",     // مبيت يومي
  "medical",         // مرضية
  "annual",          // سنوية
  "permission",      // إذن
  "casual",          // عارضة
] as const;
export type LeaveType = (typeof LEAVE_TYPES)[number];

export const LEAVE_STATUSES = [
  "pending_commander", // في انتظار تصديق القائد
  "approved",          // مصدق عليها / معتمدة
  "rejected",          // لم يتصدق
  "other_orders",      // أوامر أخرى
  "interrupted",       // مقطوعة (تسجيل عودة مبكرة)
  "closed",            // مكتملة / مؤكدة العودة
  "extension_pending", // في انتظار تصديق الامتداد
] as const;
export type LeaveStatus = (typeof LEAVE_STATUSES)[number];

export const LEAVE_TYPE_LABELS: Record<LeaveType, string> = {
  field: "ميدانية",
  weekly_rest: "راحة أسبوعية",
  daily_sleep: "مبيت يومي",
  medical: "مرضية",
  annual: "سنوية",
  permission: "إذن",
  casual: "عارضة",
};

export const LEAVE_STATUS_LABELS: Record<LeaveStatus, string> = {
  pending_commander: "في انتظار تصديق القائد",
  approved: "مصدق عليها",
  rejected: "لم يتصدق",
  other_orders: "أوامر أخرى",
  interrupted: "مقطوعة (عودة مبكرة)",
  closed: "مؤكدة العودة",
  extension_pending: "طلب امتداد معلق",
};

/** Default durations in days per leave type for smart defaulting */
export const LEAVE_TYPE_DEFAULT_DAYS: Record<LeaveType, number> = {
  field: 6,
  weekly_rest: 2,
  daily_sleep: 1,
  medical: 3,
  annual: 7,
  permission: 1,
  casual: 2,
};
