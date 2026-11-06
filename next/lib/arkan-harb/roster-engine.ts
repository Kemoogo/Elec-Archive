import { Types } from "mongoose";
import { format } from "date-fns";
import type { IOfficerDutyEquityStat, WeekDayInfo } from "@/lib/db/models/DutyRoster.shared";

const ARABIC_DAYS = [
  "الأحد",
  "الاثنين",
  "الثلاثاء",
  "الأربعاء",
  "الخميس",
  "الجمعة",
  "السبت",
];

/**
 * Returns true if the day is Friday (5) or Saturday (6)
 */
export function isWeekendDay(date: Date): boolean {
  const d = date.getDay();
  return d === 5 || d === 6;
}


export interface WeekInfo {
  startDate: Date;
  endDate: Date;
  startDateString: string; // YYYY-MM-DD (Saturday)
  endDateString: string;   // YYYY-MM-DD (Saturday of next week)
  weekNumber: number;
  year: number;
  days: WeekDayInfo[];
}

export interface SmartWeekRangeInfo {
  isCurrentWeek: boolean;
  presetLabel: string;
  type: "same_month" | "diff_month" | "diff_year";
  sDay: number;
  sMonth: number;
  sYear: number;
  eDay: number;
  eMonth: number;
  eYear: number;
  startPart: string;
  endPart: string;
}

/**
 * Calculates the weekly schedule for a given date.
 * - Current week: contains 8 days (Saturday to next Saturday preview).
 * - All other weeks (past or future): contains strictly 7 days (Saturday to Friday).
 */
export function getWeekRange(targetDate: Date = new Date(), today: Date = new Date()): WeekInfo {
  const d = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate());
  const dayOfWeek = d.getDay(); // 0 is Sunday, 6 is Saturday
  const diffToSaturday = (dayOfWeek + 1) % 7;
  const saturday = new Date(d);
  saturday.setDate(d.getDate() - diffToSaturday);
  saturday.setHours(0, 0, 0, 0);

  const td = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const tDiffToSaturday = (td.getDay() + 1) % 7;
  const currentSaturday = new Date(td);
  currentSaturday.setDate(td.getDate() - tDiffToSaturday);
  currentSaturday.setHours(0, 0, 0, 0);

  const isCurrentWeek = saturday.getTime() === currentSaturday.getTime();
  const numDays = isCurrentWeek ? 8 : 7;

  const friday = new Date(saturday);
  friday.setDate(saturday.getDate() + 6);
  friday.setHours(23, 59, 59, 999);

  const days: WeekDayInfo[] = [];
  for (let i = 0; i < numDays; i++) {
    const cur = new Date(saturday);
    cur.setDate(saturday.getDate() + i);
    const isNextSaturday = i === 7;
    days.push({
      dayIndex: i + 1,
      date: cur,
      dateString: format(cur, "yyyy-MM-dd"),
      dayName: ARABIC_DAYS[cur.getDay()],
      isWeekend: cur.getDay() === 5 || cur.getDay() === 6,
      isPreviewDay: isNextSaturday,
    });
  }

  const startOfYear = new Date(saturday.getFullYear(), 0, 1);
  const pastDaysOfYear = (saturday.getTime() - startOfYear.getTime()) / 86400000;
  const weekNumber = Math.ceil((pastDaysOfYear + startOfYear.getDay() + 1) / 7);

  return {
    startDate: saturday,
    endDate: friday,
    startDateString: format(saturday, "yyyy-MM-dd"),
    endDateString: format(friday, "yyyy-MM-dd"),
    weekNumber,
    year: saturday.getFullYear(),
    days,
  };
}

/**
 * Computes structured RTL date range information for the duty roster header:
 * - isCurrentWeek: boolean
 * - presetLabel: "الأسبوع الحالي" / "الأسبوع السابق" / "منذ أسبوعين" / "منذ 3 أسابيع" / etc.
 * - startPart: earlier date formatted part (e.g. "10", "29/10", "30/12/2026")
 * - endPart: later date formatted part (e.g. "17/10/2026", "5/11/2026", "6/1/2027")
 */
