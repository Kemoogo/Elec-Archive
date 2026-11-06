import { NextResponse } from "next/server";
import { Types } from "mongoose";
import { authenticate } from "@/lib/auth/middleware";
import { canEditModule } from "@/lib/auth/authorization";
import { checkApiRateLimit, rateLimitErrorResponse } from "@/lib/security/rate-limit";
import { connectToDatabase } from "@/lib/db/connect";
import { DutyRoster, type IDutyRosterDocEntry } from "@/lib/db/models/DutyRoster";
import { Officer } from "@/lib/db/models/Officer";
import { Leave } from "@/lib/db/models/Leave";
import { Mission } from "@/lib/db/models/Mission";
import { PositionAssignment } from "@/lib/db/models/PositionAssignment";
import { logAuditEvent } from "@/lib/auth/audit";
import { handleApiError } from "@/lib/utils/api-error";
import { dutySwapSchema } from "@/lib/validations/arkan-harb";
import { getWeekRange, getExcludedLeadershipOfficerIds } from "@/lib/arkan-harb/roster-engine";
import { formatOfficerLabel } from "@/lib/db/models/Officer.shared";

export async function POST(request: Request) {
  const auth = await authenticate();
  if (!auth.success) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
  }

  if (!canEditModule(auth.user!, "arkan_harb")) {
    return NextResponse.json(
      { success: false, error: "ليس لديك صلاحية لإجراء مبادلة نوبتجية" },
      { status: 403 }
    );
  }

  const ip = request.headers.get("x-forwarded-for") ?? "";
  const rl = checkApiRateLimit(auth.user!.id, ip, "write");
  if (!rl.allowed) {
    return NextResponse.json(rateLimitErrorResponse(rl.resetAt), { status: 429 });
  }

  await connectToDatabase();

  try {
    const body = await request.json();
    const parsed = dutySwapSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: "بيانات غير صالحة", details: parsed.error.issues },
        { status: 400 }
      );
    }

    const { date, dutyType, dutyTitle, replacementOfficerId, reason, targetRole } = parsed.data;

    // Past date protection
    const now = new Date();
    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(
      now.getDate()
    ).padStart(2, "0")}`;
    if (date < todayStr) {
      return NextResponse.json(
        { success: false, error: "لا يمكن مبادلة نوبتجية ليوم سابق حفاظاً على السجلات التاريخية" },
        { status: 400 }
      );
    }

    // Find the roster containing this week date
    const targetDate = new Date(date + "T12:00:00.000Z");
    const week = getWeekRange(targetDate);

    const roster = await DutyRoster.findOne({
      startDate: {
        $gte: new Date(week.startDateString + "T00:00:00.000Z"),
        $lte: new Date(week.startDateString + "T23:59:59.999Z"),
      },
    });

    if (!roster) {
      return NextResponse.json(
        { success: false, error: "لم يتم العثور على جدول نوبتجيات لهذا الأسبوع" },
        { status: 404 }
      );
    }

    // Find the target entry inside the roster
    const entries = roster.entries as IDutyRosterDocEntry[];
    const entry = entries.find((e) => {
      const eDateStr =
        e.date instanceof Date
          ? e.date.toISOString().slice(0, 10)
          : String(e.date).slice(0, 10);
      return eDateStr === date && (e.dutyType === dutyType || e.dutyTitle === dutyTitle);
    });

    if (!entry) {
      return NextResponse.json(
        { success: false, error: `لم يتم العثور على خدمة (${dutyTitle}) في يوم (${date}) في الجدول` },
        { status: 404 }
      );
    }

    // Verify replacement officer
    const replacementOfficer = await Officer.findOne({
      _id: replacementOfficerId,
      isInUnit: true,
      employmentStatus: "active",
    }).lean();

    if (!replacementOfficer) {
      return NextResponse.json(
        { success: false, error: "الضابط البديل غير موجود بقوة الوحدة أو منتهي خدمته" },
        { status: 400 }
      );
    }

    // Verify replacement officer is not Commander or Second-in-Command
    const [allActiveOfficers, activePositions] = await Promise.all([
      Officer.find({ isInUnit: true, employmentStatus: "active" })
        .collation({ locale: "en", numericOrdering: true })
        .sort({ seniorityNumber: 1 })
        .select("_id position")
        .lean(),
      PositionAssignment.find({ primaryOfficerId: { $ne: null } })
        .select("positionTitle department primaryOfficerId")
        .lean(),
    ]);
    const excludedLeadershipIds = getExcludedLeadershipOfficerIds(
      allActiveOfficers,
      activePositions
    );
    if (excludedLeadershipIds.has(replacementOfficerId)) {
      return NextResponse.json(
        { success: false, error: "لا يجوز تكليف السيد القائد أو قائد ثان بالنوبتجيات" },
        { status: 400 }
      );
    }

    const currentAssignedIdStr = entry.assignedOfficerId.toString();
    const currentYadakIdStr = entry.yadakOfficerId?.toString();

    if (targetRole === "primary") {
      if (currentAssignedIdStr === replacementOfficerId) {
        return NextResponse.json(
          { success: false, error: "لا يمكن مبادلة النوبتجية لنفس الضابط المعين بها حالياً" },
          { status: 400 }
        );
      }
    } else {
      if (currentAssignedIdStr === replacementOfficerId) {
        return NextResponse.json(
          { success: false, error: "لا يمكن تعيين الضابط الأساسي كضابط يدك في نفس الخدمة" },
          { status: 400 }
        );
      }
      if (currentYadakIdStr === replacementOfficerId) {
        return NextResponse.json(
          { success: false, error: "الضابط البديل هو نفسه الضابط اليدك المعين حالياً" },
          { status: 400 }
        );
      }
    }

    // Check same-day duty conflicts for the replacement officer
    const otherDutyToday = entries.find((e) => {
      const eDateStr =
        e.date instanceof Date
          ? e.date.toISOString().slice(0, 10)
          : String(e.date).slice(0, 10);
      if (eDateStr !== date) return false;
      if (e.dutyType === dutyType && e.dutyTitle === dutyTitle) return false;
      return e.assignedOfficerId.toString() === replacementOfficerId;
    });

    if (otherDutyToday) {
      return NextResponse.json(
        {
          success: false,
          error: `الضابط البديل معين بالفعل في خدمة أخرى في نفس اليوم (${otherDutyToday.dutyTitle})`,
        },
        { status: 400 }
      );
    }

    // Check leaves and missions for the replacement officer on target date
    const dayStart = new Date(date + "T00:00:00.000Z");
    const dayEnd = new Date(date + "T23:59:59.999Z");

    const [hasLeave, hasMission] = await Promise.all([
      Leave.findOne({
        officerId: replacementOfficerId,
        startDate: { $lte: dayEnd },
        endDate: { $gte: dayStart },
        status: { $in: ["approved", "extension_pending"] },
      }).lean(),
      Mission.findOne({
        officerId: replacementOfficerId,
        startDate: { $lte: dayEnd },
        $or: [
          { endDate: null },
          { endDate: { $exists: false } },
          { endDate: { $gte: dayStart } },
        ],
        status: { $in: ["active", "scheduled"] },
      }).lean(),
    ]);

    if (hasLeave) {
      return NextResponse.json(
        { success: false, error: "لا يمكن مبادلة الخدمة مع هذا الضابط لوجوده في إجازة رسمية في هذا اليوم" },
        { status: 400 }
      );
    }

    if (hasMission) {
      return NextResponse.json(
        { success: false, error: `لا يمكن مبادلة الخدمة مع هذا الضابط لوجوده في مأمورية رسمية (${hasMission.title}) في هذا اليوم` },
        { status: 400 }
      );
    }

    // Perform Swap
    const originalOfficerId = entry.originalOfficerId || entry.assignedOfficerId;
    const originalOfficer = await Officer.findById(originalOfficerId).lean();
    const fromOfficerId = targetRole === "primary" ? entry.assignedOfficerId : (entry.yadakOfficerId || entry.assignedOfficerId);
    const toOfficerId = new Types.ObjectId(replacementOfficerId);
    const swappedAt = new Date();
    const swappedBy = new Types.ObjectId(auth.user!.id);

    const swapRecord = {
      fromOfficerId,
      toOfficerId,
      targetRole,
      reason,
      swappedAt,
      swappedBy,
    };

    if (!entry.swapHistory) {
      entry.swapHistory = [];
    }
    entry.swapHistory.push(swapRecord);

    if (targetRole === "primary") {
      entry.originalOfficerId = originalOfficerId;
      entry.assignedOfficerId = toOfficerId;
      // If the promoted replacement officer was the current yadak officer, vacate the yadak slot
      if (currentYadakIdStr === replacementOfficerId) {
        entry.yadakOfficerId = undefined;
        entry.substituteOfficerId = undefined;
      }
      entry.isSwapped = true;
      entry.swapReason = reason;
      entry.swappedAt = swappedAt;
      entry.swappedBy = swappedBy;
    } else {
      entry.yadakOfficerId = toOfficerId;
      entry.substituteOfficerId = toOfficerId;
      entry.isSwapped = true;
      entry.notes = (entry.notes ? `${entry.notes} | ` : "") + `مبادلة يدك: ${reason}`;
    }

    roster.markModified("entries");
    if (!roster.createdBy) {
      roster.createdBy = new Types.ObjectId(auth.user!.id);
    }
    roster.updatedBy = new Types.ObjectId(auth.user!.id);
    await roster.save();

    const origLabel = originalOfficer
      ? formatOfficerLabel(originalOfficer.fullName, originalOfficer.rank, originalOfficer.isArkanHarb)
      : "ضابط";
    const repLabel = formatOfficerLabel(
      replacementOfficer.fullName,
      replacementOfficer.rank,
      replacementOfficer.isArkanHarb
    );

    await logAuditEvent({
      userId: auth.user!.id,
      userName: auth.user!.fullName,
      action: "UPDATE",
      module: "arkan_harb",
      targetId: roster._id.toString(),
      description: `تمت مبادلة نوبتجية (${dutyTitle}) يوم (${date}) من (${origLabel}) إلى الضابط البديل (${repLabel}) - سبب المبادلة: ${reason}`,
      ipAddress: ip,
    });

    return NextResponse.json({
      success: true,
      message: `تمت مبادلة خدمة (${dutyTitle}) بنجاح لصالح (${repLabel})`,
      data: {
        date,
        dutyType,
        dutyTitle,
        assignedOfficerId: replacementOfficerId,
        assignedOfficerLabel: repLabel,
        originalOfficerId: originalOfficerId.toString(),
        originalOfficerLabel: origLabel,
        isSwapped: true,
        swapReason: reason,
        swappedAt: entry.swappedAt,
      },
    });
  } catch (error) {
    return handleApiError(error, "حدث خطأ أثناء تنفيذ مبادلة النوبتجية");
  }
}
