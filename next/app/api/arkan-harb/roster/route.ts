import { NextResponse } from "next/server";
import { Types } from "mongoose";
import { authenticate } from "@/lib/auth/middleware";
import { canViewModule, canEditModule } from "@/lib/auth/authorization";
import { checkApiRateLimit, rateLimitErrorResponse } from "@/lib/security/rate-limit";
import { connectToDatabase } from "@/lib/db/connect";
import { DutyRoster, DEFAULT_DUTY_ROLES, type IDutyRosterDocEntry } from "@/lib/db/models/DutyRoster";
import { Officer } from "@/lib/db/models/Officer";
import { Leave } from "@/lib/db/models/Leave";
import { Mission } from "@/lib/db/models/Mission";
import { PositionAssignment } from "@/lib/db/models/PositionAssignment";
import { logAuditEvent } from "@/lib/auth/audit";
import { handleApiError } from "@/lib/utils/api-error";
import { updateDutyRosterSchema } from "@/lib/validations/arkan-harb";
import { calculateDutyEquityStats, getWeekRange, getExcludedLeadershipOfficerIds } from "@/lib/arkan-harb/roster-engine";
import { formatOfficerRank, formatOfficerLabel } from "@/lib/db/models/Officer.shared";

export async function GET(request: Request) {
  const auth = await authenticate();
  if (!auth.success) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
  }

  if (!canViewModule(auth.user!, "arkan_harb")) {
    return NextResponse.json({ success: false, error: "ليس لديك صلاحية لعرض جدول النوبتجيات" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const dateParam = searchParams.get("date") || searchParams.get("startDate");

  const targetDate = dateParam && !isNaN(Date.parse(dateParam)) ? new Date(dateParam) : new Date();
  const week = getWeekRange(targetDate);

  await connectToDatabase();

  try {
    const startRange = new Date(week.startDateString + "T00:00:00.000Z");
    const endRange = new Date(week.startDateString + "T23:59:59.999Z");

    const nextSatDateStr = week.days.length === 8 ? week.days[7].dateString : null;
    const nextStartRange = nextSatDateStr ? new Date(nextSatDateStr + "T00:00:00.000Z") : null;
    const nextEndRange = nextSatDateStr ? new Date(nextSatDateStr + "T23:59:59.999Z") : null;

    const overallStart = startRange;
    const overallEnd = nextEndRange || new Date(week.endDateString + "T23:59:59.999Z");

    const [roster, activeOfficers, nextRoster, weekLeaves, weekMissions, activePositions] = await Promise.all([
      DutyRoster.findOne({
        startDate: { $gte: startRange, $lte: endRange },
      }).lean(),
      Officer.find({ isInUnit: true, employmentStatus: "active" })
        .collation({ locale: "en", numericOrdering: true })
        .sort({ seniorityNumber: 1 })
        .lean(),
      nextStartRange && nextEndRange
        ? DutyRoster.findOne({
            startDate: { $gte: nextStartRange, $lte: nextEndRange },
          }).lean()
        : Promise.resolve(null),
      Leave.find({
        startDate: { $lte: overallEnd },
        endDate: { $gte: overallStart },
        status: { $in: ["approved", "extension_pending"] },
      })
        .select("officerId startDate endDate status type")
        .lean(),
      Mission.find({
        startDate: { $lte: overallEnd },
        $or: [
          { endDate: null },
          { endDate: { $exists: false } },
          { endDate: { $gte: overallStart } },
        ],
        status: { $in: ["active", "scheduled"] },
      })
        .select("officerId additionalOfficerIds startDate endDate status title missionType")
        .lean(),
      PositionAssignment.find({ primaryOfficerId: { $ne: null } })
        .select("positionTitle department primaryOfficerId")
        .lean(),
    ]);

    const formattedLeaves = (weekLeaves || []).map((l) => ({
      officerId: l.officerId.toString(),
      startDate: l.startDate instanceof Date ? l.startDate.toISOString() : String(l.startDate),
      endDate: l.endDate instanceof Date ? l.endDate.toISOString() : String(l.endDate),
      status: l.status,
      type: l.type,
    }));

    const formattedMissions = (weekMissions || []).flatMap((m) => {
      const additional = ((m.additionalOfficerIds as (Types.ObjectId | string)[]) || []);
      const officerIds = [m.officerId.toString(), ...additional.map((id) => id.toString())];
      return officerIds.map((offId) => ({
        officerId: offId,
        startDate: m.startDate instanceof Date ? m.startDate.toISOString() : String(m.startDate),
        endDate: m.endDate ? (m.endDate instanceof Date ? m.endDate.toISOString() : String(m.endDate)) : null,
        status: m.status,
        title: m.title,
        missionType: m.missionType,
      }));
    });

    // If current week has day 8 (next Saturday preview), extract preview entries from next week's roster
    let nextWeekEntries: IDutyRosterDocEntry[] = [];
    if (nextRoster?.entries && nextSatDateStr) {
      nextWeekEntries = (nextRoster.entries as IDutyRosterDocEntry[]).filter((e) => {
        const dStr = e.date instanceof Date ? e.date.toISOString().split("T")[0] : String(e.date).split("T")[0];
        return dStr === nextSatDateStr;
      });
    }

    const rawEntries = [
      ...((roster?.entries || []) as IDutyRosterDocEntry[]),
      ...nextWeekEntries,
    ];

    const officerMap = new Map<string, { fullName: string; rankLabel: string; officerLabel: string }>();
    for (const off of activeOfficers) {
      const rLabel = formatOfficerRank(off.rank, off.isArkanHarb);
      const oLabel = formatOfficerLabel(off.fullName, off.rank, off.isArkanHarb);
      officerMap.set(off._id.toString(), {
        fullName: off.fullName,
        rankLabel: rLabel,
        officerLabel: oLabel,
      });
    }

    // Resolve any officers in entries or swapHistory not in activeOfficers (e.g. transferred/archived)
    const missingOfficerIds = new Set<string>();
    for (const e of rawEntries) {
      if (e.assignedOfficerId && !officerMap.has(e.assignedOfficerId.toString())) {
        missingOfficerIds.add(e.assignedOfficerId.toString());
      }
      if (e.originalOfficerId && !officerMap.has(e.originalOfficerId.toString())) {
        missingOfficerIds.add(e.originalOfficerId.toString());
      }
      if (e.yadakOfficerId && !officerMap.has(e.yadakOfficerId.toString())) {
        missingOfficerIds.add(e.yadakOfficerId.toString());
      }
      for (const sh of e.swapHistory || []) {
        if (sh.fromOfficerId && !officerMap.has(sh.fromOfficerId.toString())) {
          missingOfficerIds.add(sh.fromOfficerId.toString());
        }
        if (sh.toOfficerId && !officerMap.has(sh.toOfficerId.toString())) {
          missingOfficerIds.add(sh.toOfficerId.toString());
        }
      }
    }

    if (missingOfficerIds.size > 0) {
      const extraOfficers = await Officer.find({
        _id: { $in: Array.from(missingOfficerIds) },
      }).lean();
      for (const off of extraOfficers) {
        officerMap.set(off._id.toString(), {
          fullName: off.fullName,
          rankLabel: formatOfficerRank(off.rank, off.isArkanHarb),
          officerLabel: formatOfficerLabel(off.fullName, off.rank, off.isArkanHarb),
        });
      }
    }
    const formattedEntries = rawEntries.map((e) => {
      const off = officerMap.get(e.assignedOfficerId.toString());
      const yadakIdStr = (e.yadakOfficerId || e.substituteOfficerId)?.toString();
      const yadak = yadakIdStr ? officerMap.get(yadakIdStr) : undefined;
      const orig = e.originalOfficerId ? officerMap.get(e.originalOfficerId.toString()) : undefined;

      const formattedSwapHistory = (e.swapHistory || []).map((sh) => {
        const fromOff = officerMap.get(sh.fromOfficerId.toString());
        const toOff = officerMap.get(sh.toOfficerId.toString());
        return {
          fromOfficerId: sh.fromOfficerId.toString(),
          fromOfficerName: fromOff?.fullName || "ضابط سابق",
          fromOfficerRank: fromOff?.rankLabel,
          fromOfficerLabel: fromOff?.officerLabel,
          toOfficerId: sh.toOfficerId.toString(),
          toOfficerName: toOff?.fullName || "ضابط بديل",
          toOfficerRank: toOff?.rankLabel,
          toOfficerLabel: toOff?.officerLabel,
          targetRole: (sh.targetRole || "primary") as "primary" | "yadak",
          reason: sh.reason,
          swappedAt: sh.swappedAt instanceof Date ? sh.swappedAt.toISOString() : String(sh.swappedAt),
          swappedBy: sh.swappedBy?.toString(),
        };
      });

      // Backward compatibility: If entry is marked as swapped but has no swapHistory array yet, create initial record from originalOfficerId
      if (formattedSwapHistory.length === 0 && e.isSwapped && orig && off) {
        formattedSwapHistory.push({
          fromOfficerId: e.originalOfficerId!.toString(),
          fromOfficerName: orig.fullName,
          fromOfficerRank: orig.rankLabel,
          fromOfficerLabel: orig.officerLabel,
          toOfficerId: e.assignedOfficerId.toString(),
          toOfficerName: off.fullName,
          toOfficerRank: off.rankLabel,
          toOfficerLabel: off.officerLabel,
          targetRole: "primary",
          reason: e.swapReason || "مبادلة بالاتفاق المسبق",
          swappedAt: e.swappedAt instanceof Date ? e.swappedAt.toISOString() : (e.swappedAt ? String(e.swappedAt) : new Date().toISOString()),
          swappedBy: e.swappedBy ? e.swappedBy.toString() : undefined,
        });
      }

      return {
        date: e.date instanceof Date ? e.date.toISOString().split("T")[0] : String(e.date).split("T")[0],
        dutyType: e.dutyType,
        dutyTitle: e.dutyTitle,
        assignedOfficerId: e.assignedOfficerId.toString(),
        assignedOfficerName: off?.fullName || "ضابط غير معروف",
        assignedOfficerRank: off?.rankLabel,
        assignedOfficerLabel: off?.officerLabel,
        yadakOfficerId: yadakIdStr,
        yadakOfficerName: yadak?.fullName,
        yadakOfficerRank: yadak?.rankLabel,
        yadakOfficerLabel: yadak?.officerLabel,
        substituteOfficerId: yadakIdStr,
        substituteOfficerName: yadak?.fullName,
        isSwapped: Boolean(e.isSwapped),
        originalOfficerId: e.originalOfficerId?.toString(),
        originalOfficerName: orig?.fullName,
        originalOfficerRank: orig?.rankLabel,
        originalOfficerLabel: orig?.officerLabel,
        swapReason: e.swapReason || "",
        swappedAt: e.swappedAt instanceof Date ? e.swappedAt.toISOString() : (e.swappedAt ? String(e.swappedAt) : undefined),
        swapHistory: formattedSwapHistory,
        isForcedAssignment: Boolean(e.isForcedAssignment),
        notes: e.notes || "",
        isHoliday: Boolean(e.isHoliday),
      };
    });

    // Calculate Monthly Equity Stats (covering all rosters of the target month)
    const monthStart = new Date(Date.UTC(week.year, targetDate.getMonth(), 1, 0, 0, 0, 0));
    const monthEnd = new Date(Date.UTC(week.year, targetDate.getMonth() + 1, 0, 23, 59, 59, 999));

    const monthRosters = await DutyRoster.find({
      startDate: { $gte: monthStart, $lte: monthEnd },
    })
      .select("entries")
      .lean();

    const monthDutyEntries: Array<{
      date: Date | string;
      assignedOfficerId: string;
      isHoliday: boolean;
    }> = [];

    // Include entries from other rosters in this month
    for (const mr of monthRosters) {
      if (roster && mr._id.toString() === roster._id.toString()) {
        continue;
      }
      for (const e of (mr.entries || []) as IDutyRosterDocEntry[]) {
        const d = e.date instanceof Date ? e.date : new Date(e.date);
        if (d >= monthStart && d <= monthEnd) {
          monthDutyEntries.push({
            date: d,
            assignedOfficerId: e.assignedOfficerId.toString(),
            isHoliday: Boolean(e.isHoliday),
          });
        }
      }
    }

    // Include current week entries (within month boundaries)
    for (const e of formattedEntries) {
      const d = new Date(e.date + "T12:00:00.000Z");
      if (d >= monthStart && d <= monthEnd) {
        monthDutyEntries.push({
          date: d,
          assignedOfficerId: e.assignedOfficerId,
          isHoliday: e.isHoliday,
        });
      }
    }

    const excludedLeadershipIds = getExcludedLeadershipOfficerIds(
      activeOfficers,
      activePositions
    );
    const dutyEligibleOfficers = activeOfficers.filter(
      (o) => !excludedLeadershipIds.has(o._id.toString())
    );

    const equityStats = calculateDutyEquityStats(
      monthDutyEntries,
      dutyEligibleOfficers.map((o) => ({
        _id: o._id,
        fullName: o.fullName,
        rank: formatOfficerRank(o.rank, o.isArkanHarb),
      }))
    );

    return NextResponse.json({
      success: true,
      data: {
        id: roster?._id ? roster._id.toString() : null,
        startDate: week.startDateString,
        endDate: week.endDateString,
        weekNumber: week.weekNumber,
        year: week.year,
        customDuties: roster?.customDuties || [],
        status: roster?.status || "draft",
        approvedByCommander: Boolean(roster?.approvedByCommander),
        commanderDecisionDate: roster?.commanderDecisionDate,
        commanderNotes: roster?.commanderNotes || "",
        entries: formattedEntries,
        leaves: formattedLeaves,
        missions: formattedMissions,
        equityStats,
        weekInfo: week,
      },
    });
  } catch (error) {
    return handleApiError(error, "حدث خطأ أثناء تحميل جدول النوبتجيات");
  }
}

export async function PUT(request: Request) {
  const auth = await authenticate();
  if (!auth.success) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
  }

  if (!canEditModule(auth.user!, "arkan_harb")) {
    return NextResponse.json({ success: false, error: "ليس لديك صلاحية لتعديل جدول النوبتجيات" }, { status: 403 });
  }

  const ip = request.headers.get("x-forwarded-for") ?? "";
  const rl = checkApiRateLimit(auth.user!.id, ip, "write");
  if (!rl.allowed) {
    return NextResponse.json(rateLimitErrorResponse(rl.resetAt), { status: 429 });
  }

  await connectToDatabase();

  try {
    const body = await request.json();
    const parsed = updateDutyRosterSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: "بيانات غير صالحة", details: parsed.error.issues },
        { status: 400 }
      );
    }

    const { startDate, endDate, customDuties, status, entries, commanderNotes } = parsed.data;

    const startObj = new Date(startDate.split("T")[0] + "T00:00:00.000Z");
    const endObj = new Date(endDate.split("T")[0] + "T23:59:59.999Z");

    const now = new Date();
    const todayStart = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0));

    // Existing roster for this week
    const existingRoster = await DutyRoster.findOne({
      startDate: {
        $gte: new Date(startDate.split("T")[0] + "T00:00:00.000Z"),
        $lte: new Date(startDate.split("T")[0] + "T23:59:59.999Z"),
      },
    }).lean();

    // Strictly enforce week boundaries (Saturday to Friday)
    const filteredEntries = entries.filter((e) => {
      const eDate = new Date(e.date.split("T")[0] + "T12:00:00.000Z");
      return eDate >= startObj && eDate <= endObj;
    });

    // Next Saturday preview entries (day 8)
    const nextSatEntries = entries.filter((e) => {
      const eDate = new Date(e.date.split("T")[0] + "T12:00:00.000Z");
      return eDate > endObj;
    });

    // Check if existing roster is already approved: locked against direct editing
    const isCommanderOrAdmin = auth.user?.role === "commander" || auth.user?.role === "admin";
    if (existingRoster?.status === "approved") {
      const isRevertingToDraft = status === "draft";
      if (isRevertingToDraft && !isCommanderOrAdmin) {
        return NextResponse.json(
          {
            success: false,
            error: "فقط السيد القائد أو مسؤول النظام يملك صلاحية إلغاء اعتماد الجدول وإعادته لمسودة",
          },
          { status: 403 }
        );
      }

      // If updating an already approved roster (e.g. adding custom duties or assigning unassigned cells)
      if (status === "approved") {
        const existingEntries = (existingRoster.entries || []) as IDutyRosterDocEntry[];
        for (const exp of existingEntries) {
          if (!exp.assignedOfficerId) continue;
          const expDateStr =
            exp.date instanceof Date
              ? exp.date.toISOString().split("T")[0]
              : String(exp.date).split("T")[0];

          const match = filteredEntries.find((inc) => {
            const incDateStr = inc.date.split("T")[0];
            return (
              incDateStr === expDateStr &&
              (inc.dutyType === exp.dutyType || inc.dutyTitle === exp.dutyTitle)
            );
          });

          if (!match) {
            return NextResponse.json(
              {
                success: false,
                error: `لا يمكن حذف خدمة معتمدة مسبقاً (${exp.dutyTitle}) لتاريخ ${expDateStr}`,
              },
              { status: 400 }
            );
          }

          if (
            match.assignedOfficerId !== exp.assignedOfficerId.toString() &&
            !match.isSwapped
          ) {
            return NextResponse.json(
              {
                success: false,
                error: `جدول النوبتجيات معتمد رسمياً. لتغيير ضابط معين في خدمة (${exp.dutyTitle}) لتاريخ ${expDateStr}، يجب تقديم طلب مبادلة نوبتجية رسمي`,
              },
              { status: 400 }
            );
          }
        }
      }
    }

    // Strict Validation on Approval: Cannot approve if there are incomplete duties
    if (status === "approved" && existingRoster?.status !== "approved") {
      const allActiveRoles = [
        ...DEFAULT_DUTY_ROLES,
        ...(customDuties || []).map((title) => ({
          key: `custom_${title}`,
          title,
          isCustom: true,
        })),
      ];

      const sevenDays: string[] = [];
      for (let i = 0; i < 7; i++) {
        const d = new Date(startObj);
        d.setUTCDate(d.getUTCDate() + i);
        sevenDays.push(d.toISOString().split("T")[0]);
      }

      const missing: string[] = [];
      for (const dayStr of sevenDays) {
        for (const role of allActiveRoles) {
          const isAssigned = filteredEntries.some(
            (e) =>
              e.date.split("T")[0] === dayStr &&
              (e.dutyType === role.key || e.dutyTitle === role.title) &&
              Boolean(e.assignedOfficerId)
          );
          if (!isAssigned) {
            missing.push(`${dayStr} [${role.title}]`);
          }
        }
      }

      if (missing.length > 0) {
        return NextResponse.json(
          {
            success: false,
            error: "يرجى استكمال تسكين كافة خدمات الأسبوع أولاً لتتمكن من اعتماد الجدول، أو حفظه كمسودة مؤقتة.",
          },
          { status: 400 }
        );
      }
    }

    // Protection layer: ensure historical duties on past dates cannot be modified, deleted, or replaced (only applies to approved rosters)
    if (existingRoster?.status === "approved" && existingRoster?.entries) {
      const existingPastEntries = (existingRoster.entries as IDutyRosterDocEntry[]).filter((e) => {
        const d = e.date instanceof Date ? e.date : new Date(e.date);
        return d < todayStart;
      });

      const incomingPastEntries = filteredEntries.filter((e) => {
        const d = new Date(e.date.split("T")[0] + "T00:00:00.000Z");
        return d < todayStart;
      });

      let hasPastChange = existingPastEntries.length !== incomingPastEntries.length;

      if (!hasPastChange) {
        for (const exp of existingPastEntries) {
          const expDateStr =
            exp.date instanceof Date
              ? exp.date.toISOString().split("T")[0]
              : String(exp.date).split("T")[0];
          const match = incomingPastEntries.find((inc) => {
            const incDateStr = inc.date.split("T")[0];
            return (
              incDateStr === expDateStr &&
              inc.dutyType === exp.dutyType &&
              inc.assignedOfficerId === exp.assignedOfficerId.toString()
            );
          });
          if (!match) {
            hasPastChange = true;
            break;
          }
        }
      }

      if (hasPastChange) {
        return NextResponse.json(
          {
            success: false,
            error: "لا يمكن تعديل أو إلغاء نوبتجيات الأيام السابقة حفاظاً على السجلات التاريخية",
          },
          { status: 400 }
        );
      }
    }

    // Strict enforcement: No officer can be assigned to more than one duty on the same day
    const allSubmittedEntries = [...filteredEntries, ...nextSatEntries];
    const sameDayAssignedMap = new Map<string, string>();
    for (const e of allSubmittedEntries) {
      const dayStr = e.date.split("T")[0];
      const key = `${dayStr}_${e.assignedOfficerId}`;
      if (sameDayAssignedMap.has(key)) {
        const prevTitle = sameDayAssignedMap.get(key);
        return NextResponse.json(
          {
            success: false,
            error: `لا يمكن تسكين نفس الضابط في أكثر من خدمة في نفس اليوم (${dayStr}: مسكن في "${prevTitle}" و "${e.dutyTitle}")`,
          },
          { status: 400 }
        );
      }
      sameDayAssignedMap.set(key, e.dutyTitle);
    }

    // Verify that all assigned and yadak officers are active and in-unit
    const officerIdsToVerify = Array.from(
      new Set(
        allSubmittedEntries
          .flatMap((e) => [e.assignedOfficerId, e.yadakOfficerId, e.substituteOfficerId])
          .filter((id): id is string => typeof id === "string" && Types.ObjectId.isValid(id))
      )
    );

    if (officerIdsToVerify.length > 0) {
      const activeCount = await Officer.countDocuments({
        _id: { $in: officerIdsToVerify.map((id) => new Types.ObjectId(id)) },
        isInUnit: true,
        employmentStatus: "active",
      });

      if (activeCount !== officerIdsToVerify.length) {
        return NextResponse.json(
          {
            success: false,
            error: "لا يمكن تعيين ضباط منقولين أو خارج قوة الوحدة في جدول النوبتجيات",
          },
          { status: 400 }
        );
      }
    }

    // Map existing entries to preserve swap data if not overwritten
    const existingEntryMap = new Map<string, IDutyRosterDocEntry>();
    if (existingRoster?.entries) {
      for (const ex of (existingRoster.entries as IDutyRosterDocEntry[])) {
        const dStr = ex.date instanceof Date ? ex.date.toISOString().slice(0, 10) : String(ex.date).slice(0, 10);
        existingEntryMap.set(`${dStr}_${ex.dutyType}_${ex.dutyTitle}`, ex);
      }
    }

    const formattedDocEntries = filteredEntries.map((e) => {
      const dStr = e.date.split("T")[0];
      const prevEntry = existingEntryMap.get(`${dStr}_${e.dutyType}_${e.dutyTitle}`);
      const yadakId = e.yadakOfficerId || e.substituteOfficerId;

      return {
        date: new Date(dStr + "T12:00:00.000Z"),
        dutyType: e.dutyType,
        dutyTitle: e.dutyTitle,
        assignedOfficerId: new Types.ObjectId(e.assignedOfficerId),
        yadakOfficerId: yadakId ? new Types.ObjectId(yadakId) : undefined,
        substituteOfficerId: yadakId ? new Types.ObjectId(yadakId) : undefined,
        isSwapped: e.isSwapped !== undefined ? Boolean(e.isSwapped) : Boolean(prevEntry?.isSwapped),
        originalOfficerId: e.originalOfficerId
          ? new Types.ObjectId(e.originalOfficerId)
          : prevEntry?.originalOfficerId,
        swapReason: e.swapReason || prevEntry?.swapReason,
        swappedAt: e.swappedAt ? new Date(e.swappedAt) : prevEntry?.swappedAt,
        swappedBy: e.swappedBy ? new Types.ObjectId(e.swappedBy) : prevEntry?.swappedBy,
        swapHistory: e.swapHistory && e.swapHistory.length > 0
          ? e.swapHistory.map((sh) => ({
              fromOfficerId: new Types.ObjectId(sh.fromOfficerId),
              toOfficerId: new Types.ObjectId(sh.toOfficerId),
              targetRole: sh.targetRole,
              reason: sh.reason,
              swappedAt: new Date(sh.swappedAt),
              swappedBy: sh.swappedBy ? new Types.ObjectId(sh.swappedBy) : undefined,
            }))
          : prevEntry?.swapHistory || [],
        isForcedAssignment: Boolean(e.isForcedAssignment),
        notes: e.notes,
        isHoliday: e.isHoliday,
      };
    });

    const startOfYear = new Date(startObj.getFullYear(), 0, 1);
    const pastDaysOfYear = (startObj.getTime() - startOfYear.getTime()) / 86400000;
    const weekNumber = Math.ceil((pastDaysOfYear + startOfYear.getDay() + 1) / 7);

    const targetStatus = status || (existingRoster?.status || "draft");
    const isApproved = targetStatus === "approved";

    const updateData: Record<string, unknown> = {
      startDate: startObj,
      endDate: endObj,
      year: startObj.getFullYear(),
      month: startObj.getMonth() + 1,
      weekNumber,
      customDuties: customDuties || [],
      entries: formattedDocEntries,
      status: targetStatus,
      approvedByCommander: isApproved,
      updatedBy: new Types.ObjectId(auth.user!.id),
    };

    if (isApproved) {
      updateData.commanderDecisionDate = new Date();
    } else {
      updateData.commanderDecisionDate = undefined;
    }

    if (commanderNotes !== undefined) updateData.commanderNotes = commanderNotes;

    const roster = await DutyRoster.findOneAndUpdate(
      {
        startDate: {
          $gte: new Date(startDate.split("T")[0] + "T00:00:00.000Z"),
          $lte: new Date(startDate.split("T")[0] + "T23:59:59.999Z"),
        },
      },
      {
        $set: updateData,
        $setOnInsert: {
          createdBy: new Types.ObjectId(auth.user!.id),
        },
      },
      { upsert: true, returnDocument: "after", setDefaultsOnInsert: true }
    );

    await logAuditEvent({
      userId: auth.user!.id,
      userName: auth.user!.fullName,
      action: "UPDATE",
      module: "arkan_harb",
      targetId: roster._id.toString(),
      description: `تم حفظ جدول النوبتجيات الأسبوعي من (${startDate}) إلى (${endDate})`,
      ipAddress: ip,
    });

    // Persist next Saturday entries (day 8 preview) to next week's roster ONLY when the saved week is the 8-day current week
    const savedWeekInfo = getWeekRange(startObj);
    if (savedWeekInfo.days.length === 8) {
      const nextStartRange = new Date(startObj);
      nextStartRange.setUTCDate(nextStartRange.getUTCDate() + 7);
      nextStartRange.setUTCHours(0, 0, 0, 0);

      const nextEndRange = new Date(nextStartRange);
      nextEndRange.setUTCDate(nextEndRange.getUTCDate() + 6);
      nextEndRange.setUTCHours(23, 59, 59, 999);

      const nextSatDateStr = nextStartRange.toISOString().split("T")[0];

      const formattedNextSatEntries: IDutyRosterDocEntry[] = nextSatEntries.map((e) => {
        const yadakId = e.yadakOfficerId || e.substituteOfficerId;
        return {
          date: new Date(nextSatDateStr + "T12:00:00.000Z"),
          dutyType: e.dutyType,
          dutyTitle: e.dutyTitle,
          assignedOfficerId: new Types.ObjectId(e.assignedOfficerId),
          yadakOfficerId: yadakId ? new Types.ObjectId(yadakId) : undefined,
          substituteOfficerId: yadakId ? new Types.ObjectId(yadakId) : undefined,
          isSwapped: Boolean(e.isSwapped),
          originalOfficerId: e.originalOfficerId ? new Types.ObjectId(e.originalOfficerId) : undefined,
          swapReason: e.swapReason,
          swappedAt: e.swappedAt ? new Date(e.swappedAt) : undefined,
          swapHistory: e.swapHistory && e.swapHistory.length > 0
            ? e.swapHistory.map((sh) => ({
                fromOfficerId: new Types.ObjectId(sh.fromOfficerId),
                toOfficerId: new Types.ObjectId(sh.toOfficerId),
                targetRole: sh.targetRole,
                reason: sh.reason,
                swappedAt: new Date(sh.swappedAt),
                swappedBy: sh.swappedBy ? new Types.ObjectId(sh.swappedBy) : undefined,
              }))
            : [],
          notes: e.notes,
          isHoliday: Boolean(e.isHoliday),
        };
      });

      const nextRoster = await DutyRoster.findOne({
        startDate: {
          $gte: nextStartRange,
          $lte: new Date(nextSatDateStr + "T23:59:59.999Z"),
        },
      });

      if (nextRoster) {
        if (nextRoster.status !== "approved") {
          const remainingEntries = (nextRoster.entries || []).filter((e: IDutyRosterDocEntry) => {
            const dStr = e.date instanceof Date ? e.date.toISOString().split("T")[0] : String(e.date).split("T")[0];
            return dStr !== nextSatDateStr;
          });
          await DutyRoster.updateOne(
            { _id: nextRoster._id },
            {
              $set: {
                entries: [...remainingEntries, ...formattedNextSatEntries],
                updatedBy: new Types.ObjectId(auth.user!.id),
              },
              $setOnInsert: {
                createdBy: new Types.ObjectId(auth.user!.id),
              },
            }
          );
        }
      } else if (formattedNextSatEntries.length > 0) {
        const nextStartOfYear = new Date(nextStartRange.getFullYear(), 0, 1);
        const nextPastDays = (nextStartRange.getTime() - nextStartOfYear.getTime()) / 86400000;
        const nextWeekNum = Math.ceil((nextPastDays + nextStartOfYear.getDay() + 1) / 7);

        await DutyRoster.create({
          startDate: nextStartRange,
          endDate: nextEndRange,
          year: nextStartRange.getFullYear(),
          month: nextStartRange.getMonth() + 1,
          weekNumber: nextWeekNum,
          customDuties: customDuties || [],
          entries: formattedNextSatEntries,
          status: "draft",
          approvedByCommander: false,
          createdBy: new Types.ObjectId(auth.user!.id),
          updatedBy: new Types.ObjectId(auth.user!.id),
        });
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        id: roster._id.toString(),
        startDate: roster.startDate,
        endDate: roster.endDate,
        status: roster.status,
        customDuties: roster.customDuties,
        approvedByCommander: roster.approvedByCommander,
        entriesCount: roster.entries.length,
      },
    });
  } catch (error) {
    return handleApiError(error, "حدث خطأ أثناء حفظ جدول النوبتجيات");
  }
}
