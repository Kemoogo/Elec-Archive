import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Extract a user-facing error message from an API response.
 *
 * Prefers Zod validation details (`data.details`) over a generic
 * `data.error` string. Falls back to `fallback` if nothing is available.
 *
 * @example
 *   const errorMsg = extractApiError(data, "فشل حفظ البيانات");
 *   showToast(errorMsg, "error");
 */
export function extractApiError(
  data: { details?: Array<{ message: string }>; error?: string } | null | undefined,
  fallback: string = "حدث خطأ غير متوقع",
): string {
  if (!data) return fallback;
  if (data.details?.length) {
    return data.details.map((d) => d.message).join("، ");
  }
  return data.error || fallback;
}
