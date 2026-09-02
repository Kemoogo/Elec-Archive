import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db/connect";
import { authenticate } from "@/lib/auth/middleware";
import { canEditModule } from "@/lib/auth/authorization";
import { logAuditEvent } from "@/lib/auth/audit";
import { errors } from "@/lib/auth/errors";
import { PositionAssignment } from "@/lib/db/models/PositionAssignment";
import { handleApiError } from "@/lib/utils/api-error";
import { checkApiRateLimit, rateLimitErrorResponse } from "@/lib/security/rate-limit";

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
    const positions = await PositionAssignment.find({
      $or: [
        { primaryOfficerId: { $ne: null } },
        { substituteOfficerIds: { $exists: true, $ne: [] } },
      ],
    });

    const now = new Date();
    let unassignedCount = 0;

    for (const position of positions) {
      // Close open history entries
      for (const history of position.assignmentHistory || []) {
        if (!history.endDate) {
          history.endDate = now;
        }
      }

      position.primaryOfficerId = null;
      position.primaryStartDate = null;
      position.substituteOfficerIds = [];
      position.updatedBy = auth.user!.id;
      await position.save();
      unassignedCount++;
    }

    await logAuditEvent({
      userId: auth.user!.id,
      userName: auth.user!.fullName,
      action: "UPDATE",
      module: "arkan_harb",
      description: `تم تفريغ وإلغاء التكليف للجميع لعدد ${unassignedCount} وظيفة في الهيكل الإداري`,
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
