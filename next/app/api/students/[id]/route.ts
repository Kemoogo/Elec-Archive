import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db/connect";
import { authenticate } from "@/lib/auth/middleware";
import { logAuditEvent } from "@/lib/auth/audit";
import { errors } from "@/lib/auth/errors";
import { handleApiError } from "@/lib/utils/api-error";
import { Student } from "@/lib/db/models/Student";
import { updateStudentSchema } from "@/lib/validations/student";
import { unlink } from "fs/promises";
import { join } from "path";
import { checkApiRateLimit, rateLimitErrorResponse } from "@/lib/security/rate-limit";
import type { Types } from "mongoose";

function serializeStudent(s: Record<string, unknown>) {
  return {
    _id: (s._id as Types.ObjectId).toString(),
    studentId: s.studentId as string,
    fullName: s.fullName as string,
    enrollDate: (s.enrollDate as Date).toISOString(),
    status: s.status as string,
    documents: (s.documents as { name: string; fileUrl: string; uploadedAt: Date }[]).map((d) => ({
      name: d.name,
      fileUrl: d.fileUrl,
      uploadedAt: d.uploadedAt.toISOString(),
    })),
    notes: s.notes as string | undefined,
    createdAt: (s.createdAt as Date).toISOString(),
    updatedAt: (s.updatedAt as Date).toISOString(),
  };
}

export async function GET(
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

  if (auth.user!.permissions.students === "none") {
    return NextResponse.json(
      { success: false, error: errors.insufficientPermissions },
      { status: 403 },
    );
  }

  const ip = request.headers.get("x-forwarded-for") ?? "";
  const rl = checkApiRateLimit(auth.user!.id, ip, "read");
  if (!rl.allowed) {
    return NextResponse.json(rateLimitErrorResponse(rl.resetAt), { status: 429 });
  }

  try {
    await connectToDatabase();

    const { id } = await params;
    const student = await Student.findById(id).lean();
  if (!student) {
    return NextResponse.json(
      { success: false, error: "الطالب غير موجود" },
      { status: 404 },
    );
  }

  await logAuditEvent({
    userId: auth.user!.id,
    userName: auth.user!.fullName,
    action: "VIEW",
    module: "students",
    targetId: id,
    description: `عرض سجل الطالب: ${(student as Record<string, unknown>).fullName as string}`,
    ipAddress: ip,
  });

  return NextResponse.json({
    success: true,
    data: serializeStudent(student as Record<string, unknown>),
  });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(
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

  try {
    await connectToDatabase();

    const { id } = await params;
    const student = await Student.findById(id);
    if (!student) {
      return NextResponse.json(
        { success: false, error: "الطالب غير موجود" },
        { status: 404 },
      );
    }

    const body = await request.json();
    const parsed = updateStudentSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: errors.validationFailed, details: parsed.error.issues },
        { status: 400 },
      );
    }

    const updateData: Record<string, unknown> = {};
    if (parsed.data.fullName) updateData.fullName = parsed.data.fullName.trim();
    if (parsed.data.enrollDate) updateData.enrollDate = new Date(parsed.data.enrollDate);
    if (parsed.data.notes !== undefined) updateData.notes = parsed.data.notes.trim();

    const updated = await Student.findByIdAndUpdate(id, updateData, { returnDocument: "after" }).lean();
    if (!updated) {
      return NextResponse.json(
        { success: false, error: "الطالب غير موجود" },
        { status: 404 },
      );
    }

    await logAuditEvent({
      userId: auth.user!.id,
      userName: auth.user!.fullName,
      action: "UPDATE",
      module: "students",
      targetId: id,
      description: `تم تحديث بيانات الطالب: ${(updated as Record<string, unknown>).fullName as string}`,
      ipAddress: ip,
    });

    return NextResponse.json({
      success: true,
      data: serializeStudent(updated as Record<string, unknown>),
    });
  } catch (error) {
    return handleApiError(error);
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

  try {
    await connectToDatabase();

    const { id } = await params;
    const student = await Student.findById(id);
    if (!student) {
      return NextResponse.json(
        { success: false, error: "الطالب غير موجود" },
        { status: 404 },
      );
    }

    // Delete associated files from filesystem
    const documents = student.documents as { name: string; fileUrl: string; uploadedAt: Date }[];
    const expectedDir = join(process.cwd(), "public", "uploads", "students");
    for (const doc of documents) {
      try {
        const filePath = join(process.cwd(), "public", doc.fileUrl);
        if (!filePath.startsWith(expectedDir)) continue;
        await unlink(filePath);
      } catch (err: unknown) {
        if ((err as NodeJS.ErrnoException).code !== "ENOENT") {
          // ignore ENOENT, log other errors
          console.error("File deletion error:", err);
        }
      }
    }

    // Soft-delete: set status to inactive and clear documents
    student.status = "inactive";
    student.documents = [];
    await student.save();

    await logAuditEvent({
      userId: auth.user!.id,
      userName: auth.user!.fullName,
      action: "DELETE",
      module: "students",
      targetId: id,
      description: `تم إيقاف الطالب: ${student.fullName}`,
      ipAddress: ip,
    });

    return NextResponse.json({
      success: true,
      data: serializeStudent(student.toObject() as Record<string, unknown>),
    });
  } catch (error) {
    return handleApiError(error);
  }
}
