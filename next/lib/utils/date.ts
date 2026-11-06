/**
 * Date utility functions for Elec-Archive.
 */

export * from "./date-display";
export * from "./date-format";

/**
 * Calculates the inclusive number of days between two dates.
 * Does NOT mask negative differences with Math.max(1, diffDays).
 * Returns 0 if either date is missing/invalid, or if endDate is before startDate.
 */
export function calculateDiffDays(
  startDateInput?: string | Date | null,
  endDateInput?: string | Date | null
): number {
  if (!startDateInput || !endDateInput) return 0;

  const s = typeof startDateInput === "string" ? new Date(startDateInput) : startDateInput;
  const e = typeof endDateInput === "string" ? new Date(endDateInput) : endDateInput;

  if (isNaN(s.getTime()) || isNaN(e.getTime())) return 0;
  if (e.getTime() < s.getTime()) return 0;

  const diffMs = e.getTime() - s.getTime();
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24)) + 1;
  return diffDays > 0 ? diffDays : 0;
}

/**
 * Alias for calculateDiffDays for total leave/mission days calculation.
 */
export function calculateTotalDays(
  startDateStr?: string,
  endDateStr?: string
): number {
  return calculateDiffDays(startDateStr, endDateStr);
}
