import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db/connect";
import { authenticate } from "@/lib/auth/middleware";
import { logAuditEvent } from "@/lib/auth/audit";
import { errors } from "@/lib/auth/errors";
import { handleApiError } from "@/lib/utils/api-error";
import { Assignment } from "@/lib/db/models/Assignment";
import { canEditOfficers } from "@/lib/officers/access";
import { patchAssignmentSchema } from "@/lib/validations/officers";
import { checkOfficersRateLimit, rateLimitErrorResponse } from "@/lib/security/rate-limit";

const VALID_TRANSITIONS: Record<string, string[]> = {
  scheduled: ["active", "cancelled"],
  active: ["completed", "cancelled"],
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
  const assignment = await Assignment.findById(id);
  if (!assignment) {
    return NextResponse.json({ success: false, error: "السجل غير موجود" }, { status: 404 });
  }

  try {
    const body = await request.json();
    const parsed = patchAssignmentSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: errors.validationFailed, details: parsed.error.issues }, { status: 400 });
    }

    const data = parsed.data;

    if (data.status && data.status !== assignment.status) {
      const allowed = VALID_TRANSITIONS[assignment.status];
      if (!allowed || !allowed.includes(data.status)) {
        return NextResponse.json({
          success: false,
          error: `لا يمكن تحويل الحالة من "${assignment.status}" إلى "${data.status}"`,
        }, { status: 400 });
      }
      assignment.status = data.status;
    }

    if (data.type !== undefined) assignment.type = data.type;
    if (data.title !== undefined) assignment.title = data.title;
    if (data.description !== undefined) assignment.description = data.description;
    if (data.effectiveDate !== undefined) assignment.effectiveDate = new Date(data.effectiveDate);
    if (data.endDate !== undefined) assignment.endDate = data.endDate ? new Date(data.endDate) : undefined;
    assignment.updatedBy = new (await import("mongoose")).Types.ObjectId(auth.user!.id);

    await assignment.save();

    await logAuditEvent({
      userId: auth.user!.id,
      userName: auth.user!.fullName,
      action: "UPDATE",
      module: "officers",
      targetId: id,
      description: `تحديث سجل تكليف/ترقية/مأمورية`,
      ipAddress: ip,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return handleApiError(error);
  }
}
