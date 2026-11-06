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
  "rest",            // بدل راحة
] as const;
export type LeaveType = (typeof LEAVE_TYPES)[number];

/** أنظمة الإجازات المعتمدة للضباط (أنظمة الخدمة) */
export const OFFICER_LEAVE_SYSTEMS = [
  "field",           // ميدانية
  "daily_sleep",     // مبيت يومي
  "weekly_rest",     // راحة أسبوعية
] as const;
export type OfficerLeaveSystem = (typeof OFFICER_LEAVE_SYSTEMS)[number];

/** أنواع طلبات الإجازات المتاحة للتقديم */
export const LEAVE_REQUEST_TYPES = [
  "field",           // ميدانية
  "weekly_rest",     // راحة أسبوعية
  "casual",          // عارضة
  "annual",          // سنوية
  "permission",      // إذن
  "medical",         // مرضية (تتطلب شيت مرضي وتعتمد بدون تصديق القائد)
  "rest",            // بدل راحة (تتطلب تصديق القائد)
] as const;
export type LeaveRequestType = (typeof LEAVE_REQUEST_TYPES)[number];

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
  rest: "بدل راحة",
};

export const OFFICER_LEAVE_SYSTEM_LABELS: Record<OfficerLeaveSystem, string> = {
  field: "ميدانية",
  daily_sleep: "مبيت يومي",
  weekly_rest: "راحة أسبوعية",
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
  field: 7,
  weekly_rest: 2,
  daily_sleep: 1,
  medical: 3,
  annual: 7,
  permission: 1,
  casual: 2,
  rest: 1,
};
