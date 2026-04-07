import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db/connect";
import { authenticate } from "@/lib/auth/middleware";
import { logAuditEvent } from "@/lib/auth/audit";
import { errors } from "@/lib/auth/errors";
import { Officer } from "@/lib/db/models/Officer";
import { Leave } from "@/lib/db/models/Leave";
import { canViewOfficers, canEditOfficers } from "@/lib/officers/access";
import { createLeaveSchema, leavesListQuerySchema } from "@/lib/validations/officers";
import { checkOfficersRateLimit, rateLimitErrorResponse } from "@/lib/security/rate-limit";
import { Types } from "mongoose";

export async function GET(request: Request) {
  const auth = await authenticate();
  if (!auth.success) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
  }

  if (!canViewOfficers(auth.user!)) {
    return NextResponse.json({ success: false, error: errors.insufficientPermissions }, { status: 403 });
  }

  const ip = request.headers.get("x-forwarded-for") ?? "";
  const rl = checkOfficersRateLimit(auth.user!.id, ip, "read");
  if (!rl.allowed) {
    return NextResponse.json(rateLimitErrorResponse(rl.resetAt), { status: 429 });
  }

  await connectToDatabase();

  const { searchParams } = new URL(request.url);
  const parsed = leavesListQuerySchema.safeParse(Object.fromEntries(searchParams.entries()));
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: errors.validationFailed, details: parsed.error.issues }, { status: 400 });
  }

  const { officerId, status, type, from, to, page, limit } = parsed.data;
  const query: Record<string, unknown> = {};
  if (officerId) query.officerId = officerId;
  if (status) query.status = status;
  if (type) query.type = type;
  if (from || to) {
    const dateQuery: Record<string, Date> = {};
    if (from) dateQuery.$gte = new Date(from);
    if (to) dateQuery.$lte = new Date(to);
    query.startDate = dateQuery;
  }

  const skip = (page - 1) * limit;
  const [leaves, total] = await Promise.all([
    Leave.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    Leave.countDocuments(query),
  ]);

  return NextResponse.json({
    success: true,
    data: {
      items: leaves.map((l) => ({
        id: l._id.toString(),
        officerId: l.officerId.toString(),
        category: l.category,
        type: l.type,
        startDate: l.startDate ? l.startDate.toISOString() : new Date().toISOString(),
        endDate: l.endDate ? l.endDate.toISOString() : new Date().toISOString(),
        reason: l.reason,
        status: l.status,
      })),
      total,
      page,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    },
  });
}

export async function POST(request: Request) {
  const auth = await authenticate();
  if (!auth.success) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
  }

  if (!canEditOfficers(auth.user!)) {
    return NextResponse.json({ success: false, error: errors.insufficientPermissions }, { status: 403 });
  }

  const ip = request.headers.get("x-forwarded-for") ?? "";
  const rl = checkOfficersRateLimit(auth.user!.id, ip, "write");
  if (!rl.allowed) {
    return NextResponse.json(rateLimitErrorResponse(rl.resetAt), { status: 429 });
  }

  await connectToDatabase();

  try {
    const body = await request.json();
    const parsed = createLeaveSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: errors.validationFailed, details: parsed.error.issues }, { status: 400 });
    }

    const data = parsed.data;
    const officer = await Officer.findById(data.officerId);
    if (!officer) {
      return NextResponse.json({ success: false, error: "الضابط غير موجود" }, { status: 404 });
    }

    if (officer.employmentStatus !== "active") {
      return NextResponse.json({ success: false, error: "لا يمكن إضافة إجازة لضابط غير نشط" }, { status: 400 });
    }

    const startDate = new Date(data.startDate);
    const endDate = new Date(data.endDate);

    const overlapping = await Leave.findOne({
      officerId: data.officerId,
      status: { $in: ["draft", "approved"] },
      $or: [
        { startDate: { $lte: endDate }, endDate: { $gte: startDate } },
      ],
    });

    if (overlapping) {
      return NextResponse.json({ success: false, error: "يوجد تداخل في التواريخ مع إجازة/غياب آخر لنفس الضابط" }, { status: 409 });
    }

    const leave = await Leave.create({
      officerId: data.officerId,
      category: data.category,
      type: data.type,
      startDate,
      endDate,
      reason: data.reason,
      status: "draft",
      createdBy: new Types.ObjectId(auth.user!.id),
      updatedBy: new Types.ObjectId(auth.user!.id),
    });

    await logAuditEvent({
      userId: auth.user!.id,
      userName: auth.user!.fullName,
      action: "CREATE",
      module: "officers",
      targetId: leave._id.toString(),
      description: `تم إنشاء ${data.category === "leave" ? "إجازة" : "غياب"} للضابط: ${officer.fullName}`,
      ipAddress: ip,
    });

    return NextResponse.json({ success: true, data: { id: leave._id.toString() } }, { status: 201 });
  } catch {
    return NextResponse.json({ success: false, error: errors.internalError }, { status: 500 });
  }
}
