import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db/connect";
import { authenticate } from "@/lib/auth/middleware";
import { checkApiRateLimit, rateLimitErrorResponse } from "@/lib/security/rate-limit";
import { canEditModule } from "@/lib/auth/authorization";
import { Leave } from "@/lib/db/models/Leave";
import { Types } from "mongoose";
import { extendLeaveSchema } from "@/lib/validations/officers";
import { errors } from "@/lib/auth/errors";
import { handleApiError } from "@/lib/utils/api-error";
import { logAuditEvent } from "@/lib/auth/audit";

export async function POST(request: Request) {
  const auth = await authenticate();
  if (!auth.success) return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });

  if (!canEditModule(auth.user!, "arkan_harb")) {
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
    const parsed = extendLeaveSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: "بيانات غير صالحة", details: parsed.error.issues }, { status: 400 });
    }

    const { leaveId, newEndDate, reason } = parsed.data;
    const leave = await Leave.findById(leaveId);
    if (!leave) {
      return NextResponse.json({ success: false, error: "سجل الإجازة غير موجود" }, { status: 404 });
    }

    const extendedDate = new Date(newEndDate);
    if (extendedDate <= leave.endDate) {
      return NextResponse.json({ success: false, error: "تاريخ الامتداد يجب أن يكون بعد تاريخ انتهاء الإجازة الحالي" }, { status: 400 });
    }

    leave.status = "extension_pending";
    leave.updatedBy = new Types.ObjectId(auth.user!.id);
    if (!leave.extensionRequests) leave.extensionRequests = [];
    leave.extensionRequests.push({
      newEndDate: extendedDate,
      reason,
      requestedAt: new Date(),
      status: "pending",
    });

    await leave.save();

    await logAuditEvent({
      userId: auth.user!.id,
      userName: auth.user!.fullName,
      action: "UPDATE",
      module: "arkan_harb",
      description: `تقديم طلب امتداد إجازة حتى ${newEndDate}`,
      targetId: leave._id.toString(),
      ipAddress: ip,
    });

    return NextResponse.json({ success: true, message: "تم رفع طلب الامتداد للقائد بنجاح" });
  } catch (error) {
    return handleApiError(error, "حدث خطأ أثناء تقديم طلب الامتداد");
  }
}
