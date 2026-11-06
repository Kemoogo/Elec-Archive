import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db/connect";
import { authenticate } from "@/lib/auth/middleware";
import { logAuditEvent } from "@/lib/auth/audit";
import { errors } from "@/lib/auth/errors";
import { handleApiError } from "@/lib/utils/api-error";
import { Course } from "@/lib/db/models/Course";
import { addParticipantSchema, removeParticipantSchema } from "@/lib/validations/education";
import { checkApiRateLimit, rateLimitErrorResponse } from "@/lib/security/rate-limit";
import { canEditModule } from "@/lib/auth/authorization";
import { Types } from "mongoose";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
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
    const course = await Course.findById(id).lean();
    if (!course) {
      return NextResponse.json({ success: false, error: "الدورة غير موجودة" }, { status: 404 });
    }

    const body = await request.json();
    const parsed = addParticipantSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: errors.validationFailed, details: parsed.error.issues }, { status: 400 });
    }

    const { participantId } = parsed.data;

    // Check if already enrolled
    const participants = (course.participants || []) as Types.ObjectId[];
    if (participants.some((p) => p.toString() === participantId)) {
      return NextResponse.json({ success: false, error: "المشارك مسجل مسبقاً في هذه الدورة" }, { status: 400 });
    }

    // Verify participant exists and is active
    const modelName = course.participantModel as string;
    let participant: { fullName?: string } | null = null;
    if (modelName === "Officer") {
      const { Officer } = await import("@/lib/db/models/Officer");
      participant = await Officer.findOne({
        _id: participantId,
        isInUnit: true,
        employmentStatus: "active",
      }).select("fullName").lean();
      if (!participant) {
        return NextResponse.json({ success: false, error: "الضابط غير موجود أو غير نشط بقوة الوحدة" }, { status: 404 });
      }
    } else {
      const { Student } = await import("@/lib/db/models/Student");
      participant = await Student.findOne({
        _id: participantId,
        status: "active",
      }).select("fullName").lean();
      if (!participant) {
        return NextResponse.json({ success: false, error: "الدارس غير موجود أو غير نشط بالخدمة" }, { status: 404 });
      }
    }

    await Course.findByIdAndUpdate(id, { $addToSet: { participants: participantId } });

    await logAuditEvent({
      userId: auth.user!.id,
      userName: auth.user!.fullName,
      action: "UPDATE",
      module: "education",
      targetId: id,
      description: `تم إضافة مشارك للدورة: ${participant.fullName || ""}`,
      ipAddress: ip,
    });

    return NextResponse.json({ success: true, message: "تم إضافة المشارك بنجاح" });
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
    const parsed = removeParticipantSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: errors.validationFailed, details: parsed.error.issues }, { status: 400 });
    }

    await Course.findByIdAndUpdate(id, { $pull: { participants: parsed.data.participantId } });

    await logAuditEvent({
      userId: auth.user!.id,
      userName: auth.user!.fullName,
      action: "UPDATE",
      module: "education",
      targetId: id,
      description: "تم إزالة مشارك من الدورة",
      ipAddress: ip,
    });

    return NextResponse.json({ success: true, message: "تم إزالة المشارك بنجاح" });
  } catch (error) {
    return handleApiError(error);
  }
}
