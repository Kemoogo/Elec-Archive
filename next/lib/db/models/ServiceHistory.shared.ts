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
  join: "bg-(--app-info)",
  transfer: "bg-(--app-success)",
  retirement: "bg-(--color-primary)",
  death: "bg-(--app-muted-foreground)",
  return: "bg-(--app-info)",
  termination: "bg-(--app-error)",
};
