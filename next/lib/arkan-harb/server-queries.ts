import {
  Leave,
  Mission,
  DailyRollcall,
  AuditLog,
  Officer,
  DutyRoster,
  type IRollcallEntry,
  type MissionStatus,
} from "@/lib/db/models";
import { type ICustomRollcallTable } from "@/lib/db/models/DailyRollcall.shared";
import { LEAVE_TYPE_LABELS } from "@/lib/db/models/Leave.shared";
import { RANK_LABELS, formatOfficerRank, formatOfficerLabel } from "@/lib/db/models/Officer.shared";
import { getUtcDayRange } from "@/lib/arkan-harb/rollcall-engine";
import { Branch } from "@/lib/db/models/Branch";
import { Department } from "@/lib/db/models/Department";
import { PositionAssignment } from "@/lib/db/models/PositionAssignment";
import { getUnitName } from "@/lib/db/settings";
import { formatDateWithDay, getDayName, formatDateDisplay } from "@/lib/utils/date-display";
import type { OfficerOption } from "@/types/officer";
import type { OfficerLeaveStatusRow, LeaveItem } from "@/components/officers/LeaveRegister";
import type { Mission as FormattedMission } from "@/components/arkan-harb/MissionsTable";
import type { PositionRowData } from "@/components/arkan-harb/PositionAssignmentTable";
import type { RollcallOfficerData } from "@/components/arkan-harb/RollcallView";

// Populated document shapes (Mongoose lean + populate)
export interface PopulatedOfficer {
  _id: { toString(): string };
  fullName: string;
  rank: string;
  militaryId?: string;
  seniorityNumber?: string;
  isArkanHarb?: boolean;
}

export interface PopulatedMission {
  _id: { toString(): string };
  officerId: PopulatedOfficer | { toString(): string };
  title: string;
  description?: string;
  destination?: string;
  startDate: Date;
  endDate?: Date | null;
  status: MissionStatus;
  missionType?: "internal_daily" | "external_multiday";
  statusReason?: string;
  resultSummary?: string;
  linkedFaxId?: string;
  createdBy: { toString(): string };
  createdAt: Date;
}

export interface AuditLogPopulated {
  _id: string;
  userId?: { username?: string; fullName?: string };
  userName: string;
  action?: string;
  createdAt: string;
  description: string;
}

export interface PopulatedCommanderDecisionDoc {
  _id: { toString(): string };
  officerId: PopulatedOfficer | { toString(): string };
  type: string;
  startDate: Date | string;
  endDate: Date | string;
  status: string;
  commanderDecision?: {
    status?: string;
    notes?: string;
    decidedAt?: Date | string;
  };
}

/**
 * 1. Fetch Dashboard Metrics & Recent Activities
 */
export async function fetchArkanHarbDashboardData() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const sevenDaysAgo = new Date(today);
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);

  const [
    activeLeavesCount,
    activeMissionsCount,
    todayRollcall,
    recentActivities,
    totalOfficers,
    weeklyRollcalls,
  ] = await Promise.all([
    Leave.countDocuments({
      startDate: { $lte: new Date() },
      endDate: { $gte: new Date() },
      status: "approved",
    }),
    Mission.countDocuments({ status: "active" }),
    DailyRollcall.findOne({ date: { $gte: today, $lt: tomorrow } }).lean(),
    AuditLog.find({ module: "arkan_harb" })
      .populate("userId", "username fullName")
      .sort({ createdAt: -1 })
      .limit(25)
      .lean(),
    Officer.countDocuments({ isInUnit: true, employmentStatus: "active" }),
    DailyRollcall.find({ date: { $gte: sevenDaysAgo, $lt: tomorrow } })
      .sort({ date: 1 })
      .lean(),
  ]);

  const attendeesCount =
    todayRollcall?.entries?.filter((e: IRollcallEntry) => e.status === "present").length || 0;
  const rollcallSubmitted = todayRollcall?.status === "submitted";
  const absentCount = todayRollcall?.entries
    ? todayRollcall.entries.filter((e: IRollcallEntry) => e.status === "absent").length
    : Math.max(0, totalOfficers - attendeesCount - activeLeavesCount - activeMissionsCount);

  // Build 7-day operational telemetry series
  const weeklyTrend: Array<{
    label: string;
    sublabel: string;
    primaryValue: number;
    secondaryValue: number;
  }> = [];

  for (let i = 6; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const dStr = formatDateDisplay(d).slice(0, 5); // DD-MM
    const dayName = getDayName(d);

    const matchingRollcall = weeklyRollcalls.find((rc) => {
      const rcDate = new Date(rc.date);
      return (
        rcDate.getFullYear() === d.getFullYear() &&
        rcDate.getMonth() === d.getMonth() &&
        rcDate.getDate() === d.getDate()
      );
    });

    if (matchingRollcall && matchingRollcall.entries && matchingRollcall.entries.length > 0) {
      const present = matchingRollcall.entries.filter(
        (e: IRollcallEntry) => e.status === "present"
      ).length;
      const out = Math.max(0, matchingRollcall.entries.length - present);
      weeklyTrend.push({
        label: dayName,
        sublabel: dStr,
        primaryValue: present,
        secondaryValue: out,
      });
    } else if (i === 0) {
      const estPresent = Math.max(
        0,
        totalOfficers - activeLeavesCount - activeMissionsCount
      );
      weeklyTrend.push({
        label: dayName,
        sublabel: dStr,
        primaryValue: attendeesCount > 0 ? attendeesCount : estPresent,
        secondaryValue: activeLeavesCount + activeMissionsCount,
      });
    } else {
      weeklyTrend.push({
        label: dayName,
        sublabel: dStr,
        primaryValue: 0,
        secondaryValue: 0,
      });
    }
  }

  const serializedActivities: AuditLogPopulated[] = recentActivities.map((log) => {
    const populatedUser =
      log.userId && typeof log.userId === "object"
        ? (log.userId as { username?: string; fullName?: string })
        : undefined;
    return {
      _id: String(log._id),
      userId: populatedUser
        ? {
            username: populatedUser.username,
            fullName: populatedUser.fullName,
          }
        : undefined,
      userName: log.userName || populatedUser?.fullName || populatedUser?.username || "النظام",
      action: log.action,
      createdAt:
        log.createdAt instanceof Date
          ? log.createdAt.toISOString()
          : String(log.createdAt || new Date().toISOString()),
      description: log.description || "",
    };
  });

  return {
    activeLeavesCount,
    activeMissionsCount,
    attendeesCount,
    rollcallSubmitted,
    absentCount,
    totalOfficers,
    weeklyTrend,
    recentActivities: serializedActivities,
  };
}

