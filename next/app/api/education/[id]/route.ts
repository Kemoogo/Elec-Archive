import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db/connect";
import { authenticate } from "@/lib/auth/middleware";
import { logAuditEvent } from "@/lib/auth/audit";
import { errors } from "@/lib/auth/errors";
import { handleApiError } from "@/lib/utils/api-error";
import { Course } from "@/lib/db/models/Course";
import { updateCourseSchema } from "@/lib/validations/education";
import { unlink } from "fs/promises";
import { join } from "path";
import { checkApiRateLimit, rateLimitErrorResponse } from "@/lib/security/rate-limit";
import type { Types } from "mongoose";

function serializeCourse(c: Record<string, unknown>) {
  return {
    _id: (c._id as Types.ObjectId).toString(),
    title: c.title as string,
    description: c.description as string | undefined,
    startDate: (c.startDate as Date).toISOString(),
    endDate: (c.endDate as Date).toISOString(),
    status: c.status as string,
    participantModel: c.participantModel as string,
    participants: (c.participants as Record<string, unknown>[]).map((p) => ({
      _id: (p._id as Types.ObjectId).toString(),
      fullName: p.fullName as string,
      militaryId: p.militaryId as string | undefined,
      studentId: p.studentId as string | undefined,
    })),
    documents: (c.documents as { name: string; fileUrl: string }[]).map((d) => ({
      name: d.name,
      fileUrl: d.fileUrl,
    })),
    createdAt: (c.createdAt as Date).toISOString(),
  };
}

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await authenticate();
  if (!auth.success) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
  }
  if (auth.user!.permissions.education === "none") {
    return NextResponse.json({ success: false, error: errors.insufficientPermissions }, { status: 403 });
  }
  const ip = request.headers.get("x-forwarded-for") ?? "";
  const rl = checkApiRateLimit(auth.user!.id, ip, "read");
  if (!rl.allowed) {
    return NextResponse.json(rateLimitErrorResponse(rl.resetAt), { status: 429 });
  }
  try {
    await connectToDatabase();

    const { id } = await params;
    const course = await Course.findById(id).populate("participants", "fullName militaryId studentId").lean();
    if (!course) {
      return NextResponse.json({ success: false, error: "الدورة غير موجودة" }, { status: 404 });
    }

    await logAuditEvent({
      userId: auth.user!.id,
      userName: auth.user!.fullName,
      action: "VIEW",
      module: "education",
      targetId: id,
      description: `عرض تفاصيل الدورة: ${(course as Record<string, unknown>).title as string}`,
      ipAddress: ip,
    });

    return NextResponse.json({ success: true, data: serializeCourse(course as Record<string, unknown>) });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await authenticate();
  if (!auth.success) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
  }
  if (auth.user!.permissions.education !== "edit") {
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
    const parsed = updateCourseSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: errors.validationFailed, details: parsed.error.issues }, { status: 400 });
    }

    const updateData: Record<string, unknown> = {};
    if (parsed.data.title) updateData.title = parsed.data.title.trim();
    if (parsed.data.description !== undefined) updateData.description = parsed.data.description.trim();
    if (parsed.data.startDate) updateData.startDate = new Date(parsed.data.startDate);
    if (parsed.data.endDate) updateData.endDate = new Date(parsed.data.endDate);
    if (parsed.data.status) updateData.status = parsed.data.status;

    const updated = await Course.findByIdAndUpdate(id, updateData, { returnDocument: "after" }).populate("participants", "fullName militaryId studentId").lean();
    if (!updated) {
      return NextResponse.json({ success: false, error: "الدورة غير موجودة" }, { status: 404 });
    }

    await logAuditEvent({
      userId: auth.user!.id,
      userName: auth.user!.fullName,
      action: "UPDATE",
      module: "education",
      targetId: id,
      description: `تم تحديث الدورة: ${(updated as Record<string, unknown>).title as string}`,
      ipAddress: ip,
    });

    return NextResponse.json({ success: true, data: serializeCourse(updated as Record<string, unknown>) });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await authenticate();
  if (!auth.success) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
  }
  if (auth.user!.permissions.education !== "edit") {
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

    if ((course.participants as Types.ObjectId[]).length > 0) {
      return NextResponse.json({ success: false, error: "لا يمكن حذف الدورة التي لديها مشاركون. يرجى إزالة جميع المشاركين أولاً" }, { status: 400 });
    }

    // Delete associated files
    for (const doc of (course.documents as { name: string; fileUrl: string }[])) {
      try {
        await unlink(join(process.cwd(), "public", doc.fileUrl));
      } catch { /* file may not exist */ }
    }

    await Course.findByIdAndDelete(id);

    await logAuditEvent({
      userId: auth.user!.id,
      userName: auth.user!.fullName,
      action: "DELETE",
      module: "education",
      targetId: id,
      description: `تم حذف الدورة: ${course.title}`,
      ipAddress: ip,
    });

    return NextResponse.json({ success: true, message: "تم حذف الدورة بنجاح" });
  } catch (error) {
    return handleApiError(error);
  }
}
