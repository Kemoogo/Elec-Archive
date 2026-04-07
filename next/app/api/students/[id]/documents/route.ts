import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db/connect";
import { authenticate } from "@/lib/auth/middleware";
import { logAuditEvent } from "@/lib/auth/audit";
import { errors } from "@/lib/auth/errors";
import { Student } from "@/lib/db/models/Student";
import { deleteDocumentSchema } from "@/lib/validations/student";
import { writeFile, unlink, mkdir } from "fs/promises";
import { join } from "path";
import { checkApiRateLimit, rateLimitErrorResponse } from "@/lib/security/rate-limit";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_TYPES = ["application/pdf", "image/jpeg", "image/png"];
const UPLOAD_DIR = join(process.cwd(), "public", "uploads", "students");

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await authenticate();
  if (!auth.success) {
    return NextResponse.json(
      { success: false, error: auth.error },
      { status: auth.status },
    );
  }

  if (auth.user!.permissions.students !== "edit") {
    return NextResponse.json(
      { success: false, error: errors.insufficientPermissions },
      { status: 403 },
    );
  }

  const ip = request.headers.get("x-forwarded-for") ?? "";
  const rl = checkApiRateLimit(auth.user!.id, ip, "upload");
  if (!rl.allowed) {
    return NextResponse.json(rateLimitErrorResponse(rl.resetAt), { status: 429 });
  }

  await connectToDatabase();

  const { id } = await params;
  const student = await Student.findById(id);
  if (!student) {
    return NextResponse.json(
      { success: false, error: "الطالب غير موجود" },
      { status: 404 },
    );
  }

  if (student.status !== "active") {
    return NextResponse.json(
      { success: false, error: "لا يمكن رفع مستندات لطالب موقف" },
      { status: 400 },
    );
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file");
    const name = formData.get("name") as string | null;

    if (!(file instanceof File)) {
      return NextResponse.json(
        { success: false, error: "الملف مطلوب" },
        { status: 400 },
      );
    }

    if (!name?.trim()) {
      return NextResponse.json(
        { success: false, error: "اسم المستند مطلوب" },
        { status: 400 },
      );
    }

    // Validate file type
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { success: false, error: "نوع الملف غير مدعوم. يُسمح بـ PDF و JPEG و PNG فقط" },
        { status: 400 },
      );
    }

    // Validate file extension
    const ext = file.name.split(".").pop()?.toLowerCase();
    if (!ext || !["pdf", "jpg", "jpeg", "png"].includes(ext)) {
      return NextResponse.json(
        { success: false, error: "امتداد الملف غير مدعوم" },
        { status: 400 },
      );
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { success: false, error: "حجم الملف يتجاوز الحد الأقصى (10 ميجابايت)" },
        { status: 400 },
      );
    }

    // Save file
    await mkdir(UPLOAD_DIR, { recursive: true });
    const timestamp = Date.now();
    const sanitized = file.name.replace(/[^a-zA-Z0-9.\u0600-\u06FF]/g, "_");
    const filename = `${timestamp}-${sanitized}`;
    const filePath = join(UPLOAD_DIR, filename);

    const buffer = Buffer.from(await file.arrayBuffer());
    await writeFile(filePath, buffer);

    const fileUrl = `/uploads/students/${filename}`;

    // Add document to student
    student.documents.push({
      name: name.trim(),
      fileUrl,
      uploadedAt: new Date(),
    });
    await student.save();

    await logAuditEvent({
      userId: auth.user!.id,
      userName: auth.user!.fullName,
      action: "CREATE",
      module: "students",
      targetId: id,
      description: `تم رفع مستند "${name.trim()}" للطالب ${student.fullName}`,
      ipAddress: ip,
    });

    return NextResponse.json(
      {
        success: true,
        data: {
          name: name.trim(),
          fileUrl,
          uploadedAt: new Date().toISOString(),
        },
      },
      { status: 201 },
    );
  } catch {
    return NextResponse.json(
      { success: false, error: errors.internalError },
      { status: 500 },
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await authenticate();
  if (!auth.success) {
    return NextResponse.json(
      { success: false, error: auth.error },
      { status: auth.status },
    );
  }

  if (auth.user!.permissions.students !== "edit") {
    return NextResponse.json(
      { success: false, error: errors.insufficientPermissions },
      { status: 403 },
    );
  }

  const ip = request.headers.get("x-forwarded-for") ?? "";
  const rl = checkApiRateLimit(auth.user!.id, ip, "write");
  if (!rl.allowed) {
    return NextResponse.json(rateLimitErrorResponse(rl.resetAt), { status: 429 });
  }

  await connectToDatabase();

  try {
    const { id } = await params;
    const student = await Student.findById(id);
    if (!student) {
      return NextResponse.json(
        { success: false, error: "الطالب غير موجود" },
        { status: 404 },
      );
    }

    const body = await request.json();
    const parsed = deleteDocumentSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: errors.validationFailed, details: parsed.error.issues },
        { status: 400 },
      );
    }

    const { fileUrl } = parsed.data;

    const docIndex = (
      student.documents as { name: string; fileUrl: string; uploadedAt: Date }[]
    ).findIndex((d) => d.fileUrl === fileUrl);

    if (docIndex === -1) {
      return NextResponse.json(
        { success: false, error: "المستند غير موجود" },
        { status: 404 },
      );
    }

    // Delete file from filesystem
    const filePath = join(process.cwd(), "public", fileUrl);
    const expectedDir = join(process.cwd(), "public", "uploads", "students");
    if (!filePath.startsWith(expectedDir)) {
      return NextResponse.json(
        { success: false, error: "مسار الملف غير صالح" },
        { status: 400 },
      );
    }
    try {
      await unlink(filePath);
    } catch (err: unknown) {
      if ((err as NodeJS.ErrnoException).code !== "ENOENT") {
        throw err;
      }
    }

    // Remove document from array
    student.documents.splice(docIndex, 1);
    await student.save();

    await logAuditEvent({
      userId: auth.user!.id,
      userName: auth.user!.fullName,
      action: "DELETE",
      module: "students",
      targetId: id,
      description: `تم حذف مستند من الطالب ${student.fullName}`,
      ipAddress: ip,
    });

    return NextResponse.json({
      success: true,
      message: "تم حذف المستند بنجاح",
    });
  } catch (error) {
    console.error("Student document DELETE error:", error);
    return NextResponse.json(
      { success: false, error: errors.internalError },
      { status: 500 },
    );
  }
}
