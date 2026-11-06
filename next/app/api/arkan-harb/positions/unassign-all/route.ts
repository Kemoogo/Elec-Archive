import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db/connect";
import { authenticate } from "@/lib/auth/middleware";
import { hasModuleAccess } from "@/lib/auth/rbac";
import { logAuditEvent } from "@/lib/auth/audit";
import { errors } from "@/lib/auth/errors";
import { PositionAssignment } from "@/lib/db/models/PositionAssignment";
import { handleApiError } from "@/lib/utils/api-error";
import { checkApiRateLimit, rateLimitErrorResponse } from "@/lib/security/rate-limit";
import { Types } from "mongoose";

export async function POST(request: Request) {
  const auth = await authenticate();
  if (!auth.success) return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });

  if (!hasModuleAccess(auth.user, "arkan_harb", "edit") && !hasModuleAccess(auth.user, "officers", "edit")) {
    return NextResponse.json({ success: false, error: errors.insufficientPermissions }, { status: 403 });
  }

  const ip = request.headers.get("x-forwarded-for") ?? "";
  const rl = checkApiRateLimit(auth.user!.id, ip, "write");
  if (!rl.allowed) return NextResponse.json(rateLimitErrorResponse(rl.resetAt), { status: 429 });

  await connectToDatabase();

  try {
    const now = new Date();
    const result = await PositionAssignment.updateMany(
      {
        $or: [
          { primaryOfficerId: { $ne: null } },
          { substituteOfficerIds: { $exists: true, $not: { $size: 0 } } },
        ],
      },
      {
        $set: {
          "assignmentHistory.$[activeElem].endDate": now,
          "assignmentHistory.$[activeElem].notes": "إلغاء التكليف وإخلاء الوظيفة",
          primaryOfficerId: null,
          primaryStartDate: null,
          substituteOfficerIds: [],
          substituteStartDates: [],
          updatedBy: new Types.ObjectId(auth.user!.id),
        },
      },
      {
        arrayFilters: [{ "activeElem.endDate": null }],
      }
    );

    const unassignedCount = result.modifiedCount;

    const primaryTargetId = auth.user!.id;

    await logAuditEvent({
      userId: auth.user!.id,
      userName: auth.user!.fullName,
      action: "UPDATE",
      module: "arkan_harb",
      targetId: primaryTargetId,
      description: `تم تفريغ وإلغاء التكليف لجميع الوظائف في الهيكل التنظيمي لأركان حرب (${unassignedCount} وظيفة)`,
      ipAddress: ip,
    });

    return NextResponse.json({
      success: true,
      message: `تم إلغاء التكليف لجميع الوظائف بنجاح (${unassignedCount} وظيفة)`,
      data: { count: unassignedCount },
    });
  } catch (error) {
    return handleApiError(error, "حدث خطأ أثناء إلغاء التكليفات");
  }
}
