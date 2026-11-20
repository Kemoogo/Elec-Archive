import { copyFile, mkdir, unlink, writeFile } from "fs/promises";
import { existsSync } from "fs";
import { extname, resolve, sep } from "path";
import crypto from "crypto";
import { verifyMagicBytes } from "@/lib/uploads";
import {
  HISTORICAL_IMAGE_MAX_BYTES,
  HISTORICAL_MAX_PHOTOS_PER_ITEM,
} from "@/types/historical-record";

export type HistoricalUploadFolder = "visits" | "commanders" | "unit" | "milestones";

const PUBLIC_ROOT = resolve(process.cwd(), "public");
const HISTORICAL_UPLOAD_ROOT = resolve(PUBLIC_ROOT, "uploads", "historical-record");
const OFFICERS_UPLOAD_ROOT = resolve(PUBLIC_ROOT, "uploads", "officers");
const ALLOWED_IMAGE_EXTENSIONS = [".jpg", ".jpeg", ".png", ".webp"] as const;
const ALLOWED_IMAGE_MIMES = new Set(["image/jpeg", "image/jpg", "image/png", "image/webp"]);

export interface HistoricalUploadResult {
  success: boolean;
  filePath?: string;
  error?: string;
}

export interface HistoricalBatchUploadResult {
  success: boolean;
  filePaths: string[];
  error?: string;
}

function getTargetDirectory(folder: HistoricalUploadFolder): string {
  return resolve(HISTORICAL_UPLOAD_ROOT, folder);
}

/**
 * Validates extension, MIME type, size (<= 10MB), magic bytes, and writes an image
 * inside `public/uploads/historical-record/<folder>/`.
 */
export async function saveHistoricalImage(
  file: File,
  folder: HistoricalUploadFolder,
): Promise<HistoricalUploadResult> {
  const ext = extname(file.name || "").toLowerCase();

  if (!ALLOWED_IMAGE_EXTENSIONS.includes(ext as (typeof ALLOWED_IMAGE_EXTENSIONS)[number])) {
    return {
      success: false,
      error: "صيغة الصورة غير مدعومة. الصيغ المسموحة: JPG، PNG، WebP فقط",
    };
  }

  if (file.type && !ALLOWED_IMAGE_MIMES.has(file.type.toLowerCase())) {
    return {
      success: false,
      error: "نوع ملف الصورة غير مسموح به (JPG، PNG، WebP فقط)",
    };
  }

  if (file.size <= 0) {
    return {
      success: false,
      error: "ملف الصورة فارغ",
    };
  }

  if (file.size > HISTORICAL_IMAGE_MAX_BYTES) {
    return {
      success: false,
      error: "حجم الصورة يتجاوز الحد الأقصى المسموح به (10 ميجابايت)",
    };
  }

  const targetDir = getTargetDirectory(folder);
  if (!targetDir.startsWith(HISTORICAL_UPLOAD_ROOT + sep)) {
    return {
      success: false,
      error: "مجلد التخزين غير صالح",
    };
  }

  if (!existsSync(targetDir)) {
    await mkdir(targetDir, { recursive: true });
  }

  const uniquePart = crypto.randomUUID();
  const fileName = `${Date.now()}_${uniquePart}${ext}`;
  const fullPath = resolve(targetDir, fileName);

  if (!fullPath.startsWith(targetDir + sep)) {
    return {
      success: false,
      error: "مسار حفظ الصورة غير صالح",
    };
  }

  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  if (!verifyMagicBytes(buffer, ext)) {
    return {
      success: false,
      error: "محتوى الصورة لا يتطابق مع امتدادها الفعلي (JPG / PNG / WebP)",
    };
  }

  await writeFile(fullPath, buffer);

  return {
    success: true,
    filePath: `/uploads/historical-record/${folder}/${fileName}`,
  };
}

/**
 * Validates and saves a batch of uploaded images, enforcing the max photos per record limit
 * and cleaning up newly saved files if any file in the batch fails validation.
 */
export async function saveHistoricalImagesBatch(
  files: File[],
  folder: HistoricalUploadFolder,
  existingCount = 0,
): Promise<HistoricalBatchUploadResult> {
  if (existingCount + files.length > HISTORICAL_MAX_PHOTOS_PER_ITEM) {
    return {
      success: false,
      filePaths: [],
      error: `الحد الأقصى للصور المرفقة هو ${HISTORICAL_MAX_PHOTOS_PER_ITEM} صور للسجل الواحد`,
    };
  }

  const savedPaths: string[] = [];

  for (const file of files) {
    const result = await saveHistoricalImage(file, folder);
    if (!result.success || !result.filePath) {
      await unlinkHistoricalFiles(savedPaths);
      return {
        success: false,
        filePaths: [],
        error: result.error ?? "فشل حفظ إحدى الصور المرفقة",
      };
    }
    savedPaths.push(result.filePath);
  }

  return {
    success: true,
    filePaths: savedPaths,
  };
}

/**
 * Physically copies an officer's existing photo under `/uploads/officers/...`
 * into the isolated `public/uploads/historical-record/commanders/` directory so
 * future updates or deletions in `/officers` never break the Historical Record.
 */
export async function copyOfficerPhotoToHistorical(
  officerPhotoUrl?: string | null,
  militaryId?: string,
): Promise<string | undefined> {
  if (!officerPhotoUrl || typeof officerPhotoUrl !== "string") {
    return undefined;
  }

  const normalizedUrl = officerPhotoUrl.trim();
  if (!normalizedUrl.startsWith("/uploads/officers/")) {
    return undefined;
  }

  const relativeFromPublic = normalizedUrl.replace(/^\/+/, "");
  const sourcePath = resolve(PUBLIC_ROOT, relativeFromPublic);

  if (!sourcePath.startsWith(OFFICERS_UPLOAD_ROOT + sep) || !existsSync(sourcePath)) {
    return undefined;
  }

  const ext = extname(sourcePath).toLowerCase();
  if (!ALLOWED_IMAGE_EXTENSIONS.includes(ext as (typeof ALLOWED_IMAGE_EXTENSIONS)[number])) {
    return undefined;
  }

  const targetDir = getTargetDirectory("commanders");
  if (!existsSync(targetDir)) {
    await mkdir(targetDir, { recursive: true });
  }

  const safeMilitary = (militaryId || "officer").replace(/[^a-zA-Z0-9_-]/g, "_");
  const fileName = `${Date.now()}_${safeMilitary}_${crypto.randomUUID().slice(0, 8)}${ext}`;
  const destPath = resolve(targetDir, fileName);

  if (!destPath.startsWith(targetDir + sep)) {
    return undefined;
  }

  await copyFile(sourcePath, destPath);
  return `/uploads/historical-record/commanders/${fileName}`;
}

/**
 * Safely deletes local files strictly within `public/uploads/historical-record/`.
 * Never touches `/uploads/officers/` or any path outside the historical record root.
 */
export async function unlinkHistoricalFiles(
  paths: Array<string | undefined | null>,
): Promise<void> {
  for (const rawPath of paths) {
    if (!rawPath || typeof rawPath !== "string") continue;
    const trimmed = rawPath.trim();
    if (!trimmed.startsWith("/uploads/historical-record/")) continue;

    const relative = trimmed.replace(/^\/+/, "");
    const resolvedPath = resolve(PUBLIC_ROOT, relative);
    if (!resolvedPath.startsWith(HISTORICAL_UPLOAD_ROOT + sep)) continue;

    try {
      await unlink(resolvedPath);
    } catch {
      // Ignore ENOENT or already-removed files during cleanup
    }
  }
}
