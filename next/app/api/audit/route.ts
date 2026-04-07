import { NextResponse } from "next/server";
import { authenticate } from "@/lib/auth/middleware";
import { connectToDatabase } from "@/lib/db/connect";
import { AuditLog } from "@/lib/db/models/AuditLog";
import { auditQuerySchema } from "@/lib/validations/dashboard-notifications";
import { checkApiRateLimit, rateLimitErrorResponse } from "@/lib/security/rate-limit";

export async function GET(request: Request) {
  const auth = await authenticate();

  if (!auth.success) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
  }

  if (auth.user!.role !== "admin" && auth.user!.role !== "commander") {
    return NextResponse.json({ success: false, error: "غير مصرح" }, { status: 403 });
  }

  const ip = request.headers.get("x-forwarded-for") ?? "";
  const rl = checkApiRateLimit(auth.user!.id, ip, "read");
  if (!rl.allowed) {
    return NextResponse.json(rateLimitErrorResponse(rl.resetAt), { status: 429 });
  }

  const url = new URL(request.url);
  const parsed = auditQuerySchema.safeParse({
    page: url.searchParams.get("page"),
    limit: url.searchParams.get("limit"),
    userId: url.searchParams.get("userId") ?? undefined,
    action: url.searchParams.get("action") ?? undefined,
    module: url.searchParams.get("module") ?? undefined,
    startDate: url.searchParams.get("startDate") ?? undefined,
    endDate: url.searchParams.get("endDate") ?? undefined,
  });

  if (!parsed.success) {
    return NextResponse.json({ success: false, error: "معاملات غير صالحة" }, { status: 400 });
  }

  const { page, limit, userId, action, module, startDate, endDate } = parsed.data;

  await connectToDatabase();

  const query: Record<string, unknown> = {};

  if (userId) {
    query.userId = userId;
  }
  if (action) {
    query.action = action;
  }
  if (module) {
    query.module = module;
  }
  if (startDate || endDate) {
    const dateFilter: Record<string, Date> = {};
    if (startDate) {
      dateFilter.$gte = new Date(startDate);
    }
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      dateFilter.$lte = end;
    }
    query.createdAt = dateFilter;
  }

  try {
    const total = await AuditLog.countDocuments(query);

    const entries = await AuditLog.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    return NextResponse.json({
      success: true,
      data: {
        entries: entries.map((e) => ({
          _id: e._id.toString(),
          userId: e.userId.toString(),
          userName: e.userName,
          action: e.action,
          module: e.module,
          targetId: e.targetId?.toString(),
          description: e.description,
          ipAddress: e.ipAddress,
          createdAt: e.createdAt.toISOString(),
        })),
        total,
        page,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Audit API error:", error);
    return NextResponse.json(
      { success: false, error: "حدث خطأ أثناء تحميل سجل العمليات" },
      { status: 500 },
    );
  }
}
