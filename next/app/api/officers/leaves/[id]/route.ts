import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db/connect";
import { authenticate } from "@/lib/auth/middleware";
import { logAuditEvent } from "@/lib/auth/audit";
import { errors } from "@/lib/auth/errors";
import { Leave } from "@/lib/db/models/Leave";
import { canEditOfficers } from "@/lib/officers/access";
import { patchLeaveSchema } from "@/lib/validations/officers";
import { checkOfficersRateLimit, rateLimitErrorResponse } from "@/lib/security/rate-limit";

const VALID_TRANSITIONS: Record<string, string[]> = {
  draft: ["approved", "cancelled"],
  approved: ["closed", "cancelled"],
};

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await authenticate();
  if (!auth.success) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
  }

  if (!canEditOfficers(auth.user!)) {
    return NextResponse.json({ success: false, error: errors.insufficientPermissions }, { status: 403 });
  }

  const ip = request.headers.get("x-forwarded-for") ?? "";
  const rl = checkOfficersRateLimit(auth.user!.id, ip, "write");
  if (!rl.allowed) {
    return NextResponse.json(rateLimitErrorResponse(rl.resetAt), { status: 429 });
  }

  await connectToDatabase();

  const { id } = await params;
  const leave = await Leave.findById(id);
  if (!leave) {
    return NextResponse.json({ success: false, error: "السجل غير موجود" }, { status: 404 });
  }

  try {
    const body = await request.json();
    const parsed = patchLeaveSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: errors.validationFailed, details: parsed.error.issues }, { status: 400 });
    }

    const data = parsed.data;

    if (data.status && data.status !== leave.status) {
      const allowed = VALID_TRANSITIONS[leave.status];
      if (!allowed || !allowed.includes(data.status)) {
        return NextResponse.json({
          success: false,
          error: `لا يمكن تحويل الحالة من "${leave.status}" إلى "${data.status}"`,
        }, { status: 400 });
      }
      leave.status = data.status;
    }

    if (data.type !== undefined) leave.type = data.type;
    if (data.startDate !== undefined) leave.startDate = new Date(data.startDate);
    if (data.endDate !== undefined) leave.endDate = new Date(data.endDate);
    if (data.reason !== undefined) leave.reason = data.reason;
    leave.updatedBy = new (await import("mongoose")).Types.ObjectId(auth.user!.id);

    await leave.save();

    await logAuditEvent({
      userId: auth.user!.id,
      userName: auth.user!.fullName,
      action: "UPDATE",
      module: "officers",
      targetId: id,
      description: `تحديث سجل إجازة/غياب`,
      ipAddress: ip,
    });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ success: false, error: errors.internalError }, { status: 500 });
  }
}
