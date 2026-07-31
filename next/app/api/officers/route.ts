import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db/connect";
import { authenticate } from "@/lib/auth/middleware";
import { logAuditEvent } from "@/lib/auth/audit";
import { errors } from "@/lib/auth/errors";
import { handleApiError } from "@/lib/utils/api-error";
import { Officer } from "@/lib/db/models/Officer";
import { canViewOfficers, canEditOfficers } from "@/lib/officers/access";
import { serializeOfficerListItem } from "@/lib/officers/queries";
import { officersListQuerySchema, createOfficerSchema } from "@/lib/validations/officers";
import { checkOfficersRateLimit, rateLimitErrorResponse } from "@/lib/security/rate-limit";
import { escapeRegex } from "@/lib/utils";

export async function GET(request: Request) {
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

  try {
    await connectToDatabase();

    const { searchParams } = new URL(request.url);
    const params = Object.fromEntries(searchParams.entries());
    const parsed = officersListQuerySchema.safeParse(params);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: errors.validationFailed, details: parsed.error.issues },
        { status: 400 },
      );
    }

    const { page, limit, status, search } = parsed.data;

    const query: Record<string, unknown> = {};
    if (status) {
      if (status === "active") {
        query.isInUnit = true;
      } else {
        query.isInUnit = false;
        query.employmentStatus = status; // Keep for backward compat if needed
      }
    }
    if (search) {
      const escapedSearch = escapeRegex(search);
      const searchRegex = { $regex: escapedSearch, $options: "i" };
      query.$or = [
        { fullName: searchRegex },
        { militaryId: searchRegex },
        { seniorityNumber: searchRegex },
        { nationalId: searchRegex },
        { phone: searchRegex },
        { batch: searchRegex },
        { position: searchRegex },
        { unit: searchRegex },
      ];
    }

    const skip = (page - 1) * limit;
    const [officers, total] = await Promise.all([
      Officer.find(query)
        .collation({ locale: "en", numericOrdering: true })
        .sort({ seniorityNumber: 1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Officer.countDocuments(query),
    ]);

    await logAuditEvent({
      userId: auth.user!.id,
      userName: auth.user!.fullName,
      action: "VIEW",
      module: "officers",
      description: `عرض قائمة الضباط (صفحة ${page})`,
      ipAddress: ip,
    });

    const serialized = officers.map((o) =>
      serializeOfficerListItem(o as Parameters<typeof serializeOfficerListItem>[0]),
    );

    return NextResponse.json({
      success: true,
      data: {
        items: serialized,
        total,
        page,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      },
    });
  } catch (error) {
    return handleApiError(error);
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

  try {
    const body = await request.json();
    const parsed = createOfficerSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: errors.validationFailed, details: parsed.error.issues },
        { status: 400 },
      );
    }

    const data = parsed.data;

    const existing = await Officer.findOne({ seniorityNumber: data.seniorityNumber });
    if (existing) {
      if (existing.employmentStatus !== "active") {
        return NextResponse.json(
          {
            success: false,
            error: "ضابط سابق بهذا رقم الأقدمية",
            data: {
              existingId: existing._id.toString(),
              fullName: existing.fullName,
              rank: existing.rank,
              employmentStatus: existing.employmentStatus,
            },
          },
          { status: 200 },
        );
      }
      return NextResponse.json(
        { success: false, error: "رقم الأقدمية مسجل بالفعل لضابط بالوحدة" },
        { status: 409 },
      );
    }

    const officer = await Officer.create({
      militaryId: data.militaryId,
      seniorityNumber: data.seniorityNumber,
      fullName: data.fullName,
      rank: data.rank,
      unit: data.unit,
      position: data.position,
      batch: data.batch,
      type: data.type,
      weapon: data.weapon,
      phone: data.phone,
      nationalId: data.nationalId,
      employmentStatus: data.employmentStatus,
      isInUnit: true,
      joinDate: data.joinDate ? new Date(data.joinDate) : new Date(),
      birthDate: data.birthDate ? new Date(data.birthDate) : undefined,
      file121Url: data.file121Url,
      isArkanHarb: data.isArkanHarb,
    });

    // Create initial join movement record
    const { ServiceHistory } = await import("@/lib/db/models/ServiceHistory");
    await ServiceHistory.create({
      officerId: officer._id,
      type: "join",
      action: "join",
      date: officer.joinDate,
      createdBy: auth.user!.id,
      updatedBy: auth.user!.id,
    });

    await logAuditEvent({
      userId: auth.user!.id,
      userName: auth.user!.fullName,
      action: "CREATE",
      module: "officers",
      targetId: officer._id.toString(),
      description: `تم إنشاء ضابط جديد: ${data.fullName} (${data.militaryId})`,
      ipAddress: ip,
    });

    return NextResponse.json(
      {
        success: true,
        data: {
          id: officer._id.toString(),
          militaryId: officer.militaryId,
          fullName: officer.fullName,
          rank: officer.rank,
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
        { success: false, error: "الرقم العسكري موجود مسبقاً" },
        { status: 409 },
      );
    }

    return handleApiError(error);
  }
}
