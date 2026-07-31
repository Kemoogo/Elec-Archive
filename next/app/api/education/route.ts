import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db/connect";
import { authenticate } from "@/lib/auth/middleware";
import { logAuditEvent } from "@/lib/auth/audit";
import { errors } from "@/lib/auth/errors";
import { handleApiError } from "@/lib/utils/api-error";
import { Course } from "@/lib/db/models/Course";
import { courseListQuerySchema, createCourseSchema } from "@/lib/validations/education";
import { escapeRegex } from "@/lib/utils";
import { checkApiRateLimit, rateLimitErrorResponse } from "@/lib/security/rate-limit";
import type { Types } from "mongoose";

export async function GET(request: Request) {
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

    const { searchParams } = new URL(request.url);
    const params = Object.fromEntries(searchParams.entries());
    const parsed = courseListQuerySchema.safeParse(params);
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: errors.validationFailed, details: parsed.error.issues }, { status: 400 });
    }

    const { page, limit, status, search } = parsed.data;
    const query: Record<string, unknown> = {};

    if (status === "all") { /* no filter */ }
    else if (status) { query.status = status; }
    else { query.status = { $in: ["upcoming", "ongoing"] }; }

    if (search) {
      query.title = { $regex: escapeRegex(search), $options: "i" };
    }

    const skip = (page - 1) * limit;
    const [courses, total] = await Promise.all([
      Course.find(query).sort({ startDate: 1 }).skip(skip).limit(limit).lean(),
      Course.countDocuments(query),
    ]);

    await logAuditEvent({
      userId: auth.user!.id,
      userName: auth.user!.fullName,
      action: "VIEW",
      module: "education",
      description: `عرض قائمة الدورات (صفحة ${page})`,
      ipAddress: ip,
    });

    const serialized = courses.map((c) => ({
      _id: (c._id as Types.ObjectId).toString(),
      title: c.title,
      description: c.description,
      startDate: (c.startDate as Date).toISOString(),
      endDate: (c.endDate as Date).toISOString(),
      status: c.status,
      participantModel: c.participantModel,
      participantCount: (c.participants as Types.ObjectId[]).length,
      createdAt: (c.createdAt as Date).toISOString(),
    }));

    return NextResponse.json({
      success: true,
      data: { items: serialized, total, page, totalPages: Math.max(1, Math.ceil(total / limit)) },
    });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: Request) {
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
    const body = await request.json();
    const parsed = createCourseSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: errors.validationFailed, details: parsed.error.issues }, { status: 400 });
    }

    const { title, description, startDate, endDate, participantModel } = parsed.data;
    const trimmedTitle = title.trim();

    // Check for duplicate course title
    const existing = await Course.findOne({ title: { $regex: `^${escapeRegex(trimmedTitle)}$`, $options: "i" } });
    if (existing) {
      return NextResponse.json({ success: false, error: "يوجد دورة مسجلة بنفس العنوان مسبقاً" }, { status: 409 });
    }

    const course = await Course.create({
      title: trimmedTitle,
      description: description?.trim(),
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      status: "upcoming",
      participantModel,
      participants: [],
      documents: [],
    });

    await logAuditEvent({
      userId: auth.user!.id,
      userName: auth.user!.fullName,
      action: "CREATE",
      module: "education",
      targetId: course._id.toString(),
      description: `تم إنشاء دورة جديدة: ${title}`,
      ipAddress: ip,
    });

    return NextResponse.json({
      success: true,
      data: {
        _id: course._id.toString(),
        title: course.title,
        description: course.description,
        startDate: course.startDate.toISOString(),
        endDate: course.endDate.toISOString(),
        status: course.status,
        participantModel: course.participantModel,
        participants: [],
        documents: [],
        createdAt: course.createdAt.toISOString(),
      },
    }, { status: 201 });
  } catch {
    return NextResponse.json({ success: false, error: errors.internalError }, { status: 500 });
  }
}