/**
 * 2. Fetch Active Officers Short List with Computed Operational Status
 */
export function buildOfficersShortList(
  activeOfficersList: Array<{
    _id: { toString(): string };
    fullName: string;
    rank: string;
    militaryId?: string;
    seniorityNumber?: string;
    isArkanHarb?: boolean;
    defaultLeaveSystem?: string;
  }>,
  rosterMap: Map<string, IRollcallEntry>
): OfficerOption[] {
  return activeOfficersList.map((o) => {
    const oId = o._id.toString();
    const r = formatOfficerRank(o.rank, o.isArkanHarb);
    const label = formatOfficerLabel(o.fullName, o.rank, o.isArkanHarb);

    const entry = rosterMap.get(oId);
    let operationalStatus: "إجازة" | "فرقة" | "مأمورية خارجية" | "عودة إجازة" | undefined = undefined;
    let operationalStatusDetails: string | undefined = undefined;

    if (entry?.status === "leave") {
      operationalStatus = "إجازة";
      operationalStatusDetails = entry.lockReason || entry.note || "إجازة رسمية مسجلة";
    } else if (entry?.status === "course") {
      operationalStatus = "فرقة";
      operationalStatusDetails = entry.lockReason || entry.note || "فرقة / دورة تدريبية";
    } else if (entry?.status === "external_mission") {
      operationalStatus = "مأمورية خارجية";
      operationalStatusDetails = entry.lockReason || entry.note || "مأمورية خارجية";
    } else if (entry?.isReturningToday) {
      operationalStatus = "عودة إجازة";
      operationalStatusDetails = "عودة من إجازة اليوم";
    }

    return {
      id: oId,
      name: o.fullName,
      fullName: o.fullName,
      militaryId: o.militaryId,
      seniorityNumber: o.seniorityNumber,
      rank: r,
      officerLabel: label,
      defaultLeaveSystem: o.defaultLeaveSystem || "",
      operationalStatus,
      operationalStatusDetails,
    };
  });
}

/**
 * 3. Fetch Missions Data for 3-Day Window (Yesterday, Today, Tomorrow)
 */
