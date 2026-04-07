import { mkdir, writeFile } from "fs/promises";
import { join, extname } from "path";
import { existsSync } from "fs";

const UPLOAD_DIR = join(process.cwd(), "public", "uploads");
const ALLOWED_EXTENSIONS = [".pdf", ".png", ".jpg", ".jpeg"];
const FAX_ALLOWED_EXTENSIONS = [".pdf", ".png", ".jpg", ".jpeg"];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export interface UploadResult {
  success: boolean;
  filePath?: string;
  fileName?: string;
  error?: string;
}

export async function saveUploadedFile(
  file: File,
  subfolder?: string,
): Promise<UploadResult> {
  const ext = extname(file.name).toLowerCase();

  if (!ALLOWED_EXTENSIONS.includes(ext)) {
    return {
      success: false,
      error: `Unsupported file type: ${ext}. Allowed: ${ALLOWED_EXTENSIONS.join(", ")}`,
    };
  }

  if (file.size > MAX_FILE_SIZE) {
    return {
      success: false,
      error: `File too large. Maximum size is ${MAX_FILE_SIZE / 1024 / 1024}MB.`,
    };
  }

  const sanitizedSubfolder = subfolder?.replace(/[^a-zA-Z0-9_-]/g, "");
  const targetDir = sanitizedSubfolder
    ? join(UPLOAD_DIR, sanitizedSubfolder)
    : UPLOAD_DIR;

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

  const relativePath = `/uploads/${subfolder ? subfolder + "/" : ""}${fileName}`;

  return {
    success: true,
    filePath: relativePath,
    fileName,
  };
}

export async function saveFaxFile(file: File): Promise<UploadResult> {
  const ext = extname(file.name).toLowerCase();

  if (!FAX_ALLOWED_EXTENSIONS.includes(ext)) {
    return {
      success: false,
      error: "صيغة الملف غير مدعومة. الصيغ المدعومة: PDF، JPEG، PNG فقط",
    };
  }

  if (file.size > MAX_FILE_SIZE) {
    return {
      success: false,
      error: `حجم الملف يتجاوز الحد الأقصى (${MAX_FILE_SIZE / 1024 / 1024} ميجابايت)`,
    };
  }

  return saveUploadedFile(file, "fax");
}
