import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db/connect";
import { authenticate } from "@/lib/auth/middleware";
import { canViewModule } from "@/lib/auth/authorization";
import { Leave } from "@/lib/db/models/Leave";
import { Mission } from "@/lib/db/models/Mission";
import { PositionAssignment } from "@/lib/db/models/PositionAssignment";
import { checkMissionConflictSchema } from "@/lib/validations/arkan-harb";
import { handleApiError } from "@/lib/utils/api-error";
import { formatDateDisplay } from "@/lib/utils/date-display";

export async function POST(request: Request) {
  const auth = await authenticate();
  if (!auth.success) {
    return NextResponse.json(
      { success: false, error: auth.error },
      { status: auth.status },
    );
  }

  const user = auth.user!;
  if (!canViewModule(user, "arkan_harb") && user.role !== "admin" && user.role !== "commander") {
    return NextResponse.json(
      { success: false, error: "غير مصرح لك بعرض بيانات أركان حرب" },
      { status: 403 },
    );
  }

  try {
    await connectToDatabase();

    const body = await request.json();
    const parsed = checkMissionConflictSchema.parse(body);

    const sDate = new Date(parsed.startDate);
    sDate.setHours(0, 0, 0, 0);
    const eDate = parsed.endDate ? new Date(parsed.endDate) : new Date(sDate);
    eDate.setHours(23, 59, 59, 999);

    const conflicts: Array<{
      type: "leave_overlap" | "mission_overlap" | "mandatory_position_vacant";
      severity: "blocking" | "warning";
      message: string;
    }> = [];

    // 1. Check for overlapping approved/pending leaves
    const overlappingLeave = await Leave.findOne({
      officerId: parsed.officerId,
      status: { $in: ["approved", "pending_commander", "extension_pending"] },
      startDate: { $lte: eDate },
      endDate: { $gte: sDate },
    }).lean();

    if (overlappingLeave) {
      const lEnd = overlappingLeave.endDate ? formatDateDisplay(overlappingLeave.endDate) : "تاريخ غير محدد";
      conflicts.push({
        type: "leave_overlap",
        severity: "blocking",
        message: `الضابط مسجل في ${overlappingLeave.category === "leave" ? "إجازة رسمية" : "غياب"} حتى ${lEnd}`,
      });
    }

    // 2. Check for overlapping other active/scheduled missions
    const missionQuery: Record<string, unknown> = {
      officerId: parsed.officerId,
      status: { $in: ["active", "scheduled"] },
      startDate: { $lte: eDate },
      $or: [
        { endDate: { $gte: sDate } },
        { endDate: null },
        { endDate: { $exists: false } },
      ],
    };

    if (parsed.excludeMissionId) {
      missionQuery._id = { $ne: parsed.excludeMissionId };
    }

    const overlappingMission = await Mission.findOne(missionQuery).lean();
    if (overlappingMission) {
      conflicts.push({
        type: "mission_overlap",
        severity: "warning",
        message: `الضابط مكلف بمأمورية أخرى خلال نفس الفترة: "${overlappingMission.title}" إلى (${overlappingMission.destination || "جهة محددة"})`,
      });
    }

    // 3. Check for primary position assignment without substitutes
    const primaryPosition = await PositionAssignment.findOne({
      primaryOfficerId: parsed.officerId,
    }).lean();

    if (primaryPosition) {
      const hasNoSub =
        Boolean(primaryPosition.hasNoSubstitute) ||
        !primaryPosition.substituteOfficerIds ||
        primaryPosition.substituteOfficerIds.length === 0;

      if (hasNoSub) {
        conflicts.push({
          type: "mandatory_position_vacant",
          severity: "warning",
          message: `تنبيه: الضابط يشغل وظيفة أصيلة (${primaryPosition.positionTitle}) بقسم (${primaryPosition.department}) دون وجود بديل مسجل`,
        });
      }
    }

    const hasBlockingConflict = conflicts.some((c) => c.severity === "blocking");

    return NextResponse.json({
      success: true,
      hasConflict: conflicts.length > 0,
      hasBlockingConflict,
      conflicts,
    });
  } catch (error) {
    return handleApiError(error, "فشل فحص التعارضات العملياتية");
  }
}
