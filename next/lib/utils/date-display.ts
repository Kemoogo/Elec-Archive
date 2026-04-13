import { formatDateEgForDisplay } from './date-format';

/**
 * Formats a date for display in Egyptian locale (dd/mm/yyyy)
 * @param date - Date string (ISO format) or Date object
 * @returns Formatted date string in dd/mm/yyyy format or empty string if invalid
 */
export function formatDateDisplay(date: string | Date | null | undefined): string {
  if (!date) return '';
  try {
    return formatDateEgForDisplay(date);
  } catch {
    // If formatting fails, return empty string or original value as fallback
    return typeof date === 'string' ? date : '';
  }
}