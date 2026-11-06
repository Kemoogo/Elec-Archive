import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db/connect";
import { authenticate } from "@/lib/auth/middleware";
import { logAuditEvent } from "@/lib/auth/audit";
import { errors } from "@/lib/auth/errors";
import { Fax } from "@/lib/db/models/Fax";
import { handleApiError } from "@/lib/utils/api-error";
import { checkApiRateLimit, rateLimitErrorResponse } from "@/lib/security/rate-limit";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(request: Request, { params }: RouteParams) {
  const auth = await authenticate();
  if (!auth.success) {
    return NextResponse.json(
      { success: false, error: auth.error },
      { status: auth.status },
    );
  }

  const faxPermission = auth.user!.permissions.fax;
  if (faxPermission === "none") {
    return NextResponse.json(
      { success: false, error: errors.insufficientPermissions },
      { status: 403 },
    );
  }

  const ip = request.headers.get("x-forwarded-for") ?? "";
  const rl = checkApiRateLimit(auth.user!.id, ip, "read");
  if (!rl.allowed) {
    return NextResponse.json(rateLimitErrorResponse(rl.resetAt), { status: 429 });
  }

  try {
    await connectToDatabase();

    const { id } = await params;

    const fax = await Fax.findById(id)
      .populate("uploadedBy", "fullName")
      .populate("forwardedToId", "fullName")
      .populate("closedBy", "fullName")
      .populate("relatedFaxes", "faxNumber date subject status")
      .lean();

    if (!fax) {
      return NextResponse.json(
        { success: false, error: "الفاكس غير موجود" },
        { status: 404 },
      );
    }

    await logAuditEvent({
      userId: auth.user!.id,
      userName: auth.user!.fullName,
      action: "VIEW",
      module: "fax",
      targetId: id,
      description: `عرض تفاصيل الفاكس رقم ${fax.faxNumber}`,
      ipAddress: ip,
    });

    const populatedUploadedBy = fax.uploadedBy as { _id: { toString(): string }; fullName: string } | null | undefined;
    const populatedForwardedTo = fax.forwardedToId as { _id: { toString(): string }; fullName: string } | null;
    const populatedClosedBy = fax.closedBy as { _id: { toString(): string }; fullName: string } | null;
    const populatedRelated = (fax.relatedFaxes ?? []) as Array<{ _id: { toString(): string }; faxNumber: string; date: Date; subject: string; status: string }>;

    return NextResponse.json({
      success: true,
      data: {
        _id: (fax._id as { toString(): string }).toString(),
        faxNumber: fax.faxNumber,
        date: (fax.date as Date).toISOString(),
        fromEntity: fax.fromEntity,
        toEntity: fax.toEntity,
        subject: fax.subject,
        fileUrl: fax.fileUrl,
        fileType: fax.fileType,
        status: fax.status,
        commanderDecision: fax.commanderDecision ?? null,
        commanderDecisionAt: fax.commanderDecisionAt ? (fax.commanderDecisionAt as Date).toISOString() : null,
        forwardedToType: fax.forwardedToType ?? null,
        forwardedToId: populatedForwardedTo
          ? { _id: populatedForwardedTo._id.toString(), fullName: populatedForwardedTo.fullName }
          : null,
        forwardedToDepartment: fax.forwardedToDepartment ?? null,
        closedBy: populatedClosedBy
          ? { _id: populatedClosedBy._id.toString(), fullName: populatedClosedBy.fullName }
          : null,
        closedAt: fax.closedAt ? (fax.closedAt as Date).toISOString() : null,
        relatedFaxes: populatedRelated.map((r) => ({
          _id: r._id.toString(),
          faxNumber: r.faxNumber,
          date: (r.date as Date).toISOString(),
          subject: r.subject,
          status: r.status,
        })),
        uploadedBy: populatedUploadedBy ? {
          _id: populatedUploadedBy._id?.toString() ?? "",
          fullName: populatedUploadedBy.fullName ?? "مستخدم محذوف",
        } : null,
        createdAt: (fax.createdAt as Date).toISOString(),
        updatedAt: (fax.updatedAt as Date).toISOString(),
      },
    });
  } catch (error) {
    return handleApiError(error, "حدث خطأ أثناء تحميل الفاكس");
  }
}
