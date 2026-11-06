import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db/connect";
import { authenticate } from "@/lib/auth/middleware";
import { canEditModule } from "@/lib/auth/authorization";
import { logAuditEvent } from "@/lib/auth/audit";
import { errors } from "@/lib/auth/errors";
import { Fax } from "@/lib/db/models/Fax";
import { Officer } from "@/lib/db/models/Officer";
import { Mission } from "@/lib/db/models/Mission";
import { convertFaxToMissionSchema } from "@/lib/validations/arkan-harb";
import { handleApiError } from "@/lib/utils/api-error";
import { checkApiRateLimit, rateLimitErrorResponse } from "@/lib/security/rate-limit";

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

  const user = auth.user!;
  const hasAccess =
    user.role === "admin" ||
    user.role === "commander" ||
    (canEditModule(user, "fax") && canEditModule(user, "arkan_harb"));

  if (!hasAccess) {
    return NextResponse.json(
      { success: false, error: errors.insufficientPermissions },
      { status: 403 },
    );
  }

  const ip = request.headers.get("x-forwarded-for") ?? "";
  const rl = checkApiRateLimit(user.id, ip, "write");
  if (!rl.allowed) {
    return NextResponse.json(rateLimitErrorResponse(rl.resetAt), { status: 429 });
  }

  try {
    await connectToDatabase();

    const { id } = await params;
    const fax = await Fax.findById(id);
    if (!fax) {
      return NextResponse.json(
        { success: false, error: "الفاكس غير موجود" },
        { status: 404 },
      );
    }

    const body = await request.json();
    const parsed = convertFaxToMissionSchema.parse(body);

    const officer = await Officer.findById(parsed.officerId);
    if (!officer) {
      return NextResponse.json(
        { success: false, error: "الضابط المحدد غير موجود" },
        { status: 404 },
      );
    }

    if (!officer.isInUnit || officer.employmentStatus !== "active") {
      return NextResponse.json(
        { success: false, error: "لا يمكن تكليف ضابط منقول أو خارج الخدمة بالوحدة بمأمورية" },
        { status: 400 },
      );
    }

    // Generate military travel order number if not specified
    const orderYear = new Date(parsed.startDate).getFullYear();
    const randomSeq = Math.floor(100 + Math.random() * 900);
    const travelOrderNum =
      parsed.travelOrderNumber || `ت ح / ${orderYear} / ${randomSeq}`;

    const mission = await Mission.create({
      officerId: officer._id,
      missionType: parsed.missionType,
      title: parsed.title,
      description: parsed.description || `بناءً على الفاكس الوارد رقم ${fax.faxNumber}`,
      destination: parsed.destination || fax.fromEntity,
      startDate: new Date(parsed.startDate),
      endDate: parsed.endDate ? new Date(parsed.endDate) : null,
      status: "scheduled",
      linkedFax: fax._id,
      linkedFaxId: fax.faxNumber,
      referenceLetterNumber: fax.faxNumber,
      travelOrderNumber: travelOrderNum,
      transportationMean: parsed.transportationMean || "سيارة تابعة للوحدة",
      authorizedWeapons: parsed.authorizedWeapons || "بدون سلاح",
      createdBy: user.id,
      updatedBy: user.id,
    });

    await logAuditEvent({
      userId: user.id,
      userName: user.fullName || user.username,
      action: "CREATE",
      module: "arkan_harb",
      targetId: mission._id.toString(),
      description: `تحويل الفاكس رقم ${fax.faxNumber} إلى مأمورية للضابط ${officer.fullName}`,
      ipAddress: ip,
    });

    return NextResponse.json(
      {
        success: true,
        data: {
          missionId: mission._id.toString(),
          travelOrderNumber: travelOrderNum,
          linkedFaxId: fax._id.toString(),
          message: "تم تحويل الفاكس إلى مأمورية عمل بنجاح",
        },
      },
      { status: 201 },
    );
  } catch (error) {
    return handleApiError(error, "فشل تحويل الفاكس إلى مأمورية");
  }
}
