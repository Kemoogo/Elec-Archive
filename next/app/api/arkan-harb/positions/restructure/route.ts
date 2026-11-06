import { NextResponse } from "next/server";
import { Types } from "mongoose";
import { connectToDatabase } from "@/lib/db/connect";
import { authenticate } from "@/lib/auth/middleware";
import { canEditModule } from "@/lib/auth/authorization";
import { logAuditEvent } from "@/lib/auth/audit";
import { errors } from "@/lib/auth/errors";
import { PositionAssignment } from "@/lib/db/models/PositionAssignment";
import { handleApiError } from "@/lib/utils/api-error";
import { checkApiRateLimit, rateLimitErrorResponse } from "@/lib/security/rate-limit";
import { z } from "zod";

const restructurePayloadSchema = z.object({
  positionIdsToVacate: z.array(z.string()).min(1, "يجب تحديد وظيفة واحدة على الأقل لإخلائها"),
});

export async function POST(request: Request) {
  const auth = await authenticate();
  if (!auth.success) return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });

  if (!canEditModule(auth.user!, "arkan_harb") && !canEditModule(auth.user!, "officers")) {
    return NextResponse.json({ success: false, error: errors.insufficientPermissions }, { status: 403 });
  }

  const ip = request.headers.get("x-forwarded-for") ?? "";
  const rl = checkApiRateLimit(auth.user!.id, ip, "write");
  if (!rl.allowed) return NextResponse.json(rateLimitErrorResponse(rl.resetAt), { status: 429 });

  await connectToDatabase();

  try {
    const body: unknown = await request.json();
    const parsed = restructurePayloadSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: errors.validationFailed, details: parsed.error.issues }, { status: 400 });
    }

    const { positionIdsToVacate } = parsed.data;

    const now = new Date();
    const result = await PositionAssignment.updateMany(
      { _id: { $in: positionIdsToVacate } },
      {
        $set: {
          primaryOfficerId: null,
          primaryStartDate: null,
          substituteOfficerIds: [],
          substituteStartDates: [],
          "assignmentHistory.$[elem].endDate": now,
          "assignmentHistory.$[elem].notes": "إخلاء ضمن إعادة الهيكلة الشاملة للوظائف",
          updatedBy: new Types.ObjectId(auth.user!.id),
        },
      },
      { arrayFilters: [{ "elem.endDate": null }] }
    );

    const count = result.modifiedCount;

    await logAuditEvent({
      userId: auth.user!.id,
      userName: auth.user!.fullName,
      action: "UPDATE",
      module: "arkan_harb",
      targetId: auth.user!.id,
      description: `تم إخلاء وإعادة هيكلة (${count}) وظيفة/وظائف تنظيمية مع استثناء الوظائف المستبعدة`,
      ipAddress: ip,
    });

    return NextResponse.json({
      success: true,
      message: `تم إخلاء ${count} وظيفة بنجاح`,
      count,
    });
  } catch (error) {
    return handleApiError(error, "حدث خطأ أثناء تنفيذ عملية إعادة الهيكلة الشاملة");
  }
}
