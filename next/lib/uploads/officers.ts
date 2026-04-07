import { mkdir, writeFile } from "fs/promises";
import { join, extname } from "path";
import { existsSync } from "fs";

const UPLOAD_DIR = join(process.cwd(), "public", "uploads");
const OFFICERS_ALLOWED_EXTENSIONS = [".pdf"];
const OFFICERS_MAX_FILE_SIZE = 5 * 1024 * 1024; // 5,242,880 bytes
const OFFICERS_MAX_DOCUMENTS = 20;

export interface OfficersUploadResult {
  success: boolean;
  filePath?: string;
  fileName?: string;
  error?: string;
}

export const OFFICERS_MAX_FILE_SIZE_BYTES = OFFICERS_MAX_FILE_SIZE;
export const OFFICERS_MAX_DOCUMENTS_COUNT = OFFICERS_MAX_DOCUMENTS;

export async function saveOfficerFile(file: File): Promise<OfficersUploadResult> {
  const ext = extname(file.name).toLowerCase();

  if (!OFFICERS_ALLOWED_EXTENSIONS.includes(ext)) {
    return {
      success: false,
      error: "يُسمح فقط بملفات PDF للضباط",
    };
  }

  if (file.size > OFFICERS_MAX_FILE_SIZE) {
    return {
      success: false,
      error: `حجم الملف يتجاوز الحد الأقصى (${OFFICERS_MAX_FILE_SIZE / 1024 / 1024} ميجابايت)`,
    };
  }

  const targetDir = join(UPLOAD_DIR, "officers");

  if (!existsSync(targetDir)) {
    await mkdir(targetDir, { recursive: true });
  }

  const timestamp = Date.now();
  const safeName = file.name.replace(/[^a-zA-Z0-9.\u0600-\u06FF_-]/g, "_");
  const fileName = `${timestamp}_${safeName}`;
  const filePath = join(targetDir, fileName);

  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);
  await writeFile(filePath, buffer);

  const relativePath = `/uploads/officers/${fileName}`;

  return {
    success: true,
    filePath: relativePath,
    fileName,
  };
}