export async function fetchArkanHarbMissionsData(today: Date, tomorrow: Date) {
  const todayStart = new Date(today);
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date(today);
  todayEnd.setHours(23, 59, 59, 999);

  const tomorrowStart = new Date(tomorrow);
  tomorrowStart.setHours(0, 0, 0, 0);
  const tomorrowEnd = new Date(tomorrowStart);
  tomorrowEnd.setHours(23, 59, 59, 999);

  const yesterdayStart = new Date(today);
  yesterdayStart.setDate(yesterdayStart.getDate() - 1);
  yesterdayStart.setHours(0, 0, 0, 0);
  const yesterdayEnd = new Date(yesterdayStart);
  yesterdayEnd.setHours(23, 59, 59, 999);

  const [activeThreeDaysMissions, unitName] = await Promise.all([
    Mission.find({
      startDate: { $lte: tomorrowEnd },
      $or: [
        { endDate: { $gte: yesterdayStart } },
        {
          $and: [
            { $or: [{ endDate: { $exists: false } }, { endDate: null }] },
            { startDate: { $gte: yesterdayStart } },
          ],
        },
      ],
    })
      .populate("officerId", "fullName rank militaryId isArkanHarb")
      .sort({ startDate: 1 })
      .lean(),
    getUnitName(),
  ]);

  const formatMissionItem = (m: PopulatedMission): FormattedMission => {
    const officer = m.officerId as PopulatedOfficer;
    const rLabel = officer?.rank
      ? `${RANK_LABELS[officer.rank as keyof typeof RANK_LABELS] ?? officer.rank}${officer.isArkanHarb ? " أ ح" : ""}`
      : "";
    const offLabel = rLabel ? `${rLabel} / ${officer?.fullName || ""}` : (officer?.fullName || "ضابط غير معروف");

    const calculatedStatus: MissionStatus = (() => {
      if (m.status === "completed" || m.status === "cancelled" || m.status === "postponed") {
        return m.status;
      }
      const sTime = new Date(m.startDate).setHours(0, 0, 0, 0);
      const eTime = (m.endDate ? new Date(m.endDate) : new Date(m.startDate)).setHours(23, 59, 59, 999);
      const tTime = todayStart.getTime();
      if (tTime >= sTime && tTime <= eTime) {
        return "active";
      }
      if (tTime > eTime) {
        return "completed";
      }
      return m.status || "scheduled";
    })();

    return {
      id: m._id.toString(),
      officerId: officer?._id ? officer._id.toString() : (m.officerId ? String(m.officerId) : ""),
      officerName: officer?.fullName || "ضابط غير معروف",
      officerRankLabel: rLabel,
      officerLabel: offLabel,
      officerMilitaryId: officer?.militaryId || "",
      missionType: m.missionType || "external_multiday",
      title: m.title,
      description: m.description,
      destination: m.destination,
      startDate: m.startDate,
      endDate: m.endDate,
      status: calculatedStatus,
      statusReason: m.statusReason || undefined,
      resultSummary: m.resultSummary || undefined,
      linkedFaxId: m.linkedFaxId || undefined,
      createdBy: m.createdBy ? String(m.createdBy) : "",
      createdAt: m.createdAt,
    };
  };

  const tomorrowMissionsList: FormattedMission[] = [];
  const todayMissionsList: FormattedMission[] = [];
  const yesterdayMissionsList: FormattedMission[] = [];
  const ongoingMissionsList: FormattedMission[] = [];

  for (const rawDoc of activeThreeDaysMissions) {
    const m = rawDoc as unknown as PopulatedMission;
    const s = new Date(m.startDate);
    const e = m.endDate ? new Date(m.endDate) : s;
    const formatted = formatMissionItem(m);

    const sDay = new Date(s.getFullYear(), s.getMonth(), s.getDate()).getTime();
    const eDay = new Date(e.getFullYear(), e.getMonth(), e.getDate()).getTime();
    const isMultiDay = (m.missionType === "external_multiday" && Boolean(m.endDate)) || eDay > sDay;

    // 1. Ongoing multi-day mission: started before today and continues through today or future!
    // Prevents multi-day missions from duplicating into yesterday/today/tomorrow daily lists.
    if (isMultiDay && s.getTime() < todayStart.getTime() && e.getTime() >= todayStart.getTime()) {
      ongoingMissionsList.push(formatted);
      if (e.getTime() >= yesterdayStart.getTime() && e.getTime() <= yesterdayEnd.getTime()) {
        yesterdayMissionsList.push(formatted);
      }
      continue;
    }

    // 2. Tomorrow: starts tomorrow
    if (s.getTime() >= tomorrowStart.getTime() && s.getTime() <= tomorrowEnd.getTime()) {
      tomorrowMissionsList.push(formatted);
    }

    // 3. Today: starts today (single-day or day 1 of a multi-day mission)
    if (s.getTime() >= todayStart.getTime() && s.getTime() <= todayEnd.getTime()) {
      todayMissionsList.push(formatted);
    }

    // 4. Yesterday: started yesterday OR ended yesterday
    if (
      (s.getTime() >= yesterdayStart.getTime() && s.getTime() <= yesterdayEnd.getTime()) ||
      (e.getTime() >= yesterdayStart.getTime() && e.getTime() <= yesterdayEnd.getTime())
    ) {
      if (!yesterdayMissionsList.some((item) => item.id === formatted.id)) {
        yesterdayMissionsList.push(formatted);
      }
    }
  }

  // Active external missions for exclusions in leaves and rollcall
  const externalMissionOfficerIds = new Set<string>();
  for (const rawDoc of activeThreeDaysMissions) {
    const m = rawDoc as unknown as PopulatedMission & { additionalOfficerIds?: unknown[] };
    if (m.missionType !== "internal_daily" && (m.status === "active" || m.status === "scheduled")) {
      const s = new Date(m.startDate);
      const e = m.endDate ? new Date(m.endDate) : undefined;
      const coversTodayOrTomorrow = s.getTime() <= tomorrowEnd.getTime() && (!e || e.getTime() >= todayStart.getTime());
      if (coversTodayOrTomorrow) {
        if (m.officerId) {
          const offId = typeof m.officerId === "object" && "_id" in m.officerId ? m.officerId._id.toString() : String(m.officerId);
          externalMissionOfficerIds.add(offId);
        }
        if (m.additionalOfficerIds) {
          for (const addId of m.additionalOfficerIds) {
            externalMissionOfficerIds.add(String(addId));
          }
        }
      }
    }
  }

  return {
    ongoingMissionsList,
    tomorrowMissionsList,
    todayMissionsList,
    yesterdayMissionsList,
    externalMissionOfficerIds,
    unitName,
  };
}

/**
 * 4. Fetch Positions, Branches & Departments Data (Hierarchically Sorted)
 */
