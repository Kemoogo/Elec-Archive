import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db/connect";
import { authenticate } from "@/lib/auth/middleware";
import { checkApiRateLimit, rateLimitErrorResponse } from "@/lib/security/rate-limit";
import { canEditModule } from "@/lib/auth/authorization";
import { Leave } from "@/lib/db/models/Leave";
import { cancelLeaveSchema } from "@/lib/validations/officers";
import { errors } from "@/lib/auth/errors";
import { handleApiError } from "@/lib/utils/api-error";
import { logAuditEvent } from "@/lib/auth/audit";

export async function POST(request: Request) {
  const auth = await authenticate();
  if (!auth.success) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
  }

  // Authorization: Only Admin or Arkan Harb editor
  const isAdmin = auth.user!.role === "admin";
  const isArkanHarbEditor = canEditModule(auth.user!, "arkan_harb");

  if (!isAdmin && !isArkanHarbEditor) {
    return NextResponse.json({ success: false, error: errors.insufficientPermissions }, { status: 403 });
  }

  const ip = request.headers.get("x-forwarded-for") ?? "";
  const rl = checkApiRateLimit(auth.user!.id, ip, "write");
  if (!rl.allowed) {
    return NextResponse.json(rateLimitErrorResponse(rl.resetAt), { status: 429 });
  }

  await connectToDatabase();

  try {
    const body = await request.json();
    const parsed = cancelLeaveSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: "بيانات غير صالحة", details: parsed.error.issues },
        { status: 400 },
      );
    }

    const { leaveId, reason } = parsed.data;
    const leave = await Leave.findById(leaveId);
    if (!leave) {
      return NextResponse.json({ success: false, error: "طلب الإجازة غير موجود" }, { status: 404 });
    }

    // Must be in pending_commander status
    if (leave.status !== "pending_commander") {
      return NextResponse.json(
        { success: false, error: "لا يمكن إلغاء الطلب لأنه ليس في حالة انتظار تصديق القائد" },
        { status: 400 },
      );
    }

    // Condition: Commander must NOT have viewed the leaves page or notifications yet (unless admin)
    if (!isAdmin && leave.viewedByCommander) {
      return NextResponse.json(
        {
          success: false,
          error: "تعذر إلغاء الطلب: لقد تم الاطلاع على هذا الطلب من قبل السيد القائد بالفعل",
        },
        { status: 400 },
      );
    }

    // Delete the pending leave record
    await Leave.findByIdAndDelete(leaveId);

    // Also remove associated notifications if any
    const { Notification } = await import("@/lib/db/models/Notification");
    await Notification.deleteMany({ refId: leave._id });

    await logAuditEvent({
      userId: auth.user!.id,
      userName: auth.user!.fullName,
      action: "DELETE",
      module: "arkan_harb",
      description: `إلغاء وسحب طلب إجازة قبل اطلاع القائد عليه${reason ? ` (السبب: ${reason})` : ""}`,
      targetId: leave._id.toString(),
      ipAddress: ip,
    });

    return NextResponse.json({
      success: true,
      message: "تم إلغاء وسحب طلب الإجازة بنجاح",
    });
  } catch (error) {
    return handleApiError(error, "حدث خطأ أثناء إلغاء طلب الإجازة");
  }
}
