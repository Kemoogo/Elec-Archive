import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db/connect";
import { authenticate } from "@/lib/auth/middleware";
import { canEditModule, canViewModule } from "@/lib/auth/authorization";
import { logAuditEvent } from "@/lib/auth/audit";
import { errors } from "@/lib/auth/errors";
import { PositionAssignment } from "@/lib/db/models/PositionAssignment";
import { checkApiRateLimit, rateLimitErrorResponse } from "@/lib/security/rate-limit";
import { positionsListQuerySchema, createPositionAssignmentSchema } from "@/lib/validations/arkan-harb";

export async function GET(request: Request) {
  const auth = await authenticate();
  if (!auth.success) return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });

  if (!canViewModule(auth.user!, "arkan_harb") && !canViewModule(auth.user!, "officers")) return NextResponse.json({ success: false, error: errors.insufficientPermissions }, { status: 403 });

  const ip = request.headers.get("x-forwarded-for") ?? "";
  const rl = checkApiRateLimit(auth.user!.id, ip, "read");
  if (!rl.allowed) return NextResponse.json(rateLimitErrorResponse(rl.resetAt), { status: 429 });

  try {
    await connectToDatabase();
    const { searchParams } = new URL(request.url);
    const parsed = positionsListQuerySchema.safeParse(Object.fromEntries(searchParams.entries()));
    if (!parsed.success) return NextResponse.json({ success: false, error: errors.validationFailed, details: parsed.error.issues }, { status: 400 });

    const { officerId, status, page, limit } = parsed.data;
    const query: Record<string, unknown> = {};
    if (officerId) query.officerId = officerId;
    if (status) query.status = status;

    const skip = (page - 1) * limit;
    const [items, total] = await Promise.all([
      PositionAssignment.find(query).sort({ startDate: -1 }).skip(skip).limit(limit).lean(),
      PositionAssignment.countDocuments(query),
    ]);

    await logAuditEvent({
      userId: auth.user!.id,
      userName: auth.user!.fullName,
      action: "VIEW",
      module: "arkan_harb",
      description: `عرض قائمة التعيينات الوظيفية (صفحة ${page})${officerId ? ` للضابط ${officerId}` : ""}`,
      ipAddress: ip,
    });

    return NextResponse.json({
      success: true,
      data: {
        items: items.map((p) => ({
          id: p._id.toString(),
          officerId: p.officerId.toString(),
          positionTitle: p.positionTitle,
          positionType: p.positionType,
          substituteForOfficerId: p.substituteForOfficerId?.toString() ?? null,
          startDate: p.startDate,
          endDate: p.endDate ?? null,
          orderNumber: p.orderNumber,
          notes: p.notes,
          status: p.status,
          createdBy: p.createdBy.toString(),
          createdAt: p.createdAt,
        })),
        total,
        page,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      },
    });
  } catch (error) {
    console.error("Positions GET error:", error);
    return NextResponse.json({ success: false, error: errors.internalError }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const auth = await authenticate();
  if (!auth.success) return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });

  if (!canEditModule(auth.user!, "arkan_harb") && !canEditModule(auth.user!, "officers")) return NextResponse.json({ success: false, error: errors.insufficientPermissions }, { status: 403 });

  const ip = request.headers.get("x-forwarded-for") ?? "";
  const rl = checkApiRateLimit(auth.user!.id, ip, "write");
  if (!rl.allowed) return NextResponse.json(rateLimitErrorResponse(rl.resetAt), { status: 429 });

  await connectToDatabase();

  try {
    const body: unknown = await request.json();
    const parsed = createPositionAssignmentSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ success: false, error: errors.validationFailed, details: parsed.error.issues }, { status: 400 });

    const data = parsed.data;

    // 5. Check for conflicting primary positions
    if (data.positionType === "primary" && data.status === "active") {
      const existingOfficerPrimary = await PositionAssignment.findOne({
        officerId: data.officerId,
        positionType: "primary",
        status: "active",
      });

      if (existingOfficerPrimary) return NextResponse.json({ success: false, error: "الضابط لديه تعيين أساسي نشط بالفعل" }, { status: 409 });

      // Check if another officer has an active primary assignment for the same position title
      const existingTitlePrimary = await PositionAssignment.findOne({
        positionTitle: data.positionTitle,
        positionType: "primary",
        status: "active",
        officerId: { $ne: data.officerId },
      });

      if (existingTitlePrimary) {
        return NextResponse.json(
          { success: false, error: "هذه الوظيفة مشغولة بالفعل بصفة أساسية من قبل ضابط آخر (تنبيه: يجب إخلاء الطرف أولاً)" },
          { status: 409 },
        );
      }
    }

    const position = await PositionAssignment.create({
      officerId: data.officerId,
      positionTitle: data.positionTitle,
      positionType: data.positionType,
      substituteForOfficerId: data.substituteForOfficerId || undefined,
      startDate: new Date(data.startDate),
      endDate: data.endDate ? new Date(data.endDate) : undefined,
      orderNumber: data.orderNumber,
      notes: data.notes,
      status: data.status,
      createdBy: auth.user!.id,
      updatedBy: auth.user!.id,
    });

    await logAuditEvent({
      userId: auth.user!.id,
      userName: auth.user!.fullName,
      action: "CREATE",
      module: "arkan_harb",
      targetId: position._id.toString(),
      description: `تم إنشاء تعيين وظيفي جديد: ${data.positionTitle} للضابط ${data.officerId}`,
      ipAddress: ip,
    });

    return NextResponse.json({ success: true, data: { id: position._id.toString() } }, { status: 201 });
  } catch (error) {
    console.error("Positions POST error:", error);
    return NextResponse.json({ success: false, error: errors.internalError }, { status: 500 });
  }
}