export async function fetchArkanHarbPositionsData() {
  const [dbBranches, dbDepartments, positionsList] = await Promise.all([
    Branch.find({ isActive: { $ne: false } }).sort({ order: 1, name: 1 }).lean(),
    Department.find({ isActive: { $ne: false } }).sort({ order: 1, name: 1 }).lean(),
    PositionAssignment.find({})
      .populate("primaryOfficerId", "fullName rank militaryId seniorityNumber isArkanHarb")
      .populate("substituteOfficerIds", "fullName rank militaryId seniorityNumber isArkanHarb")
      .populate("assignmentHistory.officerId", "fullName rank militaryId seniorityNumber isArkanHarb")
      .lean(),
  ]);

  const deptOrderMap = new Map<string, number>();
  const allDepartmentNames: string[] = [];

  dbBranches.forEach((b: { _id?: unknown; name: string }, bIdx: number) => {
    const branchScore = (bIdx + 1) * 1000;
    deptOrderMap.set(b.name, branchScore);
    if (!allDepartmentNames.includes(b.name)) {
      allDepartmentNames.push(b.name);
    }

    const childDeps = dbDepartments.filter((d: { branchId?: unknown }) => {
      const bId =
        typeof d.branchId === "object" && d.branchId !== null && "_id" in d.branchId
          ? String((d.branchId as { _id: unknown })._id)
          : String(d.branchId);
      return b._id && bId === String(b._id);
    });

    childDeps.forEach((d: { name: string }, dIdx: number) => {
      const depScore = branchScore + (dIdx + 1);
      deptOrderMap.set(d.name, depScore);
      deptOrderMap.set(`${b.name} / ${d.name}`, depScore);
      if (!allDepartmentNames.includes(d.name)) {
        allDepartmentNames.push(d.name);
      }
    });
  });

  dbDepartments.forEach((d: { name: string }, dIdx: number) => {
    if (!deptOrderMap.has(d.name)) {
      deptOrderMap.set(d.name, 90000 + dIdx);
      if (!allDepartmentNames.includes(d.name)) {
        allDepartmentNames.push(d.name);
      }
    }
  });

  const sortedPositionsList = [...positionsList].sort((a, b) => {
    const orderA = deptOrderMap.get(a.department) ?? 99999;
    const orderB = deptOrderMap.get(b.department) ?? 99999;
    if (orderA !== orderB) return orderA - orderB;
    return (a.positionTitle || "").localeCompare(b.positionTitle || "", "ar");
  });

  const primaryPosMap = new Map<string, string>();
  const substitutePosMap = new Map<string, string>();

  const formattedPositions: PositionRowData[] = sortedPositionsList.map((p) => {
    if (p.primaryOfficerId) {
      const pId = typeof p.primaryOfficerId === "object" && "_id" in p.primaryOfficerId
        ? String((p.primaryOfficerId as { _id: unknown })._id)
        : String(p.primaryOfficerId);
      primaryPosMap.set(pId, p.positionTitle);
    }
    if (p.substituteOfficerIds && p.substituteOfficerIds.length > 0) {
      for (const subId of p.substituteOfficerIds) {
        const sId = typeof subId === "object" && subId !== null && "_id" in subId
          ? String((subId as { _id: unknown })._id)
          : String(subId);
        substitutePosMap.set(sId, p.positionTitle);
      }
    }

    const primary =
      p.primaryOfficerId && typeof p.primaryOfficerId === "object" && "fullName" in p.primaryOfficerId
        ? {
            id: (p.primaryOfficerId as unknown as PopulatedOfficer)._id.toString(),
            fullName: (p.primaryOfficerId as unknown as PopulatedOfficer).fullName,
            rank: (p.primaryOfficerId as unknown as PopulatedOfficer).rank,
            militaryId: (p.primaryOfficerId as unknown as PopulatedOfficer).militaryId,
            seniorityNumber: (p.primaryOfficerId as unknown as PopulatedOfficer).seniorityNumber,
            isArkanHarb: (p.primaryOfficerId as unknown as PopulatedOfficer).isArkanHarb,
          }
        : null;

    const subs = (p.substituteOfficerIds || []).map((sub: unknown) => {
      if (typeof sub === "object" && sub && "fullName" in sub) {
        const s = sub as unknown as PopulatedOfficer;
        return {
          id: s._id.toString(),
          fullName: s.fullName,
          rank: s.rank,
          militaryId: s.militaryId,
          seniorityNumber: s.seniorityNumber,
          isArkanHarb: s.isArkanHarb,
        };
      }
      return { id: String(sub), fullName: String(sub), rank: "" };
    });

    const history = (p.assignmentHistory || []).map(
      (h: {
        _id?: { toString(): string };
        officerId?: unknown;
        role?: string;
        startDate?: Date | string;
        endDate?: Date | string | null;
        orderNumber?: string;
        notes?: string;
      }) => {
        let offData:
          | {
              id: string;
              fullName: string;
              rank: string;
              militaryId?: string;
              seniorityNumber?: string;
              isArkanHarb?: boolean;
            }
          | string
          | null = null;
        if (h.officerId && typeof h.officerId === "object" && "_id" in h.officerId) {
          const offObj = h.officerId as PopulatedOfficer;
          offData = {
            id: offObj._id.toString(),
            fullName: offObj.fullName,
            rank: offObj.rank,
            militaryId: offObj.militaryId,
            seniorityNumber: offObj.seniorityNumber,
            isArkanHarb: offObj.isArkanHarb,
          };
        } else if (h.officerId) {
          offData = String(h.officerId);
        }

        return {
          _id: h._id ? h._id.toString() : undefined,
          officerId: offData,
          role: h.role,
          startDate: h.startDate ? (h.startDate instanceof Date ? h.startDate.toISOString() : String(h.startDate)) : "",
          endDate: h.endDate ? (h.endDate instanceof Date ? h.endDate.toISOString() : String(h.endDate)) : null,
          orderNumber: h.orderNumber || "",
          notes: h.notes || "",
        };
      }
    );

    return {
      id: p._id.toString(),
      positionTitle: p.positionTitle,
      department: p.department || "القيادة",
      primaryOfficer: primary,
      substituteOfficers: subs,
      hasNoSubstitute: Boolean(p.hasNoSubstitute),
      assignmentHistory: history,
      orderNumber: p.orderNumber || "",
      notes: p.notes || "",
    };
  });

  return {
    formattedPositions,
    allDepartmentNames,
    primaryPosMap,
    substitutePosMap,
  };
}

/**
 * 5. Fetch Leaves Page Data (Officer Rows, Pending Requests, Commander Sync)
 */
