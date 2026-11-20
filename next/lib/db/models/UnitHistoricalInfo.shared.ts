export const UNIT_MILESTONE_CATEGORIES = [
  "founding",
  "upgrade",
  "mission",
  "honor",
  "other",
] as const;

export type UnitMilestoneCategory = (typeof UNIT_MILESTONE_CATEGORIES)[number];

export const UNIT_MILESTONE_CATEGORY_LABELS: Record<UnitMilestoneCategory, string> = {
  founding: "تأسيس",
  upgrade: "تطوير وتحديث",
  mission: "مهام كبرى",
  honor: "تكريمات وإنجازات",
  other: "أخرى",
};

/**
 * Returns the Arabic display label for a unit historical milestone category.
 */
export function formatMilestoneCategoryLabel(category?: string): string {
  if (!category) return UNIT_MILESTONE_CATEGORY_LABELS.other;
  return (
    UNIT_MILESTONE_CATEGORY_LABELS[category as UnitMilestoneCategory] ??
    UNIT_MILESTONE_CATEGORY_LABELS.other
  );
}
