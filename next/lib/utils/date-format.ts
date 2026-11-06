import { parse, format } from 'date-fns';
import { arEG } from 'date-fns/locale';
import { formatDateDisplay } from './date-display';

/**
 * Formats a date for display in RTL layout with ASCII numbers and slashes
 * @param date - Date string or Date object
 * @returns Formatted date string
 */
export function formatDateEgForDisplay(date: string | Date): string {
  return formatDateDisplay(date);
}

/**
 * Formats a date to YYYY-MM-DD format for date input value
 * @param date - Date string or Date object
 * @returns Formatted date string in YYYY-MM-DD format
 */
export function formatDateEgForInput(date: string | Date): string {
  if (typeof date === 'string') {
    // If it's already in YYYY-MM-DD format, return as is
    if (/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return date;
    }
    try {
      // Otherwise, parse it and format to YYYY-MM-DD
      const parsed = parse(date, 'dd/MM/yyyy', new Date(), { locale: arEG });
      return format(parsed, 'yyyy-MM-dd');
    } catch {
      // If parsing fails, return today's date as fallback
      return format(new Date(), 'yyyy-MM-dd');
    }
  }
  return format(date, 'yyyy-MM-dd');
}

/**
 * Parses a date from Egyptian locale (dd/mm/yyyy) to ISO format
 * @param dateStr - Date string in dd/mm/yyyy format
 * @returns ISO date string (yyyy-MM-dd)
 */
export function parseDateEg(dateStr: string): string {
  const parsed = parse(dateStr, 'dd/MM/yyyy', new Date(), { locale: arEG });
  return format(parsed, 'yyyy-MM-dd');
}