export async function fetchArkanHarbLeavesData({
  userRole,
  today,
  qDate,
  activeOfficersList,
  officersShort,
  externalMissionOfficerIds,
}: {
  userRole: string;
  today: Date;
  qDate: Date;
  activeOfficersList: Array<{
    _id: { toString(): string };
    fullName: string;
    rank: string;
    militaryId?: string;
    seniorityNumber?: string;
    isArkanHarb?: boolean;
    createdAt?: Date | string;
    defaultLeaveSystem?: string;
    isInUnit?: boolean;
  }>;
  officersShort: OfficerOption[];
  externalMissionOfficerIds: Set<string>;
}) {
  const activeOfficerIds = activeOfficersList.map((o) => o._id);
  const allLeaves = await Leave.find({
    officerId: { $in: activeOfficerIds },
    status: { $ne: "cancelled" },
  })
    .populate("actingOfficerId", "fullName rank isArkanHarb")
    .sort({ startDate: -1 })
    .lean();

  const officerShortMap = new Map(officersShort.map((o) => [o.id, o]));
  const leavesByOfficerMap = new Map<string, typeof allLeaves>();
  for (const l of allLeaves) {
    if (!l.officerId) continue;
    const key = l.officerId.toString();
    const bucket = leavesByOfficerMap.get(key);
    if (bucket) bucket.push(l);
    else leavesByOfficerMap.set(key, [l]);
  }

  const pendingRequestsFormatted: LeaveItem[] = allLeaves
    .filter((l) => l.status === "pending_commander" || l.status === "extension_pending")
    .map((l) => {
      const actingObj = l.actingOfficerId as unknown as
        | { _id?: unknown; fullName?: string; rank?: string; isArkanHarb?: boolean }
        | undefined;
      const actingIdStr = actingObj?._id ? String(actingObj._id) : (l.actingOfficerId ? String(l.actingOfficerId) : undefined);
      const officerFromShort = actingIdStr ? officerShortMap.get(actingIdStr) : undefined;
      const actingOfficerLabel = actingObj?.fullName
        ? formatOfficerLabel(actingObj.fullName, actingObj.rank, actingObj.isArkanHarb)
        : (officerFromShort?.officerLabel || undefined);
      const actingOfficerName = actingObj?.fullName || officerFromShort?.fullName;
      const reqOfficer = officerShortMap.get(l.officerId.toString());

      return {
        id: l._id.toString(),
        officerId: l.officerId.toString(),
        officerName: reqOfficer?.fullName || "ضابط غير معروف",
        officerMilitaryId: reqOfficer?.militaryId || "",
        category: l.category,
        categoryLabel: l.category === "leave" ? "إجازة رسمية" : "غياب / انقطاع",
        type: l.type,
        typeLabel: l.type,
        startDate: l.startDate instanceof Date ? l.startDate.toISOString() : String(l.startDate || ""),
        endDate: l.endDate instanceof Date ? l.endDate.toISOString() : String(l.endDate || ""),
        status: l.status,
        statusLabel: l.status,
        medicalReportUrl: l.medicalReportUrl,
        viewedByCommander: Boolean(l.viewedByCommander),
        actingOfficerId: actingIdStr,
        actingOfficerName,
        actingOfficerLabel,
        isActingOfficerPresentConfirmed: Boolean(l.isActingOfficerPresentConfirmed),
      };
    });

  const officerRows: OfficerLeaveStatusRow[] = activeOfficersList.map((o) => {
    const oId = o._id.toString();
    const r = formatOfficerRank(o.rank, o.isArkanHarb);
    const label = formatOfficerLabel(o.fullName, o.rank, o.isArkanHarb);

    const officerLeaves = leavesByOfficerMap.get(oId) || [];

    const returningLeaveDoc = officerLeaves.find((l) => {
      if (l.isReturnConfirmed) return false;
      if (l.actualReturnDate) {
        return getUtcDayRange(l.actualReturnDate).startOfDay.getTime() === qDate.getTime();
      }
      if (l.status === "approved") {
        return getUtcDayRange(l.endDate).nextDay.getTime() === qDate.getTime();
      }
      return false;
    });
    const isReturningToday = Boolean(returningLeaveDoc);

    const activeLeaveDoc = !isReturningToday
      ? officerLeaves.find((l) => {
          if (l.status !== "approved") return false;
          const s = getUtcDayRange(l.startDate).startOfDay;
          const e = getUtcDayRange(l.endDate).startOfDay;
          return qDate.getTime() >= s.getTime() && qDate.getTime() <= e.getTime();
        })
      : undefined;

    const pendingLeaveDoc = officerLeaves.find((l) => l.status === "pending_commander");
    const pendingExtensionDoc = officerLeaves.find((l) => l.status === "extension_pending");
    const interruptedLeaveDoc = officerLeaves.find((l) => l.status === "interrupted" && !l.isResumed);

    const lastCompletedDoc = officerLeaves.find((l) => {
      if (l.status === "interrupted" || l.status === "closed") {
        const ret = l.actualReturnDate ? new Date(l.actualReturnDate) : new Date(l.endDate);
        ret.setHours(23, 59, 59, 999);
        return ret <= today;
      }
      if (l.status === "approved") {
        const e = new Date(l.endDate);
        e.setHours(23, 59, 59, 999);
        return e < today;
      }
      return false;
    });

    let lastReturnDateFormatted = "لا توجد عودة مسجلة";
    let presenceDurationDays = 0;
    let lastReturnDateIso: string | undefined = undefined;

    if (lastCompletedDoc) {
      const returnDate = lastCompletedDoc.actualReturnDate
        ? new Date(lastCompletedDoc.actualReturnDate)
        : new Date(lastCompletedDoc.endDate);
      if (!isNaN(returnDate.getTime())) {
        lastReturnDateIso = returnDate.toISOString();
        lastReturnDateFormatted = formatDateWithDay(returnDate);
        const diffTime = Math.max(0, today.getTime() - returnDate.getTime());
        presenceDurationDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
      }
    } else if (o.createdAt) {
      const regDate = new Date(o.createdAt);
      if (!isNaN(regDate.getTime())) {
        lastReturnDateIso = regDate.toISOString();
        lastReturnDateFormatted = formatDateWithDay(regDate);
        const diffTime = Math.max(0, today.getTime() - regDate.getTime());
        presenceDurationDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
      }
    }

    const formatLeaveDoc = (doc?: (typeof allLeaves)[0]) => {
      if (!doc) return undefined;
      const actingObj = doc.actingOfficerId as unknown as
        | { _id?: unknown; fullName?: string; rank?: string; isArkanHarb?: boolean }
        | undefined;
      const actingIdStr = actingObj?._id ? String(actingObj._id) : (doc.actingOfficerId ? String(doc.actingOfficerId) : undefined);
      const officerFromShort = actingIdStr ? officersShort.find((off) => off.id === actingIdStr) : undefined;
      const actingOfficerLabel = actingObj?.fullName
        ? formatOfficerLabel(actingObj.fullName, actingObj.rank, actingObj.isArkanHarb)
        : (officerFromShort?.officerLabel || undefined);
      const actingOfficerName = actingObj?.fullName || officerFromShort?.fullName;
      const tLabel = LEAVE_TYPE_LABELS[doc.type as keyof typeof LEAVE_TYPE_LABELS] || doc.type || "إجازة اعتيادية";

      return {
        id: doc._id.toString(),
        officerId: doc.officerId.toString(),
        officerName: o.fullName,
        officerLabel: label,
        officerMilitaryId: o.militaryId || "",
        category: doc.category,
        categoryLabel: doc.category === "leave" ? "إجازة رسمية" : "غياب / انقطاع",
        type: doc.type,
        typeLabel: tLabel,
        startDate: doc.startDate instanceof Date ? doc.startDate.toISOString() : String(doc.startDate || ""),
        endDate: doc.endDate instanceof Date ? doc.endDate.toISOString() : String(doc.endDate || ""),
        lastReturnDate: doc.lastReturnDate
          ? doc.lastReturnDate instanceof Date
            ? doc.lastReturnDate.toISOString()
            : String(doc.lastReturnDate)
          : undefined,
        presenceDurationDays:
          typeof doc.presenceDurationDays === "number" && !isNaN(doc.presenceDurationDays)
            ? doc.presenceDurationDays
            : 0,
        actingOfficerId: actingIdStr,
        actingOfficerName,
        actingOfficerLabel,
        isActingOfficerPresentConfirmed: Boolean(doc.isActingOfficerPresentConfirmed),
        commanderDecision: doc.commanderDecision
          ? {
              status: doc.commanderDecision.status,
              notes: doc.commanderDecision.notes,
              decidedAt: doc.commanderDecision.decidedAt
                ? doc.commanderDecision.decidedAt instanceof Date
                  ? doc.commanderDecision.decidedAt.toISOString()
                  : String(doc.commanderDecision.decidedAt)
                : undefined,
            }
          : undefined,
        actualReturnDate: doc.actualReturnDate
          ? doc.actualReturnDate instanceof Date
            ? doc.actualReturnDate.toISOString()
            : String(doc.actualReturnDate)
          : undefined,
        originalEndDate: doc.originalEndDate
          ? doc.originalEndDate instanceof Date
            ? doc.originalEndDate.toISOString()
            : String(doc.originalEndDate)
          : undefined,
        isResumed: Boolean(doc.isResumed),
        resumedLeaveId: doc.resumedLeaveId ? doc.resumedLeaveId.toString() : undefined,
        isReturnConfirmed: Boolean(doc.isReturnConfirmed),
        viewedByCommander: Boolean(doc.viewedByCommander),
        reason: doc.reason || "",
        medicalReportUrl: doc.medicalReportUrl,
        status: doc.status,
        statusLabel: doc.status,
      };
    };

    return {
      officerId: oId,
      fullName: o.fullName,
      rank: o.rank,
      rankLabel: r,
      officerLabel: label,
      militaryId: o.militaryId || "",
      seniorityNumber: o.seniorityNumber || "",
      defaultLeaveSystem: o.defaultLeaveSystem || "",
      activeLeave: formatLeaveDoc(activeLeaveDoc || returningLeaveDoc),
      pendingLeave: formatLeaveDoc(pendingLeaveDoc),
      pendingExtension: formatLeaveDoc(pendingExtensionDoc),
      lastCompletedLeave: formatLeaveDoc(lastCompletedDoc),
      interruptedLeave: formatLeaveDoc(interruptedLeaveDoc),
      lastReturnDate: lastReturnDateIso,
      lastReturnDateFormatted,
      presenceDurationDays,
      isInUnit: o.isInUnit !== false,
      isExternalMission: externalMissionOfficerIds.has(oId),
      isReturningToday,
    };
  });

  return {
    pendingRequestsFormatted,
    officerRows,
  };
}

