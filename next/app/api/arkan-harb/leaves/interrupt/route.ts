import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db/connect";
import { authenticate } from "@/lib/auth/middleware";
import { checkApiRateLimit, rateLimitErrorResponse } from "@/lib/security/rate-limit";
import { canEditModule } from "@/lib/auth/authorization";
import { Leave } from "@/lib/db/models/Leave";
import { logAuditEvent } from "@/lib/auth/audit";
import { errors } from "@/lib/auth/errors";
import { handleApiError } from "@/lib/utils/api-error";
import { z } from "zod";

const interruptLeaveSchema = z.object({
  leaveId: z.string().min(1, "معرف الإجازة مطلوب"),
  actualReturnDate: z.string().min(1, "تاريخ العودة الفعلي مطلوب"),
});

export async function POST(request: Request) {
  const auth = await authenticate();
  if (!auth.success) return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });

  const ip = request.headers.get("x-forwarded-for") ?? "";
  const rl = checkApiRateLimit(auth.user!.id, ip, "write");
  if (!rl.allowed) {
    return NextResponse.json(rateLimitErrorResponse(rl.resetAt), { status: 429 });
  }

  const hasPermission =
    auth.user?.role === "commander" ||
    auth.user?.role === "admin" ||
    canEditModule(auth.user!, "arkan_harb") ||
    canEditModule(auth.user!, "officers");
  if (!hasPermission) {
    return NextResponse.json({ success: false, error: errors.insufficientPermissions }, { status: 403 });
  }

  await connectToDatabase();

  try {
    const body = await request.json();
    const parsed = interruptLeaveSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: "بيانات غير صالحة", details: parsed.error.issues }, { status: 400 });
    }

    const { leaveId, actualReturnDate } = parsed.data;
    const leave = await Leave.findById(leaveId);
    if (!leave) {
      return NextResponse.json({ success: false, error: "الإجازة غير موجودة" }, { status: 404 });
    }

    const returnDateStr = actualReturnDate.split("T")[0];
    const startDateStr = new Date(leave.startDate).toISOString().split("T")[0];
    const todayStr = new Date().toISOString().split("T")[0];

    if (returnDateStr < startDateStr) {
      return NextResponse.json({ success: false, error: "تاريخ العودة الفعلي لا يمكن أن يكون قبل تاريخ بداية الإجازة" }, { status: 400 });
    }

    if (returnDateStr > todayStr) {
      return NextResponse.json({ success: false, error: "قطع الإجازة يجب أن يكون في يوم التنفيذ (اليوم) ولا يمكن أن يكون تاريخاً مستقبلياً" }, { status: 400 });
    }

    const returnDateObj = new Date(returnDateStr + "T00:00:00.000Z");

    if (!leave.originalEndDate) {
      leave.originalEndDate = leave.endDate;
    }
    leave.status = "interrupted";
    leave.actualReturnDate = returnDateObj;
    leave.endDate = returnDateObj;
    if (body.reason && typeof body.reason === "string" && body.reason.trim()) {
      leave.reason = leave.reason
        ? `${leave.reason} (قطع الإجازة: ${body.reason.trim()})`
        : `قطع الإجازة: ${body.reason.trim()}`;
    }
    leave.updatedBy = auth.user!.id as unknown as typeof leave.updatedBy;
    await leave.save();

    await logAuditEvent({
      userId: auth.user!.id,
      userName: auth.user!.fullName || auth.user!.username,
      action: "UPDATE",
      module: "arkan_harb",
      targetId: leave._id.toString(),
      description: `قطع الإجازة وتحديد تاريخ العودة الفعلي: ${returnDateStr}`,
    });

    return NextResponse.json({ success: true, data: { leaveId: leave._id.toString() } });
  } catch (error) {
    return handleApiError(error, "حدث خطأ أثناء قطع الإجازة");
  }
}
