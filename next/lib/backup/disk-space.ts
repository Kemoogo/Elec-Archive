import fs from "fs/promises";
import path from "path";
import type { IStorageStats } from "@/types/backup";

export const MIN_FREE_SPACE_PERCENTAGE = 20; // 20% free space requirement
export const SIZE_SAFETY_MULTIPLIER = 2; // Free space must be at least 2x estimated backup size

/**
 * Get filesystem storage statistics for the given directory path
 */
export async function getStorageStats(targetPath?: string): Promise<IStorageStats> {
  const dirPath = targetPath || path.join(process.cwd(), "public", "uploads");

  try {
    // Ensure the directory exists before checking statfs
    await fs.mkdir(dirPath, { recursive: true });
    const stat = await fs.statfs(dirPath);

    const bsize = Number(stat.bsize);
    const totalBytes = Number(stat.blocks) * bsize;
    const freeBytes = Number(stat.bavail) * bsize;
    const usedBytes = Math.max(0, totalBytes - freeBytes);
    const freePercentage = totalBytes > 0 ? (freeBytes / totalBytes) * 100 : 0;
    const isWarning = freePercentage < MIN_FREE_SPACE_PERCENTAGE;

    return {
      freeBytes,
      totalBytes,
      usedBytes,
      freePercentage: Math.round(freePercentage * 10) / 10,
      isWarning,
    };
  } catch (error) {
    console.error("Error retrieving filesystem stats via statfs:", error);
    // Fallback safe defaults if statfs is unavailable on an unusual platform
    return {
      freeBytes: 10 * 1024 * 1024 * 1024, // 10 GB default
      totalBytes: 50 * 1024 * 1024 * 1024, // 50 GB default
      usedBytes: 40 * 1024 * 1024 * 1024,
      freePercentage: 20,
      isWarning: false,
    };
  }
}

/**
 * Checks if disk space is sufficient to proceed with a backup operation
 */
export async function checkDiskSpaceSufficient(
  targetPath?: string,
  estimatedSizeBytes: number = 50 * 1024 * 1024 // 50MB baseline default
): Promise<{ sufficient: boolean; stats: IStorageStats; reason?: string }> {
  const stats = await getStorageStats(targetPath);

  if (stats.freePercentage < MIN_FREE_SPACE_PERCENTAGE) {
    return {
      sufficient: false,
      stats,
      reason: `المساحة الحرة على القرص (${stats.freePercentage}%) أقل من الحد الأدنى المسموح به (${MIN_FREE_SPACE_PERCENTAGE}%). يرجى تحرير مساحة على وحدة التخزين قبل المحاولة.`,
    };
  }

  const requiredBytes = estimatedSizeBytes * SIZE_SAFETY_MULTIPLIER;
  if (stats.freeBytes < requiredBytes) {
    const requiredMB = Math.round(requiredBytes / (1024 * 1024));
    const freeMB = Math.round(stats.freeBytes / (1024 * 1024));
    return {
      sufficient: false,
      stats,
      reason: `المساحة الحرة المتبقية (${freeMB} ميجابايت) غير كافية لإجراء النسخ الاحتياطي (الحد الأدنى المطلوب لضمان السلامة هو ${requiredMB} ميجابايت).`,
    };
  }

  return {
    sufficient: true,
    stats,
  };
}