/**
 * 6. Fetch & Build Enriched Rollcall Officers Data & Tables
 */
export async function fetchArkanHarbRollcallData({
  rollcallDate,
  selectedRollcall,
  latestRollcallWithTables,
  officerRows,
  rosterMap,
  primaryPosMap,
  substitutePosMap,
  isRollcallSubmitted,
  todayMissionsList,
  activeOfficersList,
}: {
  rollcallDate: string;
  selectedRollcall: {
    entries?: IRollcallEntry[];
    customTables?: ICustomRollcallTable[];
    confirmedOfficerIds?: string[];
    status?: string;
  } | null;
  latestRollcallWithTables: {
    customTables?: ICustomRollcallTable[];
  } | null;
  officerRows: OfficerLeaveStatusRow[];
  rosterMap: Map<string, IRollcallEntry>;
  primaryPosMap: Map<string, string>;
  substitutePosMap: Map<string, string>;
  isRollcallSubmitted: boolean;
  todayMissionsList: FormattedMission[];
  activeOfficersList: Array<{ _id: { toString(): string } }>;
}) {
  const existingEntriesMap = new Map<string, IRollcallEntry>(
    (selectedRollcall?.entries || []).map((e: unknown) => {
      const entry = e as IRollcallEntry;
      return [entry.officerId ? entry.officerId.toString() : "", entry];
    })
  );

  // Check duty roster for today's unit duty officer
  const rollcallDateObj = new Date(rollcallDate + "T12:00:00.000Z");
  const currentDutyRoster = await DutyRoster.findOne({
    $or: [
      { startDate: { $lte: rollcallDateObj }, endDate: { $gte: rollcallDateObj } },
      {
        "entries.date": {
          $gte: new Date(rollcallDate + "T00:00:00.000Z"),
          $lte: new Date(rollcallDate + "T23:59:59.999Z"),
        },
      },
    ],
  }).lean();

  const todayDutyMap = new Map<string, string>();
  if (currentDutyRoster?.entries) {
    for (const e of currentDutyRoster.entries) {
      const dStr = e.date instanceof Date ? e.date.toISOString().split("T")[0] : String(e.date).split("T")[0];
      if (dStr === rollcallDate && e.assignedOfficerId) {
        todayDutyMap.set(e.assignedOfficerId.toString(), e.dutyTitle);
      }
    }
  }

  const rollcallOfficersData: RollcallOfficerData[] = officerRows.map((o) => {
    const existingEntry = existingEntriesMap.get(o.officerId);
    const sug = rosterMap.get(o.officerId);

    const primaryTitle = primaryPosMap.get(o.officerId) || "ـ";
    const subTitle = substitutePosMap.get(o.officerId) || "ـ";

    let lastReturnDay = "ـ";
    let lastReturnOnly = "ـ";
    if (o.lastReturnDate) {
      lastReturnDay = getDayName(o.lastReturnDate);
      lastReturnOnly = formatDateDisplay(o.lastReturnDate);
    } else if (o.lastReturnDateFormatted && o.lastReturnDateFormatted !== "لا توجد عودة مسجلة") {
      const parts = o.lastReturnDateFormatted.split(" ");
      if (parts.length >= 2) {
        lastReturnDay = parts[0];
        lastReturnOnly = parts.slice(1).join(" ");
      } else {
        lastReturnOnly = o.lastReturnDateFormatted;
      }
    }

    let status: RollcallOfficerData["status"];
    let note: string | undefined;
    let isLocked: boolean;
    let lockReason: string | undefined;
    let leaveTypeLabel: string | undefined;
    let leaveStartDate: string | undefined;
    let leaveEndDate: string | undefined;

    const isSpecialRollcallStatus =
      existingEntry &&
      (existingEntry.status === "custom_present" ||
        existingEntry.status === "custom_out" ||
        existingEntry.status === "clinic" ||
        existingEntry.status === "hospital" ||
        existingEntry.status === "prison" ||
        existingEntry.status === "unit_arrest" ||
        existingEntry.status === "court" ||
        existingEntry.status === "travel_abroad" ||
        existingEntry.status === "rest" ||
        existingEntry.status === "absent");

    if (isRollcallSubmitted && existingEntry) {
      status = existingEntry.status as RollcallOfficerData["status"];
      note = existingEntry.note || (o.isReturningToday ? "عودة من إجازة" : undefined);
      isLocked = Boolean(existingEntry.isLocked);
      lockReason = existingEntry.lockReason || undefined;
      leaveTypeLabel = existingEntry.leaveTypeLabel || o.activeLeave?.typeLabel;
      leaveStartDate = existingEntry.leaveStartDate || o.activeLeave?.startDate;
      leaveEndDate = existingEntry.leaveEndDate || o.activeLeave?.endDate;
    } else if (existingEntry) {
      if (sug?.isLocked && !isSpecialRollcallStatus) {
        status = sug.status as RollcallOfficerData["status"];
        isLocked = true;
        lockReason = sug.lockReason;
        note = existingEntry.note || sug.note;
      } else if (!sug?.isLocked && (existingEntry.sourceType === "mission" || existingEntry.sourceType === "leave")) {
        status = isSpecialRollcallStatus ? (existingEntry.status as RollcallOfficerData["status"]) : "present";
        isLocked = false;
        lockReason = undefined;
        note = existingEntry.note;
      } else {
        status = existingEntry.status as RollcallOfficerData["status"];
        isLocked = Boolean(existingEntry.isLocked);
        lockReason = existingEntry.lockReason || undefined;
        note = existingEntry.note || sug?.note;
      }
      leaveTypeLabel = sug?.leaveTypeLabel || existingEntry.leaveTypeLabel || o.activeLeave?.typeLabel;
      leaveStartDate = sug?.leaveStartDate || existingEntry.leaveStartDate || o.activeLeave?.startDate;
      leaveEndDate = sug?.leaveEndDate || existingEntry.leaveEndDate || o.activeLeave?.endDate;
    } else {
      status = (sug?.status || "present") as RollcallOfficerData["status"];
      if (o.isReturningToday) {
        status = "present";
      }
      let autoNote: string | undefined = undefined;
      if (o.isReturningToday) {
        autoNote = "عودة من إجازة";
      } else if (sug?.note) {
        autoNote = sug.note;
      }
      note = autoNote;
      isLocked = o.isReturningToday ? false : Boolean(sug?.isLocked);
      lockReason = o.isReturningToday ? undefined : sug?.lockReason;
      leaveTypeLabel = sug?.leaveTypeLabel || o.activeLeave?.typeLabel;
      leaveStartDate = sug?.leaveStartDate || o.activeLeave?.startDate;
      leaveEndDate = sug?.leaveEndDate || o.activeLeave?.endDate;
    }

    const offMission = todayMissionsList.find(
      (m) => m.officerId === o.officerId && (m.status === "active" || m.status === "scheduled")
    );

    return {
      id: o.officerId,
      militaryId: o.militaryId,
      fullName: o.fullName,
      rank: o.rank,
      rankLabel: o.rankLabel,
      seniorityNumber: o.seniorityNumber,
      primaryPositionTitle: primaryTitle,
      substitutePositionTitle: subTitle,
      lastReturnDateFormatted: o.lastReturnDateFormatted,
      lastReturnDayName: lastReturnDay,
      lastReturnDateOnly: lastReturnOnly,
      presenceDurationDays: o.presenceDurationDays,
      status,
      note,
      isLocked,
      lockReason,
      leaveTypeLabel,
      leaveStartDate,
      leaveEndDate,
      isReturningToday: o.isReturningToday,
      hospitalName: existingEntry?.hospitalName || sug?.hospitalName,
      hospitalAdmissionDate: existingEntry?.hospitalAdmissionDate || sug?.hospitalAdmissionDate,
      disciplinaryType: (existingEntry?.disciplinaryType || sug?.disciplinaryType) as RollcallOfficerData["disciplinaryType"],
      disciplinaryAuthority: existingEntry?.disciplinaryAuthority || sug?.disciplinaryAuthority,
      travelDestination: existingEntry?.travelDestination || sug?.travelDestination,
      travelPurpose: existingEntry?.travelPurpose || sug?.travelPurpose,
      statusStartDate: existingEntry?.statusStartDate || sug?.statusStartDate,
      statusEndDate: existingEntry?.statusEndDate || sug?.statusEndDate,
      customReason: existingEntry?.customReason || sug?.customReason,
      missionTitle: sug?.missionTitle || existingEntry?.missionTitle || offMission?.title,
      missionDestination: sug?.missionDestination || existingEntry?.missionDestination || offMission?.destination,
      missionStartDate: sug?.missionStartDate || (offMission?.startDate ? new Date(offMission.startDate).toISOString() : undefined),
      missionEndDate: sug?.missionEndDate || (offMission?.endDate ? new Date(offMission.endDate).toISOString() : undefined),
      isCourse:
        sug?.isCourse ??
        existingEntry?.isCourse ??
        (offMission?.title ? offMission.title.includes("فرقة") || offMission.title.includes("دورة") : false),
      isUnitDutyOfficer: todayDutyMap.has(o.officerId),
      dutyTitle: todayDutyMap.get(o.officerId),
    };
  });

  const rawCustomTables = (
    selectedRollcall?.customTables && selectedRollcall.customTables.length > 0
      ? selectedRollcall.customTables
      : latestRollcallWithTables?.customTables || []
  ) as unknown as {
    id: unknown;
    name: unknown;
    isInsideUnit?: unknown;
    officerIds?: unknown[];
    officerTasks?: Record<string, string> | Map<string, string>;
    notes?: unknown;
  }[];

  const activeOfficerIdSet = new Set(activeOfficersList.map((o) => o._id.toString()));

  const serializedCustomTables: ICustomRollcallTable[] = rawCustomTables.map((tbl) => {
    let officerTasksObj: Record<string, string> | undefined = undefined;
    if (tbl.officerTasks) {
      if (tbl.officerTasks instanceof Map) {
        officerTasksObj = Object.fromEntries(tbl.officerTasks);
      } else if (typeof tbl.officerTasks === "object") {
        officerTasksObj = { ...(tbl.officerTasks as Record<string, string>) };
      }
    }

    return {
      id: String(tbl.id),
      name: String(tbl.name),
      isInsideUnit: Boolean(tbl.isInsideUnit),
      officerIds: (tbl.officerIds || [])
        .map((id: unknown) =>
          typeof id === "object" && id !== null && "_id" in id
            ? String((id as { _id: unknown })._id)
            : String(id)
        )
        .filter((id: string) => activeOfficerIdSet.has(id)),
      officerTasks: officerTasksObj,
      notes: tbl.notes ? String(tbl.notes) : undefined,
    };
  });

  const initialConfirmedOfficerIds = (selectedRollcall?.confirmedOfficerIds || [])
    .map((id: unknown) => (id ? String(id) : ""))
    .filter(Boolean);

  return {
    rollcallOfficersData,
    serializedCustomTables,
    initialConfirmedOfficerIds,
  };
}

