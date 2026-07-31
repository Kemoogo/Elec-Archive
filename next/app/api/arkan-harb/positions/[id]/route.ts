import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db/connect";
import { authenticate } from "@/lib/auth/middleware";
import { canEditModule } from "@/lib/auth/authorization";
import { logAuditEvent } from "@/lib/auth/audit";
import { errors } from "@/lib/auth/errors";
import { PositionAssignment, type PositionStatus } from "@/lib/db/models/PositionAssignment";
import { Officer, RANK_LABELS, type OfficerRank } from "@/lib/db/models/Officer";
import { handleApiError } from "@/lib/utils/api-error";
import { checkApiRateLimit, rateLimitErrorResponse } from "@/lib/security/rate-limit";
import { updatePositionAssignmentSchema } from "@/lib/validations/arkan-harb";

/** Valid lifecycle transitions for position status */
const VALID_STATUS_TRANSITIONS: Record<PositionStatus, PositionStatus[]> = {
  active: ["ended"],
  ended: [], // ended is terminal - no outbound edges
};

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

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
    // 4. Find existing position assignment
    const position = await PositionAssignment.findById(id);
    if (!position) {
      return NextResponse.json({ success: false, error: "التعيين الوظيفي غير موجود" }, { status: 404 });
    }

    // 5. Parse + Validate body
    const body: unknown = await request.json();
    const parsed = updatePositionAssignmentSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: errors.validationFailed, details: parsed.error.issues },
        { status: 400 },
      );
    }

    const data = parsed.data;

    // 6. Check for conflicting primary positions
    if (data.positionType === "primary" && data.status === "active") {
      // Check if officer already has an active primary assignment
      const existingOfficerPrimary = await PositionAssignment.findOne({
        officerId: data.officerId || position.officerId,
        positionType: "primary",
        status: "active",
        _id: { $ne: id }, // Exclude current document
      });

      if (existingOfficerPrimary) {
        return NextResponse.json(
          { success: false, error: "الضابط لديه تعيين أساسي نشط بالفعل" },
          { status: 409 },
        );
      }

      // Check if another officer has an active primary assignment for the same position title
      const existingTitlePrimary = await PositionAssignment.findOne({
        positionTitle: data.positionTitle || position.positionTitle,
        positionType: "primary",
        status: "active",
        officerId: { $ne: data.officerId || position.officerId }, // Not the same officer
        _id: { $ne: id }, // Exclude current document
      });

      if (existingTitlePrimary) {
        return NextResponse.json(
          { success: false, error: "هذه الوظيفة مشغولة بالفعل بصفة أساسية من قبل ضابط آخر" },
          { status: 409 },
        );
      }
    }

    // 7. Validate status transition if status is being changed
    if (data.status && data.status !== position.status) {
      const allowedNext = VALID_STATUS_TRANSITIONS[position.status as PositionStatus];
      if (!allowedNext || !allowedNext.includes(data.status as PositionStatus)) {
        return NextResponse.json(
          {
            success: false,
            error: `لا يمكن تحويل الحالة من "${position.status}" إلى "${data.status}"`,
          },
          { status: 400 },
        );
      }
    }

    // 8. Apply updates
    if (data.officerId !== undefined) position.officerId = data.officerId;
    if (data.positionTitle !== undefined) position.positionTitle = data.positionTitle;
    if (data.positionType !== undefined) position.positionType = data.positionType;
    if (data.substituteForOfficerId !== undefined) 
      position.substituteForOfficerId = data.substituteForOfficerId || undefined;
    if (data.startDate !== undefined) position.startDate = new Date(data.startDate);
    if (data.endDate !== undefined) position.endDate = data.endDate ? new Date(data.endDate) : undefined;
    if (data.orderNumber !== undefined) position.orderNumber = data.orderNumber;
    if (data.notes !== undefined) position.notes = data.notes;
    if (data.status !== undefined) position.status = data.status;
    position.updatedBy = auth.user!.id;

    await position.save();

    // 9. Audit
    await logAuditEvent({
      userId: auth.user!.id,
      userName: auth.user!.fullName,
      action: "UPDATE",
      module: "arkan_harb",
      targetId: id,
      description: `تم تحديث التعيين الوظيفي: ${position.positionTitle}`,
      ipAddress: ip,
    });

    // 10. Response
    return NextResponse.json({ success: true, data: { id } });
  } catch (error) {
    return handleApiError(error, "حدث خطأ أثناء تحديث التعيين الوظيفي");
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

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
    // 4. Find existing position assignment
    const position = await PositionAssignment.findById(id);
    if (!position) {
      return NextResponse.json({ success: false, error: "التعيين الوظيفي غير موجود" }, { status: 404 });
    }

    // 5. Delete position assignment
    await PositionAssignment.findByIdAndDelete(id);

    // 6. Audit
    const officer = await Officer.findById(position.officerId).select("rank fullName").lean();
    const officerDisplayName = officer 
      ? `${RANK_LABELS[officer.rank as OfficerRank]} / ${officer.fullName}` 
      : position.officerId;

    await logAuditEvent({
      userId: auth.user!.id,
      userName: auth.user!.fullName,
      action: "DELETE",
      module: "arkan_harb",
      targetId: id,
      description: `تم حذف التعيين الوظيفي: ${position.positionTitle} للضابط: ${officerDisplayName}`,
      ipAddress: ip,
    });

    // 7. Response
    return NextResponse.json({ success: true, data: { id } });
  } catch (error) {
    return handleApiError(error, "حدث خطأ أثناء حذف التعيين الوظيفي");
  }
}