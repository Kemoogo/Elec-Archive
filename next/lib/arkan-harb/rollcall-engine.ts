import { Types } from "mongoose";
import { Officer, RANK_WEIGHTS } from "@/lib/db/models/Officer";
import { Leave } from "@/lib/db/models/Leave";
import { LEAVE_TYPE_LABELS } from "@/lib/db/models/Leave.shared";
import { Mission } from "@/lib/db/models/Mission";
import { PositionAssignment } from "@/lib/db/models/PositionAssignment";
import { MedicalPatient } from "@/lib/db/models/MedicalPatient";
import { MedicalVisit } from "@/lib/db/models/MedicalVisit";
import { connectToDatabase } from "@/lib/db/connect";
import { Course } from "@/lib/db/models/Course";
import {
  type IRollcallEntry,
  type RollcallStatus,
  computeRollcallBreakdown,
  type RollcallBreakdown,
} from "@/lib/db/models/DailyRollcall.shared";
import { formatDateDisplay } from "@/lib/utils/date-display";

export { computeRollcallBreakdown, type RollcallBreakdown };

export interface SuggestedRollcallEntry {
  officerId: string;
  militaryId: string;
  fullName: string;
  rank: string;
  suggestedStatus: RollcallStatus;
  reason: string;
  relatedId?: string;
}

export interface RollcallConflictAlert {
  officerId: string;
  officerName: string;
  rankLabel: string;
  type: "overlap" | "overdue_leave" | "overdue_mission" | "mandatory_position_vacant";
  message: string;
}

/**
 * Normalizes any date input (string "YYYY-MM-DD" or Date object) into pure UTC date boundaries.
 * Prevents local timezone shifts (e.g. UTC+2 / UTC+3 in Egypt shifting UTC timestamp to previous day).
 */
export function getUtcDayRange(dateInput: string | Date): {
  startOfDay: Date;
  endOfDay: Date;
  nextDay: Date;
  utcDate: Date;
} {
  let year: number;
  let month: number;
  let day: number;

  if (typeof dateInput === "string") {
    const datePart = dateInput.split("T")[0];
    const parts = datePart.split("-").map(Number);
    year = parts[0];
    month = parts[1] - 1;
    day = parts[2];
  } else {
    year = dateInput.getFullYear();
    month = dateInput.getMonth();
    day = dateInput.getDate();
  }

  const startOfDay = new Date(Date.UTC(year, month, day, 0, 0, 0, 0));
  const endOfDay = new Date(Date.UTC(year, month, day, 23, 59, 59, 999));
  const nextDay = new Date(Date.UTC(year, month, day + 1, 0, 0, 0, 0));
  const utcDate = new Date(Date.UTC(year, month, day, 12, 0, 0, 0));

  return { startOfDay, endOfDay, nextDay, utcDate };
}

/**
 * Determines whether a mission is actively covering the target day (startOfDay .. endOfDay).
 * Ensures that single-day or internal_daily missions without an explicit endDate
 * DO NOT leak into future days as recurring missions!
 */
export function isMissionActiveOnDay(
  m: { startDate: Date | string; endDate?: Date | string | null; missionType?: string },
  startOfDay: Date,
  endOfDay: Date
): boolean {
  const sRange = getUtcDayRange(m.startDate);
  if (m.endDate) {
    const eRange = getUtcDayRange(m.endDate);
    return (
      sRange.startOfDay.getTime() <= endOfDay.getTime() &&
      eRange.endOfDay.getTime() >= startOfDay.getTime()
    );
  }
  // If no endDate was specified:
  // Internal daily missions apply ONLY on their specific startDate
  if (m.missionType === "internal_daily") {
    return sRange.startOfDay.getTime() === startOfDay.getTime();
  }
  // External multiday missions without endDate start on startDate and continue
  return sRange.startOfDay.getTime() <= endOfDay.getTime();
}

/**
 * The "Digital Monolith" Suggestion Engine.
 * Cross-references all operational modules to determine an officer's daily status
 * using strict UTC date boundaries.
 */
