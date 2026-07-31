import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db/connect";
import { authenticate } from "@/lib/auth/middleware";
import { canViewModule, canEditModule } from "@/lib/auth/authorization";
import { logAuditEvent } from "@/lib/auth/audit";
import { errors } from "@/lib/auth/errors";
import { Promotion } from "@/lib/db/models/Promotion";
import { Officer, RANK_LABELS, type OfficerRank } from "@/lib/db/models/Officer";
import { handleApiError } from "@/lib/utils/api-error";
import { checkApiRateLimit, rateLimitErrorResponse } from "@/lib/security/rate-limit";
import { promotionsListQuerySchema, createPromotionSchema } from "@/lib/validations/arkan-harb";

export async function GET(request: Request) {
  // 1. Auth
  const auth = await authenticate();
  if (!auth.success) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
  }

  // 2. RBAC
  if (!canViewModule(auth.user!, "arkan_harb") && !canViewModule(auth.user!, "officers")) {
    return NextResponse.json({ success: false, error: errors.insufficientPermissions }, { status: 403 });
  }

  // 3. Rate limit
  const ip = request.headers.get("x-forwarded-for") ?? "";
  const rl = checkApiRateLimit(auth.user!.id, ip, "read");
  if (!rl.allowed) {
    return NextResponse.json(rateLimitErrorResponse(rl.resetAt), { status: 429 });
  }

  try {
    await connectToDatabase();

    // 4. Validate query params
    const { searchParams } = new URL(request.url);
    const parsed = promotionsListQuerySchema.safeParse(Object.fromEntries(searchParams.entries()));
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: errors.validationFailed, details: parsed.error.issues },
        { status: 400 },
      );
    }

    const { officerId, page, limit } = parsed.data;

    // 5. Build query
    const query: Record<string, unknown> = {};
    let officerDisplayName = "";

    if (officerId) {
      query.officerId = officerId;
      const officer = await Officer.findById(officerId).select("rank fullName").lean();
      if (officer) {
        officerDisplayName = `${RANK_LABELS[officer.rank as OfficerRank]} / ${officer.fullName}`;
      } else {
        officerDisplayName = officerId;
      }
    }

    const skip = (page - 1) * limit;
    const [items, total] = await Promise.all([
      Promotion.find(query).sort({ effectiveDate: -1 }).skip(skip).limit(limit).lean(),
      Promotion.countDocuments(query),
    ]);

    // 6. Audit
    await logAuditEvent({
      userId: auth.user!.id,
      userName: auth.user!.fullName,
      action: "VIEW",
      module: "arkan_harb",
      description: `عرض قائمة الترقيات (صفحة ${page})${officerDisplayName ? ` للضابط: ${officerDisplayName}` : ""}`,
      ipAddress: ip,
    });

    // 7. Response
    return NextResponse.json({
      success: true,
      data: {
        items: items.map((p) => ({
          id: p._id.toString(),
          officerId: p.officerId.toString(),
          fromRank: p.fromRank,
          toRank: p.toRank,
          effectiveDate: p.effectiveDate,
          orderNumber: p.orderNumber,
          notes: p.notes,
          createdBy: p.createdBy.toString(),
          createdAt: p.createdAt,
        })),
        total,
        page,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      },
    });
  } catch (error) {
    return handleApiError(error, "حدث خطأ أثناء تحميل الترقيات");
  }
}

export async function POST(request: Request) {
  // 1. Auth
  const auth = await authenticate();
  if (!auth.success) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
  }

  // 2. RBAC
  if (!canEditModule(auth.user!, "arkan_harb") && !canEditModule(auth.user!, "officers")) {
    return NextResponse.json({ success: false, error: errors.insufficientPermissions }, { status: 403 });
  }

  // 3. Rate limit
  const ip = request.headers.get("x-forwarded-for") ?? "";
  const rl = checkApiRateLimit(auth.user!.id, ip, "write");
  if (!rl.allowed) {
    return NextResponse.json(rateLimitErrorResponse(rl.resetAt), { status: 429 });
  }

  await connectToDatabase();

  try {
    // 4. Parse + Validate body
    const body: unknown = await request.json();
    const parsed = createPromotionSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: errors.validationFailed, details: parsed.error.issues },
        { status: 400 },
      );
    }

    const data = parsed.data;

    // 5. Create promotion
    const promotion = await Promotion.create({
      officerId: data.officerId,
      fromRank: data.fromRank,
      toRank: data.toRank,
      effectiveDate: new Date(data.effectiveDate),
      orderNumber: data.orderNumber,
      notes: data.notes,
      createdBy: auth.user!.id,
      updatedBy: auth.user!.id,
    });

    // 6. Update officer rank
    await Officer.findByIdAndUpdate(data.officerId, { rank: data.toRank });

    // 7. Audit
    const officer = await Officer.findById(data.officerId).select("rank fullName").lean();
    const officerDisplayName = officer 
      ? `${RANK_LABELS[officer.rank as OfficerRank]} / ${officer.fullName}` 
      : data.officerId;
    
    const fromRankLabel = RANK_LABELS[data.fromRank as OfficerRank] || data.fromRank;
    const toRankLabel = RANK_LABELS[data.toRank as OfficerRank] || data.toRank;

    await logAuditEvent({
      userId: auth.user!.id,
      userName: auth.user!.fullName,
      action: "CREATE",
      module: "arkan_harb",
      targetId: promotion._id.toString(),
      description: `تم ترقية الضابط ${officerDisplayName} من ${fromRankLabel} إلى ${toRankLabel}`,
      ipAddress: ip,
    });

    // 8. Response
    return NextResponse.json({ success: true, data: { id: promotion._id.toString() } }, { status: 201 });
  } catch (error) {
    return handleApiError(error, "حدث خطأ أثناء إنشاء الترقية");
  }
}
