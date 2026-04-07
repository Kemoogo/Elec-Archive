import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db/connect";
import { authenticate } from "@/lib/auth/middleware";
import { logAuditEvent } from "@/lib/auth/audit";
import { errors } from "@/lib/auth/errors";
import { Officer } from "@/lib/db/models/Officer";
import { Assignment } from "@/lib/db/models/Assignment";
import { canViewOfficers, canEditOfficers } from "@/lib/officers/access";
import { createAssignmentSchema, assignmentsListQuerySchema } from "@/lib/validations/officers";
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
  const parsed = assignmentsListQuerySchema.safeParse(Object.fromEntries(searchParams.entries()));
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: errors.validationFailed, details: parsed.error.issues }, { status: 400 });
  }

  const { officerId, type, page, limit } = parsed.data;
  const query: Record<string, unknown> = {};
  if (officerId) query.officerId = officerId;
  if (type) query.type = type;

  const skip = (page - 1) * limit;
  const [assignments, total] = await Promise.all([
    Assignment.find(query).sort({ effectiveDate: -1 }).skip(skip).limit(limit).lean(),
    Assignment.countDocuments(query),
  ]);

  return NextResponse.json({
    success: true,
    data: {
      items: assignments.map((a) => ({
        id: a._id.toString(),
        officerId: a.officerId.toString(),
        type: a.type,
        title: a.title,
        description: a.description,
        effectiveDate: a.effectiveDate.toISOString(),
        endDate: a.endDate?.toISOString(),
        status: a.status,
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
    const parsed = createAssignmentSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: errors.validationFailed, details: parsed.error.issues }, { status: 400 });
    }

    const data = parsed.data;
    const officer = await Officer.findById(data.officerId);
    if (!officer) {
      return NextResponse.json({ success: false, error: "الضابط غير موجود" }, { status: 404 });
    }

    const assignment = await Assignment.create({
      officerId: data.officerId,
      type: data.type,
      title: data.title,
      description: data.description,
      effectiveDate: new Date(data.effectiveDate),
      endDate: data.endDate ? new Date(data.endDate) : undefined,
      status: "scheduled",
      createdBy: new Types.ObjectId(auth.user!.id),
      updatedBy: new Types.ObjectId(auth.user!.id),
    });

    await logAuditEvent({
      userId: auth.user!.id,
      userName: auth.user!.fullName,
      action: "CREATE",
      module: "officers",
      targetId: assignment._id.toString(),
      description: `تم إنشاء ${data.type === "promotion" ? "ترقية" : data.type === "mission" ? "مأمورية" : "تكليف"} للضابط: ${officer.fullName}`,
      ipAddress: ip,
    });

    return NextResponse.json({ success: true, data: { id: assignment._id.toString() } }, { status: 201 });
  } catch {
    return NextResponse.json({ success: false, error: errors.internalError }, { status: 500 });
  }
}
