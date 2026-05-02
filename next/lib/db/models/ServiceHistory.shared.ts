export const MOVEMENT_TYPES = ["join", "transfer", "retirement", "death", "return", "termination"] as const;
export type MovementType = (typeof MOVEMENT_TYPES)[number];

export const MOVEMENT_LABELS: Record<MovementType, string> = {
  join: "انضمام للوحدة",
  transfer: "نقل من الوحدة",
  retirement: "تقاعد / إنهاء خدمة",
  death: "وفاة",
  return: "عودة للخدمة",
  termination: "رفد / إنهاء خدمة",
};

export const MOVEMENT_COLORS: Record<MovementType, string> = {
  join: "bg-blue-500",
  transfer: "bg-emerald-500",
  retirement: "bg-orange-500",
  death: "bg-slate-800",
  return: "bg-cyan-500",
  termination: "bg-rose-500",
};
