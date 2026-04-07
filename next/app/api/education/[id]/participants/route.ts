import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db/connect";
import { authenticate } from "@/lib/auth/middleware";
import { logAuditEvent } from "@/lib/auth/audit";
import { errors } from "@/lib/auth/errors";
import { Course } from "@/lib/db/models/Course";
import { addParticipantSchema, removeParticipantSchema } from "@/lib/validations/education";
import { checkApiRateLimit, rateLimitErrorResponse } from "@/lib/security/rate-limit";
import { Types } from "mongoose";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
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
  await connectToDatabase();

  try {
    const { id } = await params;
    const course = await Course.findById(id);
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
    const participants = course.participants as Types.ObjectId[];
    if (participants.some((p) => p.toString() === participantId)) {
      return NextResponse.json({ success: false, error: "المشارك مسجل مسبقاً في هذه الدورة" }, { status: 400 });
    }

    // Verify participant exists
    const modelName = course.participantModel as string;
    const ParticipantModel = modelName === "Officer"
      ? (await import("@/lib/db/models/Officer")).Officer
      : (await import("@/lib/db/models/Student")).Student;

    const participant = await ParticipantModel.findById(participantId).lean();
    if (!participant) {
      return NextResponse.json({ success: false, error: "المشارك غير موجود" }, { status: 404 });
    }

    await Course.findByIdAndUpdate(id, { $addToSet: { participants: participantId } });

    await logAuditEvent({
      userId: auth.user!.id,
      userName: auth.user!.fullName,
      action: "UPDATE",
      module: "education",
      targetId: id,
      description: `تم إضافة مشارك للدورة: ${(participant as Record<string, unknown>).fullName as string}`,
      ipAddress: ip,
    });

    return NextResponse.json({ success: true, message: "تم إضافة المشارك بنجاح" });
  } catch {
    return NextResponse.json({ success: false, error: errors.internalError }, { status: 500 });
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
  await connectToDatabase();

  try {
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
  } catch {
    return NextResponse.json({ success: false, error: errors.internalError }, { status: 500 });
  }
}