export async function getSuggestedRollcall(date: Date): Promise<SuggestedRollcallEntry[]> {
  await connectToDatabase();

  const { startOfDay, endOfDay } = getUtcDayRange(date);

  // 1. Fetch all active officers in the unit
  const activeOfficers = await Officer.find({
    employmentStatus: "active",
    isInUnit: true,
  })
    .sort({ rank: 1, seniorityNumber: 1 })
    .lean();

  if (activeOfficers.length === 0) return [];

  const officerIds = activeOfficers.map((o) => o._id);
  const militaryIds = activeOfficers.map((o) => o.militaryId);

  const yesterdayStart = new Date(startOfDay.getTime() - 24 * 60 * 60 * 1000);

  // 2. Fetch all relevant records for these officers on this date
  const [activeLeaves, activeMissions, activeCourses, activeMedicalVisits] = await Promise.all([
    Leave.find({
      officerId: { $in: officerIds },
      status: { $in: ["approved", "interrupted"] },
      startDate: { $lte: endOfDay },
      $or: [{ endDate: { $gte: yesterdayStart } }, { actualReturnDate: { $gte: startOfDay } }],
    }).lean(),

    Mission.find({
      officerId: { $in: officerIds },
      status: { $in: ["active", "scheduled"] },
      startDate: { $lte: endOfDay },
      $or: [
        { endDate: { $gte: startOfDay } },
        { endDate: { $exists: false } },
        { endDate: null },
      ],
    }).lean(),

    Course.find({
      participantModel: "Officer",
      participants: { $in: officerIds },
      status: "ongoing",
      startDate: { $lte: endOfDay },
      endDate: { $gte: startOfDay },
    }).lean(),

    MedicalPatient.find({ patientId: { $in: militaryIds } })
      .lean()
      .then(async (patients) => {
        if (patients.length === 0) return [];
        const patientIds = patients.map((p) => p._id);
        const patientToMilitaryId = new Map(patients.map((p) => [p._id.toString(), p.patientId]));

        const medicalLookbackDate = new Date(startOfDay);
        medicalLookbackDate.setUTCDate(medicalLookbackDate.getUTCDate() - 60);

        const visits = await MedicalVisit.find({
          patientId: { $in: patientIds },
          visitDate: { $gte: medicalLookbackDate, $lte: endOfDay },
          $or: [{ restDays: { $gt: 0 } }, { isHospitalized: true }, { restType: { $ne: "none" } }],
        })
          .sort({ visitDate: -1 })
          .lean();

        return visits
          .filter((v) => {
            const restDays = v.restDays || 0;
            if (v.restType === "none" || restDays === 0) return false;

            const restEndDate = new Date(v.visitDate);
            restEndDate.setUTCDate(restEndDate.getUTCDate() + Math.max(0, restDays - 1));
            return restEndDate >= startOfDay;
          })
          .map((v) => ({ ...v, militaryId: patientToMilitaryId.get(v.patientId.toString()) }));
      }),
  ]);

  // 3. Map suggestions
  const leaveMap = new Map<string, (typeof activeLeaves)[0]>();
  for (const l of activeLeaves) {
    if (l.actualReturnDate) {
      const actualRange = getUtcDayRange(l.actualReturnDate);
      if (actualRange.startOfDay.getTime() < startOfDay.getTime()) {
        continue;
      }
    }
    leaveMap.set(l.officerId.toString(), l);
  }
  const filteredActiveMissions = activeMissions.filter((m) =>
    isMissionActiveOnDay(m, startOfDay, endOfDay)
  );
  const missionMap = new Map(filteredActiveMissions.map((m) => [m.officerId.toString(), m]));
  const courseMap = new Map<string, (typeof activeCourses)[0]>();
  activeCourses.forEach((c) => {
    (c.participants as { toString(): string }[]).forEach((pId) => {
      courseMap.set(pId.toString(), c);
    });
  });
  const medicalMap = new Map(activeMedicalVisits.map((v) => [v.militaryId, v]));

  return activeOfficers.map((officer) => {
    const oId = officer._id.toString();
    const mId = officer.militaryId;

    let suggestedStatus: RollcallStatus = "present";
    let reason = "حاضر بالوحدة";
    let relatedId: string | undefined = undefined;

    const leave = leaveMap.get(oId);
    if (leave) {
      if (leave.actualReturnDate) {
        const actualRange = getUtcDayRange(leave.actualReturnDate);
        if (actualRange.startOfDay.getTime() === startOfDay.getTime() && !leave.isReturnConfirmed) {
          suggestedStatus = "present";
          reason = "عودة من إجازة";
          relatedId = leave._id.toString();
        } else if (actualRange.startOfDay.getTime() > startOfDay.getTime()) {
          suggestedStatus = "leave";
          reason = `إجازة (${leave.type})`;
          relatedId = leave._id.toString();
        }
      } else {
        const endRange = getUtcDayRange(leave.endDate);
        if (endRange.nextDay.getTime() === startOfDay.getTime() && !leave.isReturnConfirmed) {
          suggestedStatus = "present";
          reason = "عودة من إجازة";
          relatedId = leave._id.toString();
        } else if (endRange.startOfDay.getTime() >= startOfDay.getTime()) {
          suggestedStatus = "leave";
          reason = `إجازة (${leave.type})`;
          relatedId = leave._id.toString();
        }
      }
    } else {
      const mission = missionMap.get(oId);
      if (mission) {
        const isTravelAbroad = mission.title ? (mission.title.includes("سفر") || mission.title.includes("سفريات")) : false;
        if (mission.missionType === "internal_daily") {
          suggestedStatus = "daily_mission";
          reason = mission.title ? `مأمورية: ${mission.title}` : "مأمورية داخلية";
        } else if (isTravelAbroad) {
          suggestedStatus = "travel_abroad";
          reason = mission.title ? `سفر للخارج: ${mission.title}` : "سفر للخارج";
        } else {
          suggestedStatus = "mission";
          reason = mission.title ? `مأمورية: ${mission.title}` : "مأمورية رسمية";
        }
        relatedId = mission._id.toString();
      } else {
        const course = courseMap.get(oId);
        if (course) {
          suggestedStatus = "course";
          reason = `فرقة: ${course.title}`;
          relatedId = course._id.toString();
        } else {
          const med = medicalMap.get(mId);
          if (med) {
            suggestedStatus = "medical";
            reason = `راحة طبية (${med.restType})`;
            relatedId = med._id.toString();
          }
        }
      }
    }

    return {
      officerId: oId,
      militaryId: mId,
      fullName: officer.fullName,
      rank: officer.rank,
      suggestedStatus,
      reason,
      relatedId,
    };
  });
}

