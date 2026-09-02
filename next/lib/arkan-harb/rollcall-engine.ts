import { Types } from "mongoose";
import { Officer, RANK_WEIGHTS } from "@/lib/db/models/Officer";
import { Leave } from "@/lib/db/models/Leave";
import { Mission } from "@/lib/db/models/Mission";
import { PositionAssignment } from "@/lib/db/models/PositionAssignment";
import {
  type IRollcallEntry,
  type RollcallStatus,
  computeRollcallBreakdown,
  type RollcallBreakdown,
} from "@/lib/db/models/DailyRollcall.shared";

export { computeRollcallBreakdown, type RollcallBreakdown };

export interface RollcallConflictAlert {
  officerId: string;
  officerName: string;
  rankLabel: string;
  type: "overlap" | "overdue_leave" | "overdue_mission" | "mandatory_position_vacant";
  message: string;
}

/**
}

/**
 * Auto-calculates or syncs the daily rollcall for a given date.
 * Automatically checks active leaves and missions for every active officer.
 */
export async function calculateDailyRollcallEntries(targetDate: Date): Promise<IRollcallEntry[]> {
  const startOfDay = new Date(targetDate);
  startOfDay.setHours(0, 0, 0, 0);

  const endOfDay = new Date(targetDate);
  endOfDay.setHours(23, 59, 59, 999);

  // 1. Fetch active officers sorted by Rank Seniority then fullName
  const activeOfficers = await Officer.find({ employmentStatus: "active" }).lean();
  activeOfficers.sort((a, b) => {
    const weightA = RANK_WEIGHTS[a.rank as keyof typeof RANK_WEIGHTS] ?? 99;
    const weightB = RANK_WEIGHTS[b.rank as keyof typeof RANK_WEIGHTS] ?? 99;
    if (weightA !== weightB) return weightA - weightB;
    return a.fullName.localeCompare(b.fullName, "ar");
  });

  // 2. Fetch active approved leaves for startOfDay..endOfDay
  const activeLeaves = await Leave.find({
    status: { $in: ["approved", "interrupted"] },
    startDate: { $lte: endOfDay },
    $or: [{ endDate: { $gte: startOfDay } }, { actualReturnDate: { $gt: startOfDay } }],
  }).lean();

  const leaveMap = new Map<string, typeof activeLeaves[0]>();
  for (const l of activeLeaves) {
    if (l.actualReturnDate && new Date(l.actualReturnDate) <= startOfDay) {
      continue;
    }
    leaveMap.set(l.officerId.toString(), l);
  }

  // 3. Fetch active missions covering targetDate
  const activeMissions = await Mission.find({
    status: { $in: ["active", "scheduled"] },
    startDate: { $lte: endOfDay },
    $or: [{ endDate: { $exists: false } }, { endDate: { $gte: startOfDay } }],
  }).lean();

  const missionMap = new Map<string, typeof activeMissions[0]>();
  for (const m of activeMissions) {
    missionMap.set(m.officerId.toString(), m);
    if (m.additionalOfficerIds && m.additionalOfficerIds.length > 0) {
      for (const addId of m.additionalOfficerIds) {
        missionMap.set(addId.toString(), m);
      }
    }
  }

  // 4. Build entries
  const entries: IRollcallEntry[] = activeOfficers.map((officer) => {
    const offId = officer._id.toString();
    const l = leaveMap.get(offId);
    const m = missionMap.get(offId);

    let status: RollcallStatus = "present";
    let relatedLeaveId: Types.ObjectId | undefined;
    let relatedMissionId: Types.ObjectId | undefined;

    if (l) {
      status = "leave";
      relatedLeaveId = l._id as Types.ObjectId;
    } else if (m) {
      if (m.missionType === "internal_daily") {
        status = "daily_mission";
      } else {
        status = "external_mission";
      }
      relatedMissionId = m._id as Types.ObjectId;
    }

    return {
      officerId: officer._id as Types.ObjectId,
      militaryId: officer.militaryId,
      fullName: officer.fullName,
      rank: officer.rank,
      status,
      relatedLeaveId,
      relatedMissionId,
    };
  });

  return entries;
}

/**
 * Detects conflicts, overdues, and mandatory position vacancies.
 */
export async function detectRollcallConflicts(targetDate: Date): Promise<RollcallConflictAlert[]> {
  const alerts: RollcallConflictAlert[] = [];
  const startOfDay = new Date(targetDate);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(targetDate);
  endOfDay.setHours(23, 59, 59, 999);

  // 1. Detect overlapping leave & mission
  const activeLeaves = await Leave.find({
    status: "approved",
    startDate: { $lte: endOfDay },
    endDate: { $gte: startOfDay },
  }).populate("officerId", "fullName rank").lean();

  const activeMissions = await Mission.find({
    status: { $in: ["active", "scheduled"] },
    startDate: { $lte: endOfDay },
    $or: [{ endDate: { $exists: false } }, { endDate: { $gte: startOfDay } }],
  }).populate("officerId", "fullName rank").lean();

  const leaveOfficerIds = new Set(activeLeaves.map(l => l.officerId?._id?.toString() || l.officerId?.toString()));

  for (const m of activeMissions) {
    const mOffId = (m.officerId as unknown as { _id: { toString(): string } })?._id?.toString() || m.officerId?.toString();
    if (mOffId && leaveOfficerIds.has(mOffId)) {
      const officer = m.officerId as unknown as { fullName?: string; rank?: string };
      alerts.push({
        officerId: mOffId,
        officerName: officer?.fullName || "ضابط",
        rankLabel: officer?.rank || "",
        type: "overlap",
        message: `تعارض: الضابط مسجل له إجازة ومأمورية نشطة في نفس اليوم (${targetDate.toLocaleDateString("ar-EG")}).`,
      });
    }
  }

  // 2. Detect positions where primary officer is on leave without an available substitute
  const positions = await PositionAssignment.find({ primaryOfficerId: { $ne: null } })
    .populate("primaryOfficerId", "fullName rank employmentStatus")
    .populate("substituteOfficerIds", "fullName rank employmentStatus")
    .lean();

  for (const pos of positions) {
    const primaryOff = pos.primaryOfficerId as unknown as { _id: { toString(): string }; fullName?: string; employmentStatus?: string } | undefined;
    const substituteOfficers = (pos.substituteOfficerIds || []) as unknown as { _id: { toString(): string }; fullName?: string; employmentStatus?: string }[];

    if (primaryOff) {
      const isPrimaryLeave = leaveOfficerIds.has(primaryOff._id.toString());
      const hasAvailableSubstitute = substituteOfficers.some((sub) => !leaveOfficerIds.has(sub._id.toString()));

      if (isPrimaryLeave && !hasAvailableSubstitute) {
        alerts.push({
          officerId: primaryOff._id.toString(),
          officerName: primaryOff.fullName || "ضابط",
          rankLabel: "",
          type: "mandatory_position_vacant",
          message: `تنبيه وظيفة: الضابط الأساسي لوظيفة "${pos.positionTitle}" في إجازة، ولا يوجد ضابط بديل متاح لهذه الوظيفة.`,
        });
      }
    }
  }

  return alerts;
}