export function getSmartWeekRangeInfo(
  targetDate: Date = new Date(),
  today: Date = new Date()
): SmartWeekRangeInfo {
  const currentWeek = getWeekRange(today, today);
  const targetWeek = getWeekRange(targetDate, today);

  const msInWeek = 7 * 24 * 60 * 60 * 1000;
  const currentStart = currentWeek.startDate.getTime();
  const targetStart = targetWeek.startDate.getTime();

  const diffWeeks = Math.round((targetStart - currentStart) / msInWeek);

  let presetLabel = "";
  if (diffWeeks === 0) {
    presetLabel = "الأسبوع الحالي";
  } else if (diffWeeks === 1) {
    presetLabel = "الأسبوع القادم";
  } else if (diffWeeks === 2) {
    presetLabel = "بعد أسبوعين";
  } else if (diffWeeks === 3) {
    presetLabel = "بعد 3 أسابيع";
  } else if (diffWeeks === -1) {
    presetLabel = "الأسبوع السابق";
  } else if (diffWeeks === -2) {
    presetLabel = "منذ أسبوعين";
  } else if (diffWeeks === -3) {
    presetLabel = "منذ 3 أسابيع";
  }

  const s = targetWeek.startDate;
  const e = targetWeek.days[targetWeek.days.length - 1].date;

  const sDay = s.getDate();
  const sMonth = s.getMonth() + 1;
  const sYear = s.getFullYear();

  const eDay = e.getDate();
  const eMonth = e.getMonth() + 1;
  const eYear = e.getFullYear();

  let type: "same_month" | "diff_month" | "diff_year" = "same_month";
  let startPart = "";
  let endPart = "";

  if (sYear !== eYear) {
    type = "diff_year";
    startPart = `${sDay}/${sMonth}/${sYear}`;
    endPart = `${eDay}/${eMonth}/${eYear}`;
  } else if (sMonth !== eMonth) {
    type = "diff_month";
    startPart = `${sDay}/${sMonth}`;
    endPart = `${eDay}/${eMonth}/${eYear}`;
  } else {
    type = "same_month";
    startPart = `${sDay}`;
    endPart = `${eDay}/${eMonth}/${eYear}`;
  }

  return {
    isCurrentWeek: diffWeeks === 0,
    presetLabel,
    type,
    sDay,
    sMonth,
    sYear,
    eDay,
    eMonth,
    eYear,
    startPart,
    endPart,
  };
}

/**
 * Computes a smart human-readable fallback label for a duty roster week
 */
export function getSmartWeekLabel(
  targetDate: Date = new Date(),
  today: Date = new Date()
): string {
  const info = getSmartWeekRangeInfo(targetDate, today);
  const rangeStr = `${info.startPart} - ${info.endPart}`;
  if (info.presetLabel) {
    return `${info.presetLabel} (${rangeStr})`;
  }
  return `(${rangeStr})`;
}



interface OfficerBasicInfo {
  _id: string | Types.ObjectId;
  fullName: string;
  rank?: string;
}

const LEADERSHIP_POSITION_PATTERNS = [
  "قائد المركز",
  "قائد الوحدة",
  "القائد",
  "قائد ثان",
  "قائد ثان المركز",
  "قائد ثان الوحدة",
  "نائب قائد الوحدة",
  "نائب القائد",
];

/**
 * Checks whether a position title or department represents the Unit Commander or Second-in-Command
 */
export function isLeadershipPositionTitle(
  title?: string | null,
  department?: string | null
): boolean {
  if (department && department.trim() === "القيادة") {
    return true;
  }
  if (!title) return false;
  const normalized = title.trim();
  return LEADERSHIP_POSITION_PATTERNS.some(
    (pattern) =>
      normalized === pattern ||
      normalized.includes("قائد المركز") ||
      normalized.includes("قائد الوحدة") ||
      normalized.includes("قائد ثان") ||
      normalized.includes("نائب قائد")
  );
}

/**
 * Identifies the Unit Commander (القائد) and Second-in-Command (قائد ثان)
 * to exclude them from Duty Rosters (both by PositionAssignment/position title
 * and the top 2 most senior active officers in the unit).
 */
export function getExcludedLeadershipOfficerIds(
  sortedActiveOfficers: Array<{
    _id?: { toString(): string } | string;
    id?: string;
    position?: string | null;
  }>,
  positions?: Array<{
    positionTitle?: string | null;
    department?: string | null;
    primaryOfficerId?: { toString(): string } | { _id?: { toString(): string } } | string | null;
    primaryOfficer?: { id?: string; _id?: { toString(): string } | string } | null;
  }>
): Set<string> {
  const excludedIds = new Set<string>();

  // 1. Check explicit PositionAssignment records for Commander & Second-in-Command
  if (positions && positions.length > 0) {
    for (const pos of positions) {
      if (isLeadershipPositionTitle(pos.positionTitle, pos.department)) {
        const pOff = pos.primaryOfficer || pos.primaryOfficerId;
        if (pOff) {
          const idStr =
            typeof pOff === "string"
              ? pOff
              : typeof pOff === "object" && "id" in pOff && pOff.id
              ? String(pOff.id)
              : typeof pOff === "object" && "_id" in pOff && pOff._id
              ? String(pOff._id)
              : String(pOff);
          if (idStr && idStr !== "[object Object]") {
            excludedIds.add(idStr);
          }
        }
      }
    }
  }

  // 2. Check officer.position field on active officers
  for (const off of sortedActiveOfficers) {
    if (isLeadershipPositionTitle(off.position)) {
      const idStr = off.id || (off._id ? String(off._id) : "");
      if (idStr) excludedIds.add(idStr);
    }
  }

  // 3. Exclude the top 2 most senior active officers in the unit (القائد وقائد ثان بالأقدمية)
  if (sortedActiveOfficers.length >= 1) {
    const firstId =
      sortedActiveOfficers[0].id ||
      (sortedActiveOfficers[0]._id ? String(sortedActiveOfficers[0]._id) : "");
    if (firstId) excludedIds.add(firstId);
  }
  if (sortedActiveOfficers.length >= 2) {
    const secondId =
      sortedActiveOfficers[1].id ||
      (sortedActiveOfficers[1]._id ? String(sortedActiveOfficers[1]._id) : "");
    if (secondId) excludedIds.add(secondId);
  }

  return excludedIds;
}

