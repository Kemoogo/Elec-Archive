import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db/connect";
import { authenticate } from "@/lib/auth/middleware";
import { logAuditEvent } from "@/lib/auth/audit";
import { errors } from "@/lib/auth/errors";
import { Fax } from "@/lib/db/models/Fax";
import { linkSchema } from "@/lib/validations/fax";
import { handleApiError } from "@/lib/utils/api-error";
import { checkApiRateLimit, rateLimitErrorResponse } from "@/lib/security/rate-limit";
import type { Types } from "mongoose";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(request: Request, { params }: RouteParams) {
  const auth = await authenticate();
  if (!auth.success) {
    return NextResponse.json(
      { success: false, error: auth.error },
      { status: auth.status },
    );
  }

  if (auth.user!.permissions.fax !== "edit") {
    return NextResponse.json(
      { success: false, error: errors.insufficientPermissions },
      { status: 403 },
    );
  }

  const ip = request.headers.get("x-forwarded-for") ?? "";
  const rl = checkApiRateLimit(auth.user!.id, ip, "write");
  if (!rl.allowed) {
    return NextResponse.json(rateLimitErrorResponse(rl.resetAt), { status: 429 });
  }

  try {
    await connectToDatabase();

    const { id } = await params;

    const body = await request.json();
    const parsed = linkSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: errors.validationFailed, details: parsed.error.issues },
        { status: 400 },
      );
    }

    const { relatedFaxId } = parsed.data;

    if (relatedFaxId === id) {
      return NextResponse.json(
        { success: false, error: "لا يمكن ربط الفاكس بنفسه" },
        { status: 400 },
      );
    }

    const [sourceFax, targetFax] = await Promise.all([
      Fax.findById(id),
      Fax.findById(relatedFaxId),
    ]);

    if (!sourceFax || !targetFax) {
      return NextResponse.json(
        { success: false, error: "الفاكس غير موجود" },
        { status: 404 },
      );
    }

    const sourceRelated = sourceFax.relatedFaxes.map((oid: Types.ObjectId) => oid.toString());
    if (sourceRelated.includes(relatedFaxId)) {
      return NextResponse.json(
        { success: false, error: "الفاكسان مرتبطان مسبقاً" },
        { status: 400 },
      );
    }

    await Promise.all([
      Fax.findByIdAndUpdate(id, { $addToSet: { relatedFaxes: relatedFaxId } }),
      Fax.findByIdAndUpdate(relatedFaxId, { $addToSet: { relatedFaxes: id } }),
    ]);

    const updatedFax = await Fax.findById(id).select("relatedFaxes").lean();

    await logAuditEvent({
      userId: auth.user!.id,
      userName: auth.user!.fullName,
      action: "UPDATE",
      module: "fax",
      targetId: id,
      description: `تم ربط الفاكس رقم ${sourceFax.faxNumber} بالفاكس رقم ${targetFax.faxNumber}`,
      ipAddress: ip,
    });

    const relatedFaxes = (updatedFax?.relatedFaxes ?? []) as Types.ObjectId[];

    return NextResponse.json({
      success: true,
      data: {
        linkedFaxes: relatedFaxes.map((oid) => oid.toString()),
      },
    });
  } catch (error) {
    return handleApiError(error, "حدث خطأ أثناء ربط الفاكسات");
  }
}

export async function DELETE(request: Request, { params }: RouteParams) {
  const auth = await authenticate();
  if (!auth.success) {
    return NextResponse.json(
      { success: false, error: auth.error },
      { status: auth.status },
    );
  }

  if (auth.user!.permissions.fax !== "edit") {
    return NextResponse.json(
      { success: false, error: errors.insufficientPermissions },
      { status: 403 },
    );
  }

  const ip = request.headers.get("x-forwarded-for") ?? "";
  const rl = checkApiRateLimit(auth.user!.id, ip, "write");
  if (!rl.allowed) {
    return NextResponse.json(rateLimitErrorResponse(rl.resetAt), { status: 429 });
  }

  try {
    await connectToDatabase();

    const { id } = await params;

    const body = await request.json();
    const parsed = linkSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: errors.validationFailed },
        { status: 400 },
      );
    }

    const { relatedFaxId } = parsed.data;

    const [sourceFax, targetFax] = await Promise.all([
      Fax.findById(id),
      Fax.findById(relatedFaxId),
    ]);

    if (!sourceFax || !targetFax) {
      return NextResponse.json(
        { success: false, error: "الفاكس غير موجود" },
        { status: 404 },
      );
    }

    await Promise.all([
      Fax.findByIdAndUpdate(id, { $pull: { relatedFaxes: relatedFaxId } }),
      Fax.findByIdAndUpdate(relatedFaxId, { $pull: { relatedFaxes: id } }),
    ]);

    await logAuditEvent({
      userId: auth.user!.id,
      userName: auth.user!.fullName,
      action: "UPDATE",
      module: "fax",
      targetId: id,
      description: `تم إلغاء ربط الفاكس رقم ${sourceFax.faxNumber} من الفاكس رقم ${targetFax.faxNumber}`,
      ipAddress: ip,
    });

    return NextResponse.json({
      success: true,
      data: {
        unlinkedFaxId: relatedFaxId,
      },
    });
  } catch (error) {
    return handleApiError(error, "حدث خطأ أثناء إلغاء ربط الفاكسات");
  }
}
