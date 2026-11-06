/**
 * Format recruitment stage code (e.g. "20241" -> "مرحلة 2024/1")
 */
export function formatMrhlaName(mrhla: string): string {
  if (!mrhla) return "";
  const trimmed = mrhla.trim();
  if (trimmed.length >= 5) {
    const year = trimmed.substring(0, 4);
    const round = trimmed.substring(4);
    return `مرحلة ${year}/${round}`;
  }
  return `مرحلة ${trimmed}`;
}