/**
 * Calculates duty distribution equity metrics for officers
 */
export function calculateDutyEquityStats(
  entries: Array<{
    date: Date | string;
    assignedOfficerId: string | Types.ObjectId;
    isHoliday?: boolean;
  }>,
  officers: OfficerBasicInfo[],
): IOfficerDutyEquityStat[] {
  const statsMap = new Map<string, number>();

  // Initialize for all active officers
  for (const off of officers) {
    const id = off._id.toString();
    statsMap.set(id, 0);
  }

  for (const entry of entries) {
    if (!entry.assignedOfficerId) continue;
    const offId = entry.assignedOfficerId.toString();
    statsMap.set(offId, (statsMap.get(offId) || 0) + 1);
  }

  const result: IOfficerDutyEquityStat[] = officers.map((off) => {
    const id = off._id.toString();
    return {
      officerId: id,
      officerName: off.fullName,
      rankLabel: off.rank,
      totalDuties: statsMap.get(id) || 0,
    };
  });

  // Sort by totalDuties ascending to highlight least assigned officers
  return result.sort((a, b) => a.totalDuties - b.totalDuties);
}

export interface ConflictCheckResult {
  hasConflict: boolean;
  reason?: string;
  type?: "leave" | "mission" | "duplicate_duty";
}

/**
 * Evaluates whether an officer has a scheduling conflict for a duty on a given date
 */
export function checkDutyConflict(params: {
  officerId: string;
  date: Date | string;
  dutyType?: string;
  existingEntries?: Array<{
    date: Date | string;
    assignedOfficerId: string | Types.ObjectId;
    dutyType?: string;
  }>;
  leaves?: Array<{
    officerId: string | Types.ObjectId;
    startDate: Date | string;
    endDate: Date | string;
    status: string;
    type?: string;
  }>;
  missions?: Array<{
    officerId: string | Types.ObjectId;
    startDate: Date | string;
    endDate?: Date | string | null;
    status: string;
    title: string;
    missionType?: string;
  }>;
}): ConflictCheckResult {
  const { officerId, date, existingEntries = [], leaves = [], missions = [] } = params;
  const targetDate = typeof date === "string" ? new Date(date) : date;
  const targetDayStart = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate());
  const targetDayEnd = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate(), 23, 59, 59, 999);

  // 1. Check duplicate duty on same day
  const sameDayDuty = existingEntries.find((e) => {
    if (e.assignedOfficerId.toString() !== officerId) return false;
    const d = typeof e.date === "string" ? new Date(e.date) : e.date;
    const day = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    return day.getTime() === targetDayStart.getTime();
  });

  if (sameDayDuty) {
    return {
      hasConflict: true,
      reason: "الضابط معين بالفعل في خدمة أخرى في نفس هذا اليوم",
      type: "duplicate_duty",
    };
  }

  // 2. Check leaves overlap
  const conflictingLeave = leaves.find((l) => {
    if (l.officerId.toString() !== officerId) return false;
    if (l.status !== "approved" && l.status !== "extension_pending") return false;

    const start = new Date(l.startDate);
    const end = new Date(l.endDate);
    const sDay = new Date(start.getFullYear(), start.getMonth(), start.getDate());
    const eDay = new Date(end.getFullYear(), end.getMonth(), end.getDate(), 23, 59, 59, 999);

    return targetDayStart <= eDay && targetDayEnd >= sDay;
  });

  if (conflictingLeave) {
    return {
      hasConflict: true,
      reason: `الضابط في إجازة رسمية خلال هذا التاريخ (${conflictingLeave.type || "إجازة"})`,
      type: "leave",
    };
  }

  // 3. Check missions overlap
  const conflictingMission = missions.find((m) => {
    if (m.officerId.toString() !== officerId) return false;
    if (m.status !== "active" && m.status !== "scheduled") return false;

    const start = new Date(m.startDate);
    const end = m.endDate ? new Date(m.endDate) : start;
    const sDay = new Date(start.getFullYear(), start.getMonth(), start.getDate());
    const eDay = new Date(end.getFullYear(), end.getMonth(), end.getDate(), 23, 59, 59, 999);

    return targetDayStart <= eDay && targetDayEnd >= sDay;
  });

  if (conflictingMission) {
    return {
      hasConflict: true,
      reason: `الضابط مكلف بمأمورية خلال هذا التاريخ (${conflictingMission.title})`,
      type: "mission",
    };
  }

  return { hasConflict: false };
}
