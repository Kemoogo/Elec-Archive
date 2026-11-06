import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db/connect";
import { authenticate } from "@/lib/auth/middleware";
import { logAuditEvent } from "@/lib/auth/audit";
import { errors } from "@/lib/auth/errors";
import { handleApiError } from "@/lib/utils/api-error";
import { Officer, RANK_LABELS, type OfficerRank } from "@/lib/db/models/Officer";
import { canViewOfficers, canEditOfficers } from "@/lib/officers/access";
import { serializeOfficerDetail } from "@/lib/officers/queries";
import { patchOfficerSchema } from "@/lib/validations/officers";
import { checkOfficersRateLimit, rateLimitErrorResponse } from "@/lib/security/rate-limit";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await authenticate();
  if (!auth.success) {
    return NextResponse.json(
      { success: false, error: auth.error },
      { status: auth.status },
    );
  }

  if (!canViewOfficers(auth.user!)) {
    return NextResponse.json(
      { success: false, error: errors.insufficientPermissions },
      { status: 403 },
    );
  }

  const ip = request.headers.get("x-forwarded-for") ?? "";
  const rl = checkOfficersRateLimit(auth.user!.id, ip, "read");
  if (!rl.allowed) {
    return NextResponse.json(rateLimitErrorResponse(rl.resetAt), { status: 429 });
  }

  await connectToDatabase();

  const { id } = await params;
  const officer = await Officer.findById(id).lean();
  if (!officer) {
    return NextResponse.json(
      { success: false, error: "الضابط غير موجود" },
      { status: 404 },
    );
  }

  await logAuditEvent({
    userId: auth.user!.id,
    userName: auth.user!.fullName,
    action: "VIEW",
    module: "officers",
    targetId: id,
    description: `عرض ملف الضابط: ${RANK_LABELS[officer.rank as OfficerRank]} / ${officer.fullName}`,
    ipAddress: ip,
  });

  return NextResponse.json({
    success: true,
    data: serializeOfficerDetail(officer as Parameters<typeof serializeOfficerDetail>[0]),
  });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await authenticate();
  if (!auth.success) {
    return NextResponse.json(
      { success: false, error: auth.error },
      { status: auth.status },
    );
  }

  if (!canEditOfficers(auth.user!)) {
    return NextResponse.json(
      { success: false, error: errors.insufficientPermissions },
      { status: 403 },
    );
  }

  const ip = request.headers.get("x-forwarded-for") ?? "";
  const rl = checkOfficersRateLimit(auth.user!.id, ip, "write");
  if (!rl.allowed) {
    return NextResponse.json(rateLimitErrorResponse(rl.resetAt), { status: 429 });
  }

  await connectToDatabase();

  const { id } = await params;
  const officer = await Officer.findById(id);
  if (!officer) {
    return NextResponse.json(
      { success: false, error: "الضابط غير موجود" },
      { status: 404 },
    );
  }

  try {
    const body = await request.json();
    const parsed = patchOfficerSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: errors.validationFailed, details: parsed.error.issues },
        { status: 400 },
      );
    }

    const data = parsed.data;

    if (data.fullName !== undefined) officer.fullName = data.fullName;
    if (data.rank !== undefined) officer.rank = data.rank;
    if (data.unit !== undefined) officer.unit = data.unit;
    if (data.position !== undefined) officer.position = data.position;
    if (data.batch !== undefined) officer.batch = data.batch;
    if (data.type !== undefined) officer.type = data.type;
    if (data.weapon !== undefined) officer.weapon = data.weapon;
    if (data.phone !== undefined) officer.phone = data.phone;
    if (data.nationalId !== undefined) officer.nationalId = data.nationalId;
    if (data.employmentStatus !== undefined) officer.employmentStatus = data.employmentStatus;
    if (data.defaultLeaveSystem !== undefined) officer.defaultLeaveSystem = data.defaultLeaveSystem;
    if (data.isInUnit !== undefined) {
      const oldStatus = officer.isInUnit;
      officer.isInUnit = data.isInUnit;
      
      // If status changed, create a movement history record
      if (oldStatus !== data.isInUnit && body.movement) {
        const { ServiceHistory } = await import("@/lib/db/models/ServiceHistory");
        await ServiceHistory.create({
          officerId: id,
          type: data.isInUnit ? "return" : "leave",
          action: body.movement.action || (data.isInUnit ? "return" : "transfer"),
          date: new Date(body.movement.date || Date.now()),
          notes: body.movement.notes,
          createdBy: auth.user!.id,
          updatedBy: auth.user!.id,
        });
      }

      // If officer leaves the unit, automatically vacate them from any active position assignments
      if (data.isInUnit === false) {
        const { PositionAssignment } = await import("@/lib/db/models/PositionAssignment");
        const departureDate = new Date(body.movement?.date || Date.now());

        // 1. Vacate primary positions
        await PositionAssignment.updateMany(
          { primaryOfficerId: id },
          {
            $set: {
              primaryOfficerId: null,
              primaryStartDate: null,
              "assignmentHistory.$[elem].endDate": departureDate,
              "assignmentHistory.$[elem].notes": "تم إخلاء المنصب لمغادرة الضابط الوحدة",
              updatedBy: auth.user!.id,
            },
          },
          { arrayFilters: [{ "elem.officerId": id, "elem.role": "primary", "elem.endDate": null }] }
        );

        // 2. Remove from substitute positions
        await PositionAssignment.updateMany(
          { substituteOfficerIds: id },
          {
            $pull: {
              substituteOfficerIds: id,
              substituteStartDates: { officerId: id },
            },
            $set: {
              "assignmentHistory.$[elem].endDate": departureDate,
              "assignmentHistory.$[elem].notes": "تم إلغاء التكليف كبديل لمغادرة الضابط الوحدة",
              updatedBy: auth.user!.id,
            },
          },
          { arrayFilters: [{ "elem.officerId": id, "elem.role": "substitute", "elem.endDate": null }] }
        );
      }
    }
    if (data.joinDate !== undefined) officer.joinDate = new Date(data.joinDate);
    if (data.birthDate !== undefined) officer.birthDate = data.birthDate ? new Date(data.birthDate) : undefined;
    if (data.graduationDate !== undefined) officer.graduationDate = data.graduationDate ? new Date(data.graduationDate) : undefined;
    if (data.bloodType !== undefined) officer.bloodType = data.bloodType;
    if (data.religion !== undefined) officer.religion = data.religion;
    if (data.maritalStatus !== undefined) officer.maritalStatus = data.maritalStatus;
    if (data.faculty !== undefined) officer.faculty = data.faculty;
    if (data.file121Url !== undefined) officer.file121Url = data.file121Url;
    if (data.file121IssueDate !== undefined) officer.file121IssueDate = data.file121IssueDate;
    if (data.isArkanHarb !== undefined) officer.isArkanHarb = data.isArkanHarb;

    await officer.save();

    await logAuditEvent({
      userId: auth.user!.id,
      userName: auth.user!.fullName,
      action: "UPDATE",
      module: "officers",
      targetId: id,
      description: `تحديث بيانات الضابط: ${RANK_LABELS[officer.rank as OfficerRank]} / ${officer.fullName}`,
      ipAddress: ip,
    });

    return NextResponse.json({
      success: true,
      data: serializeOfficerDetail(officer.toObject() as Parameters<typeof serializeOfficerDetail>[0]),
    });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await authenticate();
  if (!auth.success) {
    return NextResponse.json(
      { success: false, error: auth.error },
      { status: auth.status },
    );
  }

  if (!canEditOfficers(auth.user!)) {
    return NextResponse.json(
      { success: false, error: errors.insufficientPermissions },
      { status: 403 },
    );
  }

  const ip = request.headers.get("x-forwarded-for") ?? "";
  const rl = checkOfficersRateLimit(auth.user!.id, ip, "write");
  if (!rl.allowed) {
    return NextResponse.json(rateLimitErrorResponse(rl.resetAt), { status: 429 });
  }

  await connectToDatabase();

  const { id } = await params;
  const officer = await Officer.findByIdAndDelete(id);
  if (!officer) {
    return NextResponse.json(
      { success: false, error: "الضابط غير موجود" },
      { status: 404 },
    );
  }

  await logAuditEvent({
    userId: auth.user!.id,
    userName: auth.user!.fullName,
    action: "DELETE",
    module: "officers",
    targetId: id,
    description: `حذف الضابط: ${RANK_LABELS[officer.rank as OfficerRank]} / ${officer.fullName}`,
    ipAddress: ip,
  });

  return NextResponse.json({ success: true });
}

