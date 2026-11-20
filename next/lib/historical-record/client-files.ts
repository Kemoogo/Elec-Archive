import { HISTORICAL_IMAGE_MAX_BYTES } from "@/types/historical-record";

export const HISTORICAL_ALLOWED_IMAGE_EXTENSIONS = [
  ".jpg",
  ".jpeg",
  ".png",
  ".webp",
] as const;

/**
 * Validates an uploaded historical image file's extension and max size (10 MB)
 * on the client before attaching it to form state.
 * Returns an Arabic error message or `null` when valid.
 */
export function validateHistoricalImageFile(
  file: File,
  subjectLabel = "الصورة",
): string | null {
  const lower = file.name.toLowerCase();
  const hasValidExtension = HISTORICAL_ALLOWED_IMAGE_EXTENSIONS.some((ext) =>
    lower.endsWith(ext),
  );
  if (!hasValidExtension) {
    return `الصيغ المسموحة لـ${subjectLabel}: JPG، PNG، WebP فقط`;
  }
  if (file.size > HISTORICAL_IMAGE_MAX_BYTES) {
    return `حجم ${subjectLabel} يتجاوز الحد الأقصى المسموح (10 ميجابايت)`;
  }
  return null;
}
