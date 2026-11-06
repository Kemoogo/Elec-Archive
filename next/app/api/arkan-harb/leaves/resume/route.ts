import { NextResponse } from "next/server";
import { Types } from "mongoose";
import { connectToDatabase } from "@/lib/db/connect";
import { authenticate } from "@/lib/auth/middleware";
import { checkApiRateLimit, rateLimitErrorResponse } from "@/lib/security/rate-limit";
import { canEditModule } from "@/lib/auth/authorization";
import { Leave } from "@/lib/db/models/Leave";
import { Mission } from "@/lib/db/models/Mission";
import { logAuditEvent } from "@/lib/auth/audit";
import { errors } from "@/lib/auth/errors";
import { handleApiError } from "@/lib/utils/api-error";
import { z } from "zod";

const resumeLeaveSchema = z.object({
  originalLeaveId: z.string().min(1, "معرف الإجازة الأصلية مطلوب"),
  startDate: z.string().min(1, "تاريخ بداية الاستكمال مطلوب"),
  endDate: z.string().min(1, "تاريخ نهاية الاستكمال مطلوب"),
  resumeMode: z.enum(["same_date", "modify_date"]),
  actingOfficerId: z.string().optional().or(z.literal("")),
  reason: z.string().trim().optional(),
});

export async function POST(request: Request) {
  const auth = await authenticate();
  if (!auth.success) return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });

  const ip = request.headers.get("x-forwarded-for") ?? "";
  const rl = checkApiRateLimit(auth.user!.id, ip, "write");
  if (!rl.allowed) {
    return NextResponse.json(rateLimitErrorResponse(rl.resetAt), { status: 429 });
  }

  const hasPermission =
    auth.user?.role === "commander" ||
    auth.user?.role === "admin" ||
    canEditModule(auth.user!, "arkan_harb") ||
    canEditModule(auth.user!, "officers");
  if (!hasPermission) {
    return NextResponse.json({ success: false, error: errors.insufficientPermissions }, { status: 403 });
  }

  await connectToDatabase();

  try {
    const body = await request.json();
    const parsed = resumeLeaveSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: "بيانات غير صالحة", details: parsed.error.issues },
        { status: 400 }
      );
    }

    const { originalLeaveId, startDate, endDate, resumeMode, actingOfficerId, reason } = parsed.data;

    const originalLeave = await Leave.findById(originalLeaveId);
    if (!originalLeave) {
      return NextResponse.json({ success: false, error: "الإجازة الأصلية غير موجودة" }, { status: 404 });
    }

    if (originalLeave.status !== "interrupted") {
      return NextResponse.json(
        { success: false, error: "لا يمكن استكمال هذه الإجازة لأنها ليست بحالة مقطوعة" },
        { status: 400 }
      );
    }

    if (originalLeave.isResumed) {
      return NextResponse.json(
        { success: false, error: "تم استكمال أيام هذه الإجازة بالفعل مسبقاً" },
        { status: 400 }
      );
    }

    const startStr = startDate.split("T")[0];
    const endStr = endDate.split("T")[0];

    if (endStr < startStr) {
      return NextResponse.json(
        { success: false, error: "تاريخ النهاية يجب أن يكون بعد أو يساوي تاريخ البداية" },
        { status: 400 }
      );
    }

    const actualReturnStr = originalLeave.actualReturnDate
      ? new Date(originalLeave.actualReturnDate).toISOString().split("T")[0]
      : new Date(originalLeave.startDate).toISOString().split("T")[0];

    if (startStr < actualReturnStr) {
      return NextResponse.json(
        { success: false, error: `تاريخ بداية الاستكمال (${startStr}) لا يمكن أن يكون قبل تاريخ قطع الإجازة والعودة (${actualReturnStr})` },
        { status: 400 }
      );
    }

    // Determine target status according to rule:
    // If same return date => approved directly without commander approval
    // If modified return date => requires commander approval (pending_commander)
    const targetStatus = resumeMode === "same_date" ? "approved" : "pending_commander";

    // Check for overlap with other active leaves of this officer
    const existingLeaves = await Leave.find({
      officerId: originalLeave.officerId,
      _id: { $ne: originalLeave._id },
      status: { $in: ["approved", "pending_commander", "extension_pending"] },
    }).lean();

    const hasOverlap = existingLeaves.some((l) => {
      const lStartStr = new Date(l.startDate).toISOString().split("T")[0];
      const lEndStr = new Date(l.endDate).toISOString().split("T")[0];
      return startStr <= lEndStr && endStr >= lStartStr;
    });

    if (hasOverlap) {
      return NextResponse.json(
        { success: false, error: "يوجد تداخل مع إجازة أخرى مسجلة لنفس الضابط في هذه الفترة" },
        { status: 409 }
      );
    }

    // Check for overlap with external missions
    const overlappingMission = await Mission.findOne({
      officerId: originalLeave.officerId,
      missionType: { $ne: "internal_daily" },
      status: { $in: ["scheduled", "active"] },
      startDate: { $lte: new Date(endStr + "T23:59:59.999Z") },
      $or: [
        { endDate: { $exists: false } },
        { endDate: null },
        { endDate: { $gte: new Date(startStr + "T00:00:00.000Z") } },
      ],
    }).lean();

    if (overlappingMission) {
      return NextResponse.json(
        { success: false, error: `يوجد تداخل مع مأمورية مسجلة للضابط في هذه الفترة (${overlappingMission.title})` },
        { status: 409 }
      );
    }

    // Calculate compensated days
    const sDate = new Date(startStr);
    const eDate = new Date(endStr);
    const compensatedDays = Math.max(1, Math.round((eDate.getTime() - sDate.getTime()) / (1000 * 60 * 60 * 24)) + 1);

    // Create the resumed leave record
    const newLeave = await Leave.create({
      officerId: originalLeave.officerId,
      category: originalLeave.category,
      type: originalLeave.type,
      startDate: new Date(startStr + "T00:00:00.000Z"),
      endDate: new Date(endStr + "T00:00:00.000Z"),
      originalEndDate: new Date(endStr + "T00:00:00.000Z"),
      actingOfficerId: actingOfficerId && Types.ObjectId.isValid(actingOfficerId) ? new Types.ObjectId(actingOfficerId) : undefined,
      isActingOfficerPresentConfirmed: Boolean(actingOfficerId),
      isResumedLeave: true,
      originalLeaveId: originalLeave._id,
      compensatedDays,
      reason: reason ? `استكمال إجازة مقطوعة: ${reason}` : "استكمال إجازة مقطوعة واستعواض أيام",
      status: targetStatus,
      createdBy: new Types.ObjectId(auth.user!.id),
      updatedBy: new Types.ObjectId(auth.user!.id),
    });

    // Mark original interrupted leave as resumed
    originalLeave.isResumed = true;
    originalLeave.resumedLeaveId = newLeave._id as Types.ObjectId;
    originalLeave.updatedBy = new Types.ObjectId(auth.user!.id) as unknown as typeof originalLeave.updatedBy;
    await originalLeave.save();

    await logAuditEvent({
      userId: auth.user!.id,
      userName: auth.user!.fullName || auth.user!.username,
      action: "CREATE",
      module: "arkan_harb",
      targetId: newLeave._id.toString(),
      description: `استكمال إجازة مقطوعة للضابط: من ${startStr} إلى ${endStr} (${compensatedDays} يوم) - ${
        targetStatus === "approved" ? "معتمد مباشرة (نفس تاريخ العودة)" : "عرض للتصديق من القائد (تعديل موعد العودة)"
      }`,
    });

    return NextResponse.json({
      success: true,
      data: {
        leaveId: newLeave._id.toString(),
        status: targetStatus,
        requiresCommanderApproval: targetStatus === "pending_commander",
      },
    });
  } catch (error) {
    return handleApiError(error, "حدث خطأ أثناء استكمال الإجازة");
  }
}
