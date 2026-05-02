import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db/connect";
import { authenticate } from "@/lib/auth/middleware";
import { canViewModule, canEditModule } from "@/lib/auth/authorization";
import { logAuditEvent } from "@/lib/auth/audit";
import { errors } from "@/lib/auth/errors";
import { Mission } from "@/lib/db/models/Mission";
import { Officer, RANK_LABELS, type OfficerRank } from "@/lib/db/models/Officer";
import { checkApiRateLimit, rateLimitErrorResponse } from "@/lib/security/rate-limit";
import { missionsListQuerySchema, createMissionSchema } from "@/lib/validations/arkan-harb";

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
    const parsed = missionsListQuerySchema.safeParse(Object.fromEntries(searchParams.entries()));
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: errors.validationFailed, details: parsed.error.issues },
        { status: 400 },
      );
    }

    const { officerId, status, page, limit } = parsed.data;

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

    if (status) query.status = status;

    const skip = (page - 1) * limit;
    const [items, total] = await Promise.all([
      Mission.find(query).sort({ startDate: -1 }).skip(skip).limit(limit).lean(),
      Mission.countDocuments(query),
    ]);

    // 6. Audit
    await logAuditEvent({
      userId: auth.user!.id,
      userName: auth.user!.fullName,
      action: "VIEW",
      module: "arkan_harb",
      description: `عرض قائمة المأموريات (صفحة ${page})${officerDisplayName ? ` للضابط: ${officerDisplayName}` : ""}`,
      ipAddress: ip,
    });

    // 7. Response
    return NextResponse.json({
      success: true,
      data: {
        items: items.map((m) => ({
          id: m._id.toString(),
          officerId: m.officerId.toString(),
          title: m.title,
          description: m.description,
          destination: m.destination,
          startDate: m.startDate,
          endDate: m.endDate ?? null,
          status: m.status,
          createdBy: m.createdBy.toString(),
          createdAt: m.createdAt,
        })),
        total,
        page,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      },
    });
  } catch (error) {
    console.error("Missions GET error:", error);
    return NextResponse.json({ success: false, error: errors.internalError }, { status: 500 });
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
    const parsed = createMissionSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: errors.validationFailed, details: parsed.error.issues },
        { status: 400 },
      );
    }

    const data = parsed.data;

    // 5. Create mission
    const mission = await Mission.create({
      officerId: data.officerId,
      title: data.title,
      description: data.description,
      destination: data.destination,
      startDate: new Date(data.startDate),
      endDate: data.endDate ? new Date(data.endDate) : undefined,
      status: data.status,
      createdBy: auth.user!.id,
      updatedBy: auth.user!.id,
    });

    // 6. Audit
    const officer = await Officer.findById(data.officerId).select("rank fullName").lean();
    const officerDisplayName = officer 
      ? `${RANK_LABELS[officer.rank as OfficerRank]} / ${officer.fullName}` 
      : data.officerId;

    await logAuditEvent({
      userId: auth.user!.id,
      userName: auth.user!.fullName,
      action: "CREATE",
      module: "arkan_harb",
      targetId: mission._id.toString(),
      description: `تم إنشاء مأمورية جديدة: ${data.title} للضابط: ${officerDisplayName}`,
      ipAddress: ip,
    });

    // 7. Response
    return NextResponse.json({ success: true, data: { id: mission._id.toString() } }, { status: 201 });
  } catch (error) {
    console.error("Missions POST error:", error);
    return NextResponse.json({ success: false, error: errors.internalError }, { status: 500 });
  }
}
