import { parseSafeLocalDate } from "@/lib/utils/date-display";

function formatYears(years: number): string {
  if (years === 1) return "سنة واحدة";
  if (years === 2) return "سنتان";
  if (years >= 3 && years <= 10) return `${years} سنوات`;
  return `${years} سنة`;
}

function formatMonths(months: number): string {
  if (months === 1) return "شهر واحد";
  if (months === 2) return "شهران";
  if (months >= 3 && months <= 10) return `${months} أشهر`;
  return `${months} شهراً`;
}

function formatDays(days: number): string {
  if (days === 1) return "يوم واحد";
  if (days === 2) return "يومان";
  if (days >= 3 && days <= 10) return `${days} أيام`;
  return `${days} يوماً`;
}

/**
 * Computes human-readable Arabic leadership tenure duration between startDate and endDate
 * (or today's date when `isCurrent` is true).
 * Same-day terms (`startDate === endDate`) consistently display as "يوم واحد".
 */
export function calculateCommandDuration(
  startDateInput: Date | string,
  endDateInput?: Date | string | null,
  isCurrent = false,
): string {
  const start = parseSafeLocalDate(startDateInput);
  if (!start) return "";

  const rawEnd = isCurrent || !endDateInput ? new Date() : parseSafeLocalDate(endDateInput);
  if (!rawEnd) return "";

  const startY = start.getFullYear();
  const startM = start.getMonth();
  const startD = start.getDate();

  const endY = rawEnd.getFullYear();
  const endM = rawEnd.getMonth();
  const endD = rawEnd.getDate();

  const startCompare = new Date(startY, startM, startD);
  const endCompare = new Date(endY, endM, endD);

  if (endCompare.getTime() < startCompare.getTime()) {
    return "—";
  }

  if (endCompare.getTime() === startCompare.getTime()) {
    return "يوم واحد";
  }

  let years = endY - startY;
  let months = endM - startM;
  let days = endD - startD;

  if (days < 0) {
    const prevMonthDays = new Date(endY, endM, 0).getDate();
    days += prevMonthDays;
    months -= 1;
  }

  if (months < 0) {
    months += 12;
    years -= 1;
  }

  const parts: string[] = [];
  if (years > 0) parts.push(formatYears(years));
  if (months > 0) parts.push(formatMonths(months));
  if (days > 0) parts.push(formatDays(days));

  return parts.length > 0 ? parts.join(" و ") : "يوم واحد";
}
