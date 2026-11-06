import { mkdir, writeFile } from "fs/promises";
import { resolve, sep, extname } from "path";
import { existsSync } from "fs";

const UPLOAD_DIR = resolve(process.cwd(), "public", "uploads");
const ALLOWED_EXTENSIONS = [".pdf", ".png", ".jpg", ".jpeg", ".webp"];
const FAX_ALLOWED_EXTENSIONS = [".pdf", ".png", ".jpg", ".jpeg", ".webp"];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export function verifyMagicBytes(buffer: Buffer, ext: string): boolean {
  if (ext === ".pdf") return buffer.subarray(0, 5).toString("ascii") === "%PDF-";
  if (ext === ".png") return buffer.subarray(0, 4).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47]));
  if (ext === ".jpg" || ext === ".jpeg") return buffer.subarray(0, 3).equals(Buffer.from([0xff, 0xd8, 0xff]));
  if (ext === ".webp") {
    return (
      buffer.subarray(0, 4).toString("ascii") === "RIFF" &&
      buffer.subarray(8, 12).toString("ascii") === "WEBP"
    );
  }
  return false;
}

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
    ? resolve(UPLOAD_DIR, sanitizedSubfolder)
    : UPLOAD_DIR;

  if (!existsSync(targetDir)) {
    await mkdir(targetDir, { recursive: true });
  }

  const timestamp = Date.now();
  const safeName = file.name.replace(/[^a-zA-Z0-9.\u0600-\u06FF_-]/g, "_");
  const fileName = `${timestamp}_${safeName}`;
  const filePath = resolve(targetDir, fileName);

  if (!filePath.startsWith(targetDir + sep)) {
    return {
      success: false,
      error: "مسار حفظ الملف غير صالح",
    };
  }

  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);

  if (!verifyMagicBytes(buffer, ext)) {
    return {
      success: false,
      error: "محتوى الملف لا يتطابق مع امتداده المسموح به",
    };
  }

  await writeFile(filePath, buffer);

  const relativePath = `/uploads/${sanitizedSubfolder ? sanitizedSubfolder + "/" : ""}${fileName}`;

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
