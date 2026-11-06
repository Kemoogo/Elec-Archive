import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db/connect";
import { authenticate } from "@/lib/auth/middleware";
import { checkApiRateLimit, rateLimitErrorResponse } from "@/lib/security/rate-limit";
import { canEditModule } from "@/lib/auth/authorization";
import { Leave } from "@/lib/db/models/Leave";
import { Types } from "mongoose";
import { confirmReturnSchema } from "@/lib/validations/officers";
import { errors } from "@/lib/auth/errors";
import { handleApiError } from "@/lib/utils/api-error";
import { logAuditEvent } from "@/lib/auth/audit";

export async function POST(request: Request) {
  const auth = await authenticate();
  if (!auth.success) return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });

  const hasPermission =
    auth.user?.role === "commander" ||
    auth.user?.role === "admin" ||
    canEditModule(auth.user!, "arkan_harb") ||
    canEditModule(auth.user!, "officers");
  if (!hasPermission) {
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
    const parsed = confirmReturnSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: "بيانات غير صالحة", details: parsed.error.issues }, { status: 400 });
    }

    const { leaveId, returnDate } = parsed.data;
    const leave = await Leave.findById(leaveId);
    if (!leave) {
      return NextResponse.json({ success: false, error: "سجل الإجازة غير موجود" }, { status: 404 });
    }

    const actualReturn = returnDate ? new Date(returnDate) : new Date();
    leave.status = "closed";
    leave.actualReturnDate = actualReturn;
    leave.isReturnConfirmed = true;
    leave.updatedBy = new Types.ObjectId(auth.user!.id);
    await leave.save();

    await logAuditEvent({
      userId: auth.user!.id,
      userName: auth.user!.fullName,
      action: "UPDATE",
      module: "arkan_harb",
      description: `تأكيد عودة الضابط من الإجازة بنجاح`,
      targetId: leave._id.toString(),
      ipAddress: ip,
    });

    return NextResponse.json({ success: true, message: "تم تأكيد عودة الضابط للوحدة بنجاح" });
  } catch (error) {
    return handleApiError(error, "حدث خطأ أثناء تأكيد العودة");
  }
}
