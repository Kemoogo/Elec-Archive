import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db/connect";
import { authenticate } from "@/lib/auth/middleware";
import { logAuditEvent } from "@/lib/auth/audit";
import { errors } from "@/lib/auth/errors";
import { handleApiError } from "@/lib/utils/api-error";
import { Course } from "@/lib/db/models/Course";
import { deleteDocumentSchema } from "@/lib/validations/education";
import { writeFile, unlink, mkdir } from "fs/promises";
import { resolve, sep, extname, basename } from "path";
import { checkApiRateLimit, rateLimitErrorResponse } from "@/lib/security/rate-limit";
import { canEditModule } from "@/lib/auth/authorization";
import { verifyMagicBytes } from "@/lib/uploads";

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const ALLOWED_EXTENSIONS = new Set([".pdf", ".jpg", ".jpeg", ".png", ".webp"]);
const ALLOWED_TYPES = ["application/pdf", "image/jpeg", "image/png", "image/webp"];
const UPLOAD_DIR = resolve(process.cwd(), "public", "uploads", "courses");

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await authenticate();
  if (!auth.success) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
  }
  if (!canEditModule(auth.user!, "education")) {
    return NextResponse.json({ success: false, error: errors.insufficientPermissions }, { status: 403 });
  }
  const ip = request.headers.get("x-forwarded-for") ?? "";
  const rl = checkApiRateLimit(auth.user!.id, ip, "upload");
  if (!rl.allowed) {
    return NextResponse.json(rateLimitErrorResponse(rl.resetAt), { status: 429 });
  }
  try {
    await connectToDatabase();

    const { id } = await params;
    const course = await Course.findById(id);
    if (!course) {
      return NextResponse.json({ success: false, error: "الدورة غير موجودة" }, { status: 404 });
    }

    if (course.status === "completed") {
      return NextResponse.json({ success: false, error: "لا يمكن رفع مستندات لدورة منتهية" }, { status: 400 });
    }

    const formData = await request.formData();
    const file = formData.get("file");
    const name = formData.get("name") as string | null;

    if (!(file instanceof File)) {
      return NextResponse.json({ success: false, error: "الملف مطلوب" }, { status: 400 });
    }
    if (!name?.trim()) {
      return NextResponse.json({ success: false, error: "اسم المستند مطلوب" }, { status: 400 });
    }

    const ext = extname(file.name).toLowerCase();
    if (!ALLOWED_TYPES.includes(file.type) || !ALLOWED_EXTENSIONS.has(ext)) {
      return NextResponse.json({ success: false, error: "نوع الملف غير مدعوم. الأنواع المسموحة: PDF, JPEG, PNG, WebP" }, { status: 400 });
    }
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ success: false, error: "حجم الملف يتجاوز الحد الأقصى (10 ميجابايت)" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    if (!verifyMagicBytes(buffer, ext)) {
      return NextResponse.json({ success: false, error: "محتوى الملف لا يتطابق مع امتداده" }, { status: 400 });
    }

    await mkdir(UPLOAD_DIR, { recursive: true });
    const timestamp = Date.now();
    const baseName = basename(file.name, ext).replace(/[^a-zA-Z0-9\u0600-\u06FF_-]/g, "_").slice(0, 80);
    const filename = `${timestamp}-${baseName}${ext}`;
    const filePath = resolve(UPLOAD_DIR, filename);

    if (!filePath.startsWith(UPLOAD_DIR + sep)) {
      return NextResponse.json({ success: false, error: "مسار الملف غير صالح" }, { status: 400 });
    }

    await writeFile(filePath, buffer);

    const fileUrl = `/uploads/courses/${filename}`;
    course.documents.push({ name: name.trim(), fileUrl });
    await course.save();

    await logAuditEvent({
      userId: auth.user!.id,
      userName: auth.user!.fullName,
      action: "CREATE",
      module: "education",
      targetId: id,
      description: `تم رفع مستند "${name.trim()}" للدورة ${course.title}`,
      ipAddress: ip,
    });

    return NextResponse.json({ success: true, data: { name: name.trim(), fileUrl } }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await authenticate();
  if (!auth.success) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
  }
  if (!canEditModule(auth.user!, "education")) {
    return NextResponse.json({ success: false, error: errors.insufficientPermissions }, { status: 403 });
  }
  const ip = request.headers.get("x-forwarded-for") ?? "";
  const rl = checkApiRateLimit(auth.user!.id, ip, "write");
  if (!rl.allowed) {
    return NextResponse.json(rateLimitErrorResponse(rl.resetAt), { status: 429 });
  }
  try {
    await connectToDatabase();

    const { id } = await params;
    const course = await Course.findById(id);
    if (!course) {
      return NextResponse.json({ success: false, error: "الدورة غير موجودة" }, { status: 404 });
    }

    const body = await request.json();
    const parsed = deleteDocumentSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: errors.validationFailed, details: parsed.error.issues }, { status: 400 });
    }

    const { fileUrl } = parsed.data;
    const docs = course.documents as { name: string; fileUrl: string }[];
    const idx = docs.findIndex((d) => d.fileUrl === fileUrl);
    if (idx === -1) {
      return NextResponse.json({ success: false, error: "المستند غير موجود" }, { status: 404 });
    }

    const resolvedPath = resolve(process.cwd(), "public", fileUrl.replace(/^\/+/, ""));
    const expectedDir = resolve(process.cwd(), "public", "uploads", "courses");
    if (!resolvedPath.startsWith(expectedDir + sep)) {
      return NextResponse.json({ success: false, error: "مسار الملف غير صالح" }, { status: 400 });
    }
    try { await unlink(resolvedPath); } catch (err: unknown) { if ((err as NodeJS.ErrnoException).code !== "ENOENT") throw err; }
    course.documents.splice(idx, 1);
    await course.save();

    await logAuditEvent({
      userId: auth.user!.id,
      userName: auth.user!.fullName,
      action: "DELETE",
      module: "education",
      targetId: id,
      description: `تم حذف مستند من الدورة ${course.title}`,
      ipAddress: ip,
    });

    return NextResponse.json({ success: true, message: "تم حذف المستند بنجاح" });
  } catch (error) {
    return handleApiError(error);
  }
}
