import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db/connect";
import { authenticate } from "@/lib/auth/middleware";
import { checkApiRateLimit, rateLimitErrorResponse } from "@/lib/security/rate-limit";
import { canEditModule } from "@/lib/auth/authorization";
import { Leave } from "@/lib/db/models/Leave";
import { Officer } from "@/lib/db/models/Officer";
import { getOfficerActiveDutiesInRange } from "@/lib/arkan-harb/roster-leaves-sync";
import { formatDutyConflictErrorMessage } from "@/lib/arkan-harb/roster-leaves-sync";
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

    if (leave.status !== "approved") {
      return NextResponse.json({ success: false, error: "لا يمكن مد إجازة غير مصدق عليها أو منتهية" }, { status: 400 });
    }

    const officer = await Officer.findById(leave.officerId).select("isInUnit employmentStatus fullName").lean();
    if (!officer || !officer.isInUnit || officer.employmentStatus !== "active") {
      return NextResponse.json({ success: false, error: "الضابط خارج قوة الوحدة (مؤرشف)" }, { status: 400 });
    }

    const extendedDate = new Date(newEndDate);
    if (extendedDate <= leave.endDate) {
      return NextResponse.json({ success: false, error: "تاريخ الامتداد يجب أن يكون بعد تاريخ انتهاء الإجازة الحالي" }, { status: 400 });
    }

    // Check duty conflicts for extension interval
    const dutyConflicts = await getOfficerActiveDutiesInRange(leave.officerId.toString(), leave.endDate, extendedDate);
    if (dutyConflicts.length > 0) {
      return NextResponse.json(
        {
          success: false,
          error: formatDutyConflictErrorMessage(dutyConflicts),
        },
        { status: 400 }
      );
    }

    const isCommanderOrAdmin = auth.user!.role === "commander" || auth.user!.role === "admin";
    leave.endDate = extendedDate;
    leave.status = isCommanderOrAdmin ? "approved" : "extension_pending";
    leave.updatedBy = new Types.ObjectId(auth.user!.id);
    if (!leave.extensionRequests) leave.extensionRequests = [];
    leave.extensionRequests.push({
      newEndDate: extendedDate,
      reason,
      requestedAt: new Date(),
      status: isCommanderOrAdmin ? "approved" : "pending",
    });

    await leave.save();

    await logAuditEvent({
      userId: auth.user!.id,
      userName: auth.user!.fullName,
      action: "UPDATE",
      module: "arkan_harb",
      description: isCommanderOrAdmin
        ? `تنفيذ وتصديق امتداد إجازة مباشرة للضابط (${officer.fullName}) حتى ${newEndDate}`
        : `تقديم طلب امتداد إجازة للضابط (${officer.fullName}) حتى ${newEndDate} في انتظار تصديق القائد`,
      targetId: leave._id.toString(),
      ipAddress: ip,
    });

    return NextResponse.json({
      success: true,
      message: isCommanderOrAdmin
        ? "تم تمديد وتصديق الإجازة بنجاح"
        : "تم تسجيل طلب الامتداد وإرساله لتصديق السيد القائد",
    });
  } catch (error) {
    return handleApiError(error, "حدث خطأ أثناء تقديم طلب الامتداد");
  }
}