/**
 * 7. Fetch Commander Decisions and Staff Ops Notifications
 */
export async function fetchCommanderDecisionsData(searchQuery?: string) {
  const commanderDecisions = (await Leave.find({
    "commanderDecision.decidedAt": { $exists: true },
  })
    .populate("officerId", "rank fullName militaryId seniorityNumber isArkanHarb")
    .sort({ "commanderDecision.decidedAt": -1 })
    .limit(40)
    .lean()) as unknown as PopulatedCommanderDecisionDoc[];

  const totalDecisions = commanderDecisions.length;
  const approvedDecisions = commanderDecisions.filter(
    (d) => d.commanderDecision?.status === "approved"
  ).length;
  const rejectedDecisions = commanderDecisions.filter(
    (d) => d.commanderDecision?.status === "rejected"
  ).length;
  const otherOrdersDecisions = commanderDecisions.filter(
    (d) => d.commanderDecision?.status === "other_orders"
  ).length;

  const dSearch = (searchQuery || "").trim().toLowerCase();
  const displayedDecisions = dSearch
    ? commanderDecisions.filter((dec) => {
        const off = dec.officerId as unknown as PopulatedOfficer | null;
        const name = (off?.fullName || "").toLowerCase();
        const rank = (off?.rank || "").toLowerCase();
        const mil = (off?.militaryId || "").toLowerCase();
        const notes = (dec.commanderDecision?.notes || "").toLowerCase();
        const type = (dec.type || "").toLowerCase();
        return (
          name.includes(dSearch) ||
          rank.includes(dSearch) ||
          mil.includes(dSearch) ||
          notes.includes(dSearch) ||
          type.includes(dSearch)
        );
      })
    : commanderDecisions;

  return {
    totalDecisions,
    approvedDecisions,
    rejectedDecisions,
    otherOrdersDecisions,
    displayedDecisions,
    totalCount: commanderDecisions.length,
    searchQuery: dSearch,
  };
}
