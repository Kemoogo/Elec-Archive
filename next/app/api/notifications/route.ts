import { NextResponse } from "next/server";
import { authenticate } from "@/lib/auth/middleware";
import { connectToDatabase } from "@/lib/db/connect";
import { Notification } from "@/lib/db/models/Notification";
import { logAuditEvent } from "@/lib/auth/audit";
import { notificationQuerySchema, markReadSchema } from "@/lib/validations/dashboard-notifications";
import { handleApiError } from "@/lib/utils/api-error";
import { checkApiRateLimit, rateLimitErrorResponse } from "@/lib/security/rate-limit";

export async function GET(request: Request) {
  const auth = await authenticate();

  if (!auth.success) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
  }

  const ip = request.headers.get("x-forwarded-for") ?? "";
  const rl = checkApiRateLimit(auth.user!.id, ip, "read");
  if (!rl.allowed) {
    return NextResponse.json(rateLimitErrorResponse(rl.resetAt), { status: 429 });
  }

  const url = new URL(request.url);
  const parsed = notificationQuerySchema.safeParse({
    page: url.searchParams.get("page") ?? undefined,
    limit: url.searchParams.get("limit") ?? undefined,
    unreadOnly: url.searchParams.get("unreadOnly") ?? undefined,
  });

  if (!parsed.success) {
    return NextResponse.json({ success: false, error: "معاملات غير صالحة" }, { status: 400 });
  }

  const { page, limit, unreadOnly } = parsed.data;

  try {
    await connectToDatabase();

    const userId = auth.user!.id;

    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const query: Record<string, unknown> = {
      userId,
      ...(unreadOnly
        ? { isRead: false }
        : {
            $or: [
              { isRead: false },
              {
                isRead: true,
                $or: [
                  { readAt: { $gte: startOfDay } },
                  { createdAt: { $gte: startOfDay } },
                ],
              },
            ],
          }),
    };

    // When commander views notifications, mark any unviewed pending leaves as viewed
    if (auth.user!.role === "commander") {
      const { Leave } = await import("@/lib/db/models/Leave");
      await Leave.updateMany(
        { status: { $in: ["pending_commander", "extension_pending"] }, viewedByCommander: false },
        { $set: { viewedByCommander: true } }
      );
    }

    const total = await Notification.countDocuments(query);
    const unreadCount = await Notification.countDocuments({ userId, isRead: false });

    const notifications = await Notification.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    return NextResponse.json({
      success: true,
      data: {
        notifications: notifications.map((n) => ({
          _id: n._id.toString(),
          type: n.type,
          title: n.title,
          body: n.body,
          isRead: n.isRead,
          refId: n.refId?.toString(),
          refModel: n.refModel,
          createdAt: n.createdAt.toISOString(),
        })),
        unreadCount,
        total,
        page,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      },
    });
  } catch (error) {
    return handleApiError(error, "حدث خطأ أثناء تحميل الإشعارات");
  }
}

export async function PATCH(request: Request) {
  const auth = await authenticate();

  if (!auth.success) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
  }

  const ip = request.headers.get("x-forwarded-for") ?? "";
  const rl = checkApiRateLimit(auth.user!.id, ip, "write");
  if (!rl.allowed) {
    return NextResponse.json(rateLimitErrorResponse(rl.resetAt), { status: 429 });
  }

  const body = await request.json();
  const parsed = markReadSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ success: false, error: "معاملات غير صالحة" }, { status: 400 });
  }

  try {
    await connectToDatabase();

    const userId = auth.user!.id;

    let modifiedCount: number;

    if (parsed.data.action === "mark_all_read") {
      const result = await Notification.updateMany(
        { userId, isRead: false },
        { $set: { isRead: true, readAt: new Date() } },
      );
      modifiedCount = result.modifiedCount;
    } else {
      const { Types } = await import("mongoose");
      const validIds = parsed.data.notificationIds.filter((id) => Types.ObjectId.isValid(id));

      const result = await Notification.updateMany(
        { userId, _id: { $in: validIds }, isRead: false },
        { $set: { isRead: true, readAt: new Date() } },
      );
      modifiedCount = result.modifiedCount;
    }

    await logAuditEvent({
      userId: auth.user!.id,
      userName: auth.user!.fullName,
      action: "UPDATE",
      module: "notifications",
      description: `تم تعيين ${modifiedCount} إشعار كمقروء (${parsed.data.action === "mark_all_read" ? "الكل" : "محدد"})`,
      ipAddress: ip,
    });

    return NextResponse.json({
      success: true,
      data: { modifiedCount },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