/**
 * Auto-calculates or syncs the daily rollcall for a given date.
 * Automatically checks active leaves and missions for every active officer.
 */
export async function calculateDailyRollcallEntries(targetDate: Date): Promise<IRollcallEntry[]> {
  const { startOfDay, endOfDay } = getUtcDayRange(targetDate);
  const yesterdayStart = new Date(startOfDay.getTime() - 24 * 60 * 60 * 1000);

  // 1. Fetch active officers currently in unit sorted by Rank Seniority then fullName
  const activeOfficers = await Officer.find({ isInUnit: true, employmentStatus: "active" }).lean();
  activeOfficers.sort((a, b) => {
    const weightA = RANK_WEIGHTS[a.rank as keyof typeof RANK_WEIGHTS] ?? 99;
    const weightB = RANK_WEIGHTS[b.rank as keyof typeof RANK_WEIGHTS] ?? 99;
    if (weightA !== weightB) return weightA - weightB;
    return a.fullName.localeCompare(b.fullName, "ar");
  });

  // 2. Fetch active approved leaves for startOfDay..endOfDay or returning today
  const activeLeaves = await Leave.find({
    status: { $in: ["approved", "interrupted"] },
    startDate: { $lte: endOfDay },
    $or: [{ endDate: { $gte: yesterdayStart } }, { actualReturnDate: { $gte: startOfDay } }],
  }).lean();

  const leaveMap = new Map<string, (typeof activeLeaves)[0]>();
  for (const l of activeLeaves) {
    if (l.actualReturnDate) {
      const actualRange = getUtcDayRange(l.actualReturnDate);
      if (actualRange.startOfDay.getTime() < startOfDay.getTime()) {
        continue;
      }
    }
    leaveMap.set(l.officerId.toString(), l);
  }

  // 3. Fetch active missions covering targetDate
  const rawActiveMissions = await Mission.find({
    status: { $in: ["active", "scheduled"] },
    startDate: { $lte: endOfDay },
    $or: [
      { endDate: { $gte: startOfDay } },
      { endDate: { $exists: false } },
      { endDate: null },
    ],
  }).lean();

  const activeMissions = rawActiveMissions.filter((m) =>
    isMissionActiveOnDay(m, startOfDay, endOfDay)
  );

  const missionMap = new Map<string, (typeof activeMissions)[0]>();
  for (const m of activeMissions) {
    missionMap.set(m.officerId.toString(), m);
    if (m.additionalOfficerIds && m.additionalOfficerIds.length > 0) {
      for (const addId of m.additionalOfficerIds) {
        missionMap.set(addId.toString(), m);
      }
    }
  }

  // 3.5. Fetch active multi-day rollcall statuses from recent rollcalls covering targetDate
  const { DailyRollcall } = await import("@/lib/db/models/DailyRollcall");
  const recentRollcallsWithSpecialStatuses = await DailyRollcall.find({
    date: { $lt: endOfDay },
    "entries.statusEndDate": { $exists: true, $ne: "" },
  })
    .sort({ date: -1 })
    .limit(30)
    .lean();

  const multiDayStatusMap = new Map<string, IRollcallEntry>();
  for (const rc of recentRollcallsWithSpecialStatuses) {
    for (const ent of rc.entries || []) {
      const offKey = ent.officerId.toString();
      if (multiDayStatusMap.has(offKey)) continue;
      if (ent.statusEndDate) {
        const endRange = getUtcDayRange(ent.statusEndDate);
        if (endRange.nextDay.getTime() >= startOfDay.getTime()) {
          if (ent.statusStartDate) {
            const startRange = getUtcDayRange(ent.statusStartDate);
            if (startRange.startOfDay.getTime() > endOfDay.getTime()) continue;
          }
          multiDayStatusMap.set(offKey, ent as IRollcallEntry);
        }
      }
    }
  }

  // 3.6. Fetch active medical visits from medical point
  const militaryIds = activeOfficers.map((o) => o.militaryId).filter(Boolean);
  const medicalPatients = await MedicalPatient.find({ patientId: { $in: militaryIds } }).select("_id patientId").lean();
  const patientToMilitary = new Map<string, string>();
  const patientIds = medicalPatients.map((p) => {
    patientToMilitary.set(p._id.toString(), p.patientId);
    return p._id;
  });

  const medicalLookbackDate = new Date(startOfDay);
  medicalLookbackDate.setUTCDate(medicalLookbackDate.getUTCDate() - 60);

  const medicalVisits = patientIds.length > 0
    ? await MedicalVisit.find({
        patientId: { $in: patientIds },
        visitDate: { $gte: medicalLookbackDate, $lte: endOfDay },
        $or: [{ restDays: { $gt: 0 } }, { isHospitalized: true }, { restType: { $ne: "none" } }],
      }).sort({ visitDate: -1 }).lean()
    : [];

  const militaryToOfficerId = new Map<string, string>();
  for (const off of activeOfficers) {
    if (off.militaryId) militaryToOfficerId.set(off.militaryId, off._id.toString());
  }

  interface MedicalStatusInfo {
    status: "clinic" | "rest" | "hospital";
    lockReason: string;
    isLocked: boolean;
    note?: string;
    hospitalName?: string;
    hospitalAdmissionDate?: string;
  }
  const medicalStatusMap = new Map<string, MedicalStatusInfo>();

  for (const v of medicalVisits) {
    const milId = patientToMilitary.get(v.patientId.toString());
    if (!milId) continue;
    const offId = militaryToOfficerId.get(milId);
    if (!offId || medicalStatusMap.has(offId)) continue;

    const vDate = new Date(v.visitDate);
    const restDays = v.restDays || 0;
    const restType = v.restType || "none";

    const isHospital = restType === "hospital" || 
      (v.diagnosis && v.diagnosis.includes("مستشفى")) || 
      (v.treatment && v.treatment.includes("مستشفى"));

    if (isHospital) {
      let hName = "المستشفى العسكري";
      const match = (v.treatment || v.diagnosis).match(/مستشفى\s+([^\s،,.]+)/);
      if (match) hName = `مستشفى ${match[1]}`;
      medicalStatusMap.set(offId, {
        status: "hospital",
        lockReason: `حجز بمستشفى (${v.diagnosis})`,
        isLocked: true,
        hospitalName: hName,
        hospitalAdmissionDate: vDate.toISOString(),
      });
      continue;
    }

    if (restType !== "none" && restDays > 0) {
      const restEndDate = new Date(vDate);
      restEndDate.setUTCDate(restEndDate.getUTCDate() + Math.max(0, restDays - 1));
      const restEndLimit = new Date(restEndDate.getFullYear(), restEndDate.getMonth(), restEndDate.getDate(), 23, 59, 59, 999);

      if (startOfDay.getTime() <= restEndLimit.getTime() && vDate.getTime() <= endOfDay.getTime()) {
        const endFormatted = formatDateDisplay(restEndLimit);
        if (restType === "home") {
          medicalStatusMap.set(offId, {
            status: "rest",
            lockReason: `راحة طبية بالمنزل (${v.diagnosis})${endFormatted ? ` حتى ${endFormatted}` : ""}`,
            isLocked: true,
            note: `راحة طبية (${v.diagnosis})`,
          });
        } else {
          medicalStatusMap.set(offId, {
            status: "clinic",
            lockReason: `راحة طبية بالعيادة (${v.diagnosis})${endFormatted ? ` حتى ${endFormatted}` : ""}`,
            isLocked: true,
            note: `راحة بالعيادة (${v.diagnosis})`,
          });
        }
        continue;
      }
    }

    // Same-day clinic visit check
    const vRange = getUtcDayRange(vDate);
    if (vRange.startOfDay.getTime() === startOfDay.getTime()) {
      medicalStatusMap.set(offId, {
        status: "clinic",
        lockReason: `كشف طبي اليوم بالعيادة (${v.diagnosis})`,
        isLocked: false,
        note: `كشف بالعيادة (${v.diagnosis})`,
      });
    }
  }

  // 4. Build entries
  const entries: IRollcallEntry[] = activeOfficers.map((officer) => {
    const offId = officer._id.toString();
    const l = leaveMap.get(offId);
    const m = missionMap.get(offId);
    const multiDay = multiDayStatusMap.get(offId);
    const medInfo = medicalStatusMap.get(offId);

    let status: RollcallStatus = "present";
    let relatedLeaveId: Types.ObjectId | undefined;
    let relatedMissionId: Types.ObjectId | undefined;
    let isLocked = false;
    let lockReason: string | undefined;
    let sourceId: string | undefined;
    let sourceType: "leave" | "mission" | undefined;
    let isReturningToday = false;
    let note: string | undefined = undefined;

    const isCourse = m?.title ? (m.title.includes("فرقة") || m.title.includes("دورة")) : false;
    const isTravelAbroad = m?.title ? (m.title.includes("سفر") || m.title.includes("سفريات")) : false;

    if (multiDay) {
      status = multiDay.status;
      isLocked = true;
      lockReason = multiDay.lockReason || multiDay.note || "حالة مستمرة مسجلة";
      note = multiDay.note;
    } else if (l && m) {
      // Officer has a mission while on active leave:
      // "اذا كان الضابط مأمورية اثناء الاجازة يظل الضابط محتسبا اجازة ولكن في الملاحظات يتم كتابة مأمورية اثناء الاجازة. ويظل في جدول الاجازات."
      relatedLeaveId = l._id as Types.ObjectId;
      relatedMissionId = m._id as Types.ObjectId;
      isLocked = true;
      sourceId = l._id.toString();
      sourceType = "leave";
      status = "leave";
      note = undefined; // Do not auto-fill mission details into note (rendered via mission badge in UI)
      lockReason = m.title ? `مأمورية: ${m.title}` : "مأمورية أثناء الإجازة";
    } else if (l) {
      if (l.actualReturnDate) {
        const actualRange = getUtcDayRange(l.actualReturnDate);
        if (actualRange.startOfDay.getTime() === startOfDay.getTime() && !l.isReturnConfirmed) {
          isReturningToday = true;
          status = "present";
          relatedLeaveId = l._id as Types.ObjectId;
          isLocked = false;
          sourceId = l._id.toString();
          sourceType = "leave";
          lockReason = undefined;
          note = "عودة من إجازة";
        } else if (actualRange.startOfDay.getTime() > startOfDay.getTime()) {
          status = "leave";
          relatedLeaveId = l._id as Types.ObjectId;
          isLocked = true;
          sourceId = l._id.toString();
          sourceType = "leave";
          const endStr = formatDateDisplay(l.actualReturnDate);
          lockReason = `إجازة رسمية قطع (${l.type || "اعتيادية"})${endStr ? ` حتى ${endStr}` : ""}`;
        }
      } else {
        const endRange = getUtcDayRange(l.endDate);
        if (endRange.nextDay.getTime() === startOfDay.getTime() && !l.isReturnConfirmed) {
          isReturningToday = true;
          status = "present";
          relatedLeaveId = l._id as Types.ObjectId;
          isLocked = false;
          sourceId = l._id.toString();
          sourceType = "leave";
          lockReason = undefined;
          note = "عودة من إجازة";
        } else if (endRange.startOfDay.getTime() >= startOfDay.getTime()) {
          status = "leave";
          relatedLeaveId = l._id as Types.ObjectId;
          isLocked = true;
          sourceId = l._id.toString();
          sourceType = "leave";
          const endStr = l.endDate ? formatDateDisplay(l.endDate) : "";
          lockReason = `إجازة رسمية (${l.type || "اعتيادية"})${endStr ? ` حتى ${endStr}` : ""}`;
        }
      }
    } else if (m) {
      if (m.missionType === "internal_daily") {
        status = "daily_mission";
        lockReason = m.title ? `مأمورية: ${m.title}` : "مأمورية يومية";
        note = undefined; // No auto-fill note for missions (shown in presence column)
      } else if (isTravelAbroad) {
        status = "travel_abroad";
        lockReason = m.title ? `سفر للخارج: ${m.title}` : "سفر للخارج";
        note = undefined;
      } else {
        status = isCourse ? "course" : "external_mission";
        lockReason = isCourse ? `فرقة: ${m.title}` : (m.title ? `مأمورية خارجية: ${m.title}` : "مأمورية رسمية");
        note = undefined; // No auto-fill note for missions/courses (rendered in dedicated columns)
      }
      relatedMissionId = m._id as Types.ObjectId;
      isLocked = true;
      sourceId = m._id.toString();
      sourceType = "mission";
    } else if (medInfo) {
      status = medInfo.status;
      isLocked = medInfo.isLocked;
      lockReason = medInfo.lockReason;
      note = medInfo.note;
    }

    return {
      officerId: officer._id as Types.ObjectId,
      militaryId: officer.militaryId,
      fullName: officer.fullName,
      rank: officer.rank,
      status,
      note,
      hospitalName: multiDay?.hospitalName || medInfo?.hospitalName,
      hospitalAdmissionDate: multiDay?.hospitalAdmissionDate || medInfo?.hospitalAdmissionDate,
      disciplinaryType: multiDay?.disciplinaryType,
      disciplinaryAuthority: multiDay?.disciplinaryAuthority,
      travelDestination: multiDay?.travelDestination,
      travelPurpose: multiDay?.travelPurpose,
      statusStartDate: multiDay?.statusStartDate,
      statusEndDate: multiDay?.statusEndDate,
      customReason: multiDay?.customReason,
      relatedLeaveId,
      relatedMissionId,
      isLocked,
      lockReason,
      sourceId,
      sourceType,
      isReturningToday,
      leaveTypeLabel: l ? (LEAVE_TYPE_LABELS[l.type as keyof typeof LEAVE_TYPE_LABELS] || l.type || "إجازة اعتيادية") : undefined,
      leaveStartDate: l?.startDate ? new Date(l.startDate).toISOString() : undefined,
      leaveEndDate: l?.endDate ? new Date(l.endDate).toISOString() : undefined,
      missionTitle: m?.title,
      missionDestination: m?.destination,
      missionStartDate: m?.startDate ? new Date(m.startDate).toISOString() : undefined,
      missionEndDate: m?.endDate ? new Date(m.endDate).toISOString() : undefined,
      isCourse,
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

  const rawActiveMissions = await Mission.find({
    status: { $in: ["active", "scheduled"] },
    startDate: { $lte: endOfDay },
    $or: [
      { endDate: { $gte: startOfDay } },
      { endDate: { $exists: false } },
      { endDate: null },
    ],
  }).populate("officerId", "fullName rank").lean();

  const activeMissions = rawActiveMissions.filter((m) =>
    isMissionActiveOnDay(m, startOfDay, endOfDay)
  );

  const leaveOfficerIds = new Set(activeLeaves.map(l => l.officerId?._id?.toString() || l.officerId?.toString()));

  for (const m of activeMissions) {
    const mOffId = (m.officerId as unknown as { _id: { toString(): string } })?._id?.toString() || m.officerId?.toString();
    if (mOffId && leaveOfficerIds.has(mOffId)) {
      const officer = m.officerId as unknown as { fullName?: string; rank?: string };
      const isInternalDaily = m.missionType === "internal_daily";
      alerts.push({
        officerId: mOffId,
        officerName: officer?.fullName || "ضابط",
        rankLabel: officer?.rank || "",
        type: "overlap",
        message: isInternalDaily
          ? `تنبيه عمليات: الضابط مسجل له مأمورية يومية أثناء الإجازة (${formatDateDisplay(targetDate)}).`
          : `تعارض عملياتي: الضابط مسجل له إجازة سارية ومأمورية خارجية أو فرقة (${m.title}). لا يُسمح بالمأمورية الخارجية أثناء الإجازة ويجب قطع الإجازة أولاً.`,
      });
    }
  }

  // 1.5. Detect overlapping medical rest / hospital & mission
  const missionMilitaryIds = activeMissions
    .map(m => (m.officerId as unknown as { militaryId?: string })?.militaryId)
    .filter((id): id is string => Boolean(id));

  const activeMedMilitaryIds = new Set<string>();
  if (missionMilitaryIds.length > 0) {
    const activePatients = await MedicalPatient.find({ patientId: { $in: missionMilitaryIds } }).lean();
    if (activePatients.length > 0) {
      const patMap = new Map(activePatients.map(p => [p._id.toString(), p.patientId]));
      const patientIds = activePatients.map(p => p._id);
      const sixtyDaysAgo = new Date(startOfDay.getTime() - 60 * 24 * 60 * 60 * 1000);
      const medVisits = await MedicalVisit.find({
        patientId: { $in: patientIds },
        visitDate: { $lte: endOfDay, $gte: sixtyDaysAgo },
        $or: [{ restDays: { $gt: 0 } }, { restType: { $in: ["hospital", "home", "ward"] } }],
      }).lean();

      for (const mv of medVisits) {
        const pMil = patMap.get(mv.patientId.toString());
        if (!pMil) continue;
        const rDays = mv.restDays || 0;
        const vDate = new Date(mv.visitDate);
        const rEnd = new Date(vDate);
        rEnd.setDate(rEnd.getDate() + Math.max(0, rDays - 1));
        if (startOfDay.getTime() <= rEnd.getTime() && vDate.getTime() <= endOfDay.getTime()) {
          activeMedMilitaryIds.add(pMil);
        }
      }
    }
  }

  for (const m of activeMissions) {
    const officer = m.officerId as unknown as { _id?: { toString(): string }; fullName?: string; rank?: string; militaryId?: string };
    if (officer?.militaryId && activeMedMilitaryIds.has(officer.militaryId)) {
      alerts.push({
        officerId: officer._id?.toString() || "",
        officerName: officer.fullName || "ضابط",
        rankLabel: officer.rank || "",
        type: "overlap",
        message: `تعارض طبي/عملياتي: الضابط ممنوح راحة طبية أو حجز بمستشفى ومكلف بمأمورية (${m.title}).`,
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
