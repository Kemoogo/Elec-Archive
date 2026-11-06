import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db/connect";
import { authenticate } from "@/lib/auth/middleware";
import { logAuditEvent } from "@/lib/auth/audit";
import { errors } from "@/lib/auth/errors";
import { Fax } from "@/lib/db/models/Fax";
import { faxListQuerySchema } from "@/lib/validations/fax";
import { buildFaxListSort } from "@/lib/fax/queries";
import { escapeRegex } from "@/lib/utils";
import { handleApiError } from "@/lib/utils/api-error";
import { checkApiRateLimit, rateLimitErrorResponse } from "@/lib/security/rate-limit";
import { hasModuleAccess } from "@/lib/auth/rbac";
import type { Types } from "mongoose";

export async function GET(request: Request) {
  const auth = await authenticate();
  if (!auth.success) {
    return NextResponse.json(
      { success: false, error: auth.error },
      { status: auth.status },
    );
  }

  if (!hasModuleAccess(auth.user, "fax", "view")) {
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

  await connectToDatabase();

  try {
    const { searchParams } = new URL(request.url);
    const params = Object.fromEntries(searchParams.entries());

    const parsed = faxListQuerySchema.safeParse(params);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: errors.validationFailed, details: parsed.error.issues },
        { status: 400 },
      );
    }

    const { page, limit, status, search, dateFrom, dateTo, sort, forwardedToMe } = parsed.data;

    const query: Record<string, unknown> = {};

    if (status) {
      query.status = status;
    }

    const trimmedSearch = search?.trim();
    if (trimmedSearch && trimmedSearch.length >= 2) {
      const escapedSearch = escapeRegex(trimmedSearch);
      const searchRegex = { $regex: escapedSearch, $options: "i" };
      query.$or = [
        { faxNumber: searchRegex },
        { subject: searchRegex },
        { fromEntity: searchRegex },
      ];
    }

    if (dateFrom || dateTo) {
      const dateQuery: Record<string, Date> = {};
      if (dateFrom) dateQuery.$gte = new Date(dateFrom);
      if (dateTo) dateQuery.$lte = new Date(dateTo);
      query.date = dateQuery;
    }

    if (forwardedToMe) {
      const forwardedCondition = {
        $or: [
          { forwardedToId: auth.user!.id, status: "forwarded" },
          { forwardedToDepartment: auth.user!.department, status: "forwarded" },
        ],
      };
      if (query.$or) {
        query.$and = [{ $or: query.$or }, forwardedCondition];
        delete query.$or;
      } else {
        query.$and = [forwardedCondition];
      }
    }

    const sortObj = buildFaxListSort(sort);
    const skip = (page - 1) * limit;

    const [faxes, total] = await Promise.all([
      Fax.find(query)
        .sort(sortObj)
        .skip(skip)
        .limit(limit)
        .populate("uploadedBy", "fullName")
        .lean(),
      Fax.countDocuments(query),
    ]);

    await logAuditEvent({
      userId: auth.user!.id,
      userName: auth.user!.fullName,
      action: "VIEW",
      module: "fax",
      description: `عرض قائمة الفاكسات (صفحة ${page})`,
      ipAddress: ip,
    });

    const serializedFaxes = faxes.map((fax) => ({
      _id: (fax._id as Types.ObjectId).toString(),
      faxNumber: fax.faxNumber,
      date: (fax.date as Date).toISOString(),
      fromEntity: fax.fromEntity,
      subject: fax.subject,
      status: fax.status,
      uploadedBy: {
        _id: (fax.uploadedBy as { _id: Types.ObjectId; fullName: string })._id.toString(),
        fullName: (fax.uploadedBy as { _id: Types.ObjectId; fullName: string }).fullName,
      },
      createdAt: (fax.createdAt as Date).toISOString(),
    }));

    const totalPages = Math.ceil(total / limit);

    return NextResponse.json({
      success: true,
      data: {
        faxes: serializedFaxes,
        pagination: { page, limit, total, totalPages },
      },
    });
  } catch (error) {
    return handleApiError(error, "حدث خطأ أثناء تحميل الفاكسات");
  }
}

