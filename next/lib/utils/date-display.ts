export const ARABIC_DAY_NAMES = [
  "الأحد",
  "الإثنين",
  "الثلاثاء",
  "الأربعاء",
  "الخميس",
  "الجمعة",
  "السبت",
] as const;

/**
 * Safely parses a Date object, number timestamp, or string (YYYY-MM-DD, YYYY/MM/DD, DD/MM/YYYY, or ISO)
 * to a local midday Date to avoid timezone shifts or DST issues.
 */
export function parseSafeLocalDate(date: string | number | Date | null | undefined): Date | null {
  if (!date && date !== 0) return null;
  if (date instanceof Date) {
    return isNaN(date.getTime()) ? null : date;
  }
  if (typeof date === "number") {
    const d = new Date(date);
    return isNaN(d.getTime()) ? null : d;
  }
  if (typeof date === "string") {
    const cleanStr = date.trim().replace(/\u200F/g, "");
    if (!cleanStr) return null;
    const isoDatePart = cleanStr.split("T")[0];

    // Check YYYY-MM-DD or YYYY/MM/DD
    const ymMatch = isoDatePart.match(/^(\d{4})[/-](\d{1,2})[/-](\d{1,2})$/);
    if (ymMatch) {
      const year = Number(ymMatch[1]);
      const month = Number(ymMatch[2]) - 1;
      const day = Number(ymMatch[3]);
      if (!isNaN(year) && !isNaN(month) && !isNaN(day)) {
        return new Date(year, month, day, 12, 0, 0);
      }
    }

    // Check DD/MM/YYYY or DD-MM-YYYY
    const dmMatch = isoDatePart.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
    if (dmMatch) {
      const day = Number(dmMatch[1]);
      const month = Number(dmMatch[2]) - 1;
      const year = Number(dmMatch[3]);
      if (!isNaN(year) && !isNaN(month) && !isNaN(day)) {
        return new Date(year, month, day, 12, 0, 0);
      }
    }

    const d = new Date(cleanStr);
    return isNaN(d.getTime()) ? null : d;
  }
  return null;
}

/**
 * Checks if a given date corresponds to tomorrow in local time.
 */
export function isTomorrow(date: string | number | Date | null | undefined): boolean {
  const d = parseSafeLocalDate(date);
  if (!d) return false;
  const now = new Date();
  const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  return (
    d.getFullYear() === tomorrow.getFullYear() &&
    d.getMonth() === tomorrow.getMonth() &&
    d.getDate() === tomorrow.getDate()
  );
}

/**
 * Gets Arabic day name for a given date (e.g. 'الأحد', 'الإثنين').
 * If the date is tomorrow, prefixes with 'باكر ' (e.g. 'باكر الخميس').
 */
export function getDayName(date: string | number | Date | null | undefined, prefixTomorrow = true): string {
  const d = parseSafeLocalDate(date);
  if (!d) return "";
  const name = ARABIC_DAY_NAMES[d.getDay()] || "";
  if (prefixTomorrow && isTomorrow(d)) {
    return `باكر ${name}`;
  }
  return name;
}

/**
 * Formats a date for display in RTL layout (Day on right, Month in middle, Year on left)
 * with English numbers (ASCII) and slash separators.
 * @param date - Date string, timestamp number, or Date object
 * @returns Formatted date string or empty string if invalid
 */
export function formatDateDisplay(date: string | number | Date | null | undefined): string {
  if (!date && date !== 0) return '';
  const d = parseSafeLocalDate(date);
  if (!d) return typeof date === 'string' ? date : '';
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `\u200F${day}\u200F/\u200F${month}\u200F/\u200F${year}`;
}

/**
 * Formats a date with its Arabic day name (e.g. 'الأحد 07/09/2026')
 */
export function formatDateWithDay(date: string | number | Date | null | undefined): string {
  if (!date && date !== 0) return '';
  const dayName = getDayName(date);
  const formattedDate = formatDateDisplay(date);
  if (!dayName || !formattedDate) return formattedDate;
  return `${dayName} ${formattedDate}`;
}