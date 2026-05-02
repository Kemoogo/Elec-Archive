export const POSITION_TYPES = ["primary", "substitute"] as const;
export type PositionType = (typeof POSITION_TYPES)[number];

export const POSITION_STATUSES = ["active", "ended"] as const;
export type PositionStatus = (typeof POSITION_STATUSES)[number];

export const POSITION_TYPE_LABELS: Record<PositionType, string> = {
  primary: "أساسي",
  substitute: "بديل",
};

export const POSITION_STATUS_LABELS: Record<PositionStatus, string> = {
  active: "ساري",
  ended: "منتهي",
};

export const POSITION_STATUS_COLORS: Record<PositionStatus, string> = {
  active: "bg-(--app-success)/10 text-(--app-success) border-(--app-success)/20",
  ended: "bg-(--app-surface-container) text-(--app-muted-foreground) border-(--app-border)",
};