export async function POST(request: Request) {
  const auth = await authenticate();
  if (!auth.success) {
    return NextResponse.json(
      { success: false, error: auth.error },
      { status: auth.status },
    );
  }

  if (!hasModuleAccess(auth.user, "fax", "edit")) {
    return NextResponse.json(
      { success: false, error: errors.insufficientPermissions },
      { status: 403 },
    );
  }

  const ip = request.headers.get("x-forwarded-for") ?? "";
  const rl = checkApiRateLimit(auth.user!.id, ip, "upload");
  if (!rl.allowed) {
    return NextResponse.json(rateLimitErrorResponse(rl.resetAt), { status: 429 });
  }

  await connectToDatabase();

  try {
    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json(
        { success: false, error: "الملف مطلوب" },
        { status: 400 },
      );
    }

    const { saveFaxFile } = await import("@/lib/uploads");
    const uploadResult = await saveFaxFile(file);
    if (!uploadResult.success) {
      return NextResponse.json(
        { success: false, error: uploadResult.error },
        { status: 400 },
      );
    }

    const body = {
      faxNumber: formData.get("faxNumber") as string,
      date: formData.get("date") as string,
      fromEntity: formData.get("fromEntity") as string,
      toEntity: formData.get("toEntity") as string,
      subject: formData.get("subject") as string,
      relatedFaxId: (formData.get("relatedFaxId") as string) ?? undefined,
    };

    const { createFaxSchema } = await import("@/lib/validations/fax");
    const parsed = createFaxSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: errors.validationFailed, details: parsed.error.issues },
        { status: 400 },
      );
    }

    const { faxNumber, date, fromEntity, toEntity, subject, relatedFaxId } = parsed.data;

    const existingFax = await Fax.findOne({
      faxNumber: faxNumber.trim(),
      date: new Date(date),
    });

    if (existingFax) {
      return NextResponse.json(
        {
          success: false,
          error: "يوجد فاكس بنفس الرقم في هذا التاريخ. يجب أن يكون رقم الفاكس فريدًا ضمن نفس التاريخ.",
        },
        { status: 400 },
      );
    }

    const isPdf = file.type === "application/pdf";
    const fileType = isPdf ? "pdf" : "image";

    const faxData: Record<string, unknown> = {
      faxNumber: faxNumber.trim(),
      date: new Date(date),
      fromEntity: fromEntity.trim(),
      toEntity: toEntity.trim(),
      subject: subject.trim(),
      fileUrl: uploadResult.filePath,
      fileType,
      status: "pending",
      uploadedBy: auth.user!.id,
    };

    if (relatedFaxId) {
      faxData.relatedFaxes = [relatedFaxId];
    }

    const fax = await Fax.create(faxData);

    if (relatedFaxId) {
      await Fax.findByIdAndUpdate(relatedFaxId, {
        $addToSet: { relatedFaxes: fax._id },
      });
    }

    const { createNotificationForCommanders } = await import("@/lib/notifications/createNotification");
    await createNotificationForCommanders({
      type: "new_fax",
      title: "فاكس جديد",
      body: `تم رفع فاكس جديد رقم ${faxNumber} من ${fromEntity} — ${subject}`,
      refId: fax._id.toString(),
      refModel: "Fax",
    });

    await logAuditEvent({
      userId: auth.user!.id,
      userName: auth.user!.fullName,
      action: "CREATE",
      module: "fax",
      targetId: fax._id.toString(),
      description: `تم رفع فاكس جديد رقم ${faxNumber} من ${fromEntity}`,
      ipAddress: ip,
    });

    return NextResponse.json(
      {
        success: true,
        data: {
          _id: fax._id.toString(),
          faxNumber: fax.faxNumber,
          date: fax.date.toISOString(),
          fromEntity: fax.fromEntity,
          toEntity: fax.toEntity,
          subject: fax.subject,
          fileUrl: fax.fileUrl,
          fileType: fax.fileType,
          status: fax.status,
          uploadedBy: fax.uploadedBy.toString(),
          relatedFaxes: fax.relatedFaxes.map((id: { toString: () => string }) => id.toString()),
          createdAt: fax.createdAt.toISOString(),
        },
      },
      { status: 201 },
    );
  } catch (error) {
    if (
      error instanceof Error &&
      "code" in error &&
      (error as { code: number }).code === 11000
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "يوجد فاكس بنفس الرقم في هذا التاريخ. يجب أن يكون رقم الفاكس فريدًا ضمن نفس التاريخ.",
        },
        { status: 400 },
      );
    }

    return handleApiError(error, "حدث خطأ أثناء رفع الفاكس");
  }
}
