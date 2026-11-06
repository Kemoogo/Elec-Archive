import { type Types } from "mongoose";

export const ROLLCALL_STATUSES = [
  "present",
  "daily_mission",
  "clinic",
  "custom_present",
  "leave",
  "absent",
  "course",
  "rest",
  "external_mission",
  "mission",
  "medical",
  "attached",
  "hospital",
  "prison",
  "unit_arrest",
  "court",
  "travel_abroad",
  "custom_out",
] as const;

export type RollcallStatus = (typeof ROLLCALL_STATUSES)[number];

export const PRESENT_STATUSES: RollcallStatus[] = ["present", "daily_mission", "clinic", "custom_present"];
export const OUT_STATUSES: RollcallStatus[] = [
  "leave",
  "absent",
  "course",
  "rest",
  "external_mission",
  "mission",
  "medical",
  "attached",
  "hospital",
  "prison",
  "unit_arrest",
  "court",
  "travel_abroad",
  "custom_out",
];

export const ROLLCALL_STATUS_LABELS: Record<RollcallStatus, string> = {
  present: "داخل الوحدة (موجود)",
  daily_mission: "مأمورية يومية",
  clinic: "عيادة",
  custom_present: "سبب آخر (موجود)",
  leave: "إجازة",
  absent: "غياب",
  course: "فرقة",
  rest: "بدل راحة",
  external_mission: "مأمورية خارجية",
  mission: "مأمورية خارجية",
  medical: "عيادة/راحة",
  attached: "ملحق",
  hospital: "حجز بمستشفى",
  prison: "سجن حربي",
  unit_arrest: "حجز بالوحدة",
  court: "محكمة ونيابة عسكرية",
  travel_abroad: "سفر للخارج",
  custom_out: "سبب آخر (خارج)",
};

export function isRollcallPresent(status: RollcallStatus): boolean {
  return PRESENT_STATUSES.includes(status);
}

export function isRollcallOut(status: RollcallStatus): boolean {
  return !isRollcallPresent(status);
}

export const ROLLCALL_DRAFT_STATUSES = ["draft", "submitted"] as const;
export type RollcallDraftStatus = (typeof ROLLCALL_DRAFT_STATUSES)[number];

export interface IRollcallEntry {
  officerId: Types.ObjectId | string;
  militaryId: string;
  fullName: string;
  rank: string;
  status: RollcallStatus;
  note?: string;
  customReason?: string;
  attachedDestination?: string;
  hospitalName?: string;
  hospitalAdmissionDate?: string;
  disciplinaryType?: "prison" | "unit_arrest" | "court" | string;
  disciplinaryAuthority?: string;
  travelDestination?: string;
  travelPurpose?: string;
  statusStartDate?: string;
  statusEndDate?: string;
  relatedLeaveId?: Types.ObjectId | string;
  relatedMissionId?: Types.ObjectId | string;
  relatedAssignmentId?: Types.ObjectId | string;
  isLocked?: boolean;
  lockReason?: string;
  sourceId?: string;
  sourceType?: "leave" | "mission";
  isReturningToday?: boolean;
  leaveTypeLabel?: string;
  leaveStartDate?: string;
  leaveEndDate?: string;
  missionTitle?: string;
  missionDestination?: string;
  missionStartDate?: string;
  missionEndDate?: string;
  isCourse?: boolean;
}

export interface ICustomRollcallTable {
  id: string;
  name: string;
  isInsideUnit: boolean;
  officerIds: string[];
  officerTasks?: Record<string, string>;
  notes?: string;
}

export interface RollcallBreakdown {
  totalOfficers: number;
  present: {
    total: number;
    insideUnit: number;
    dailyMission: number;
    clinic: number;
    customPresent: number;
  };
  out: {
    total: number;
    leave: number;
    absence: number;
    course: number;
    rest: number;
    externalMission: number;
    attached: number;
    hospital: number;
    disciplinary: number;
    travelAbroad: number;
    customOut: number;
  };
}

export function computeRollcallBreakdown(entries: IRollcallEntry[]): RollcallBreakdown {
  const totalOfficers = entries.length;

  let insideUnit = 0;
  let dailyMission = 0;
  let clinic = 0;
  let customPresent = 0;

  let leave = 0;
  let absence = 0;
  let course = 0;
  let rest = 0;
  let externalMission = 0;
  let attached = 0;
  let hospital = 0;
  let disciplinary = 0;
  let travelAbroad = 0;
  let customOut = 0;

  for (const entry of entries) {
    const s = entry.status;
    if (s === "present") insideUnit++;
    else if (s === "daily_mission") dailyMission++;
    else if (s === "clinic" || s === "medical") clinic++;
    else if (s === "custom_present") customPresent++;
    else if (s === "leave") leave++;
    else if (s === "absent") absence++;
    else if (s === "course") course++;
    else if (s === "rest") rest++;
    else if (s === "external_mission" || s === "mission") externalMission++;
    else if (s === "attached") attached++;
    else if (s === "hospital") hospital++;
    else if (s === "prison" || s === "unit_arrest" || s === "court") disciplinary++;
    else if (s === "travel_abroad") travelAbroad++;
    else if (s === "custom_out") customOut++;
  }

  const presentTotal = insideUnit + dailyMission + clinic + customPresent;
  const outTotal =
    leave +
    absence +
    course +
    rest +
    externalMission +
    attached +
    hospital +
    disciplinary +
    travelAbroad +
    customOut;

  return {
    totalOfficers,
    present: {
      total: presentTotal,
      insideUnit,
      dailyMission,
      clinic,
      customPresent,
    },
    out: {
      total: outTotal,
      leave,
      absence,
      course,
      rest,
      externalMission,
      attached,
      hospital,
      disciplinary,
      travelAbroad,
      customOut,
    },
  };
}

export interface DetailedRollcallOutColumn {
  id: string;
  label: string;
  count: number;
}

export function computeDetailedOutColumns(
  entries: Array<{
    id?: string;
    officerId?: string | Types.ObjectId;
    status: RollcallStatus;
    leaveTypeLabel?: string;
    missionTitle?: string;
    isCourse?: boolean;
    customReason?: string;
    hospitalName?: string;
    disciplinaryType?: string;
    disciplinaryAuthority?: string;
    travelDestination?: string;
    isReturningToday?: boolean;
  }>,
  customTables: ICustomRollcallTable[] = []
): DetailedRollcallOutColumn[] {
  const customTableOfficerMap = new Map<string, ICustomRollcallTable>();
  for (const tbl of customTables) {
    for (const id of tbl.officerIds || []) {
      customTableOfficerMap.set(String(id), tbl);
    }
  }

  const categoryMap = new Map<string, DetailedRollcallOutColumn>();

  const addCount = (id: string, label: string) => {
    const existing = categoryMap.get(id);
    if (existing) {
      existing.count++;
    } else {
      categoryMap.set(id, { id, label, count: 1 });
    }
  };

  for (const o of entries) {
    if (o.isReturningToday) continue;

    const oid = String(o.officerId || o.id || "");
    const assignedTable = customTableOfficerMap.get(oid);
    if (assignedTable) {
      if (!assignedTable.isInsideUnit) {
        addCount(`custom_${assignedTable.id}`, assignedTable.name);
      }
      continue;
    }

    if (isRollcallPresent(o.status)) continue;

    if (o.status === "rest") {
      addCount("rest", "بدل راحة");
    } else if (o.status === "absent") {
      addCount("absent", "غياب");
    } else if (o.status === "hospital") {
      addCount("hospital", "حجز بمستشفى");
    } else if (o.status === "prison") {
      addCount("disciplinary_prison", "سجن حربي");
    } else if (o.status === "unit_arrest") {
      addCount("disciplinary_arrest", "حجز بالوحدة");
    } else if (o.status === "court") {
      addCount("disciplinary_court", "محكمة ونيابة");
    } else if (o.status === "travel_abroad") {
      addCount("travel_abroad", "سفر للخارج");
    } else if (o.status === "attached") {
      addCount("attached", "ملحق");
    } else if (o.status === "course" || o.isCourse) {
      if ((o.missionTitle || "").includes("دورة")) {
        addCount("course_dawra", "دورة");
      } else {
        addCount("course_ferqa", "فرقة");
      }
    } else if (o.status === "external_mission" || o.status === "mission") {
      addCount("external_mission", "مأمورية خارجية");
    } else if (o.status === "custom_out") {
      const lbl = o.customReason || "سبب آخر (خارج)";
      addCount(`custom_out_${lbl}`, lbl);
    } else if (o.status === "leave" || o.leaveTypeLabel) {
      const raw = (o.leaveTypeLabel || "").trim();
      if (raw.includes("ميدان")) {
        addCount("leave_field", "إجازة ميدانية");
      } else if (raw.includes("سنو")) {
        addCount("leave_annual", "إجازة سنوية");
      } else if (raw.includes("عارض")) {
        addCount("leave_casual", "إجازة عارضة");
      } else if (raw.includes("مرض")) {
        addCount("leave_medical", "إجازة مرضية");
      } else if (raw.includes("إذن") || raw.includes("اذن")) {
        addCount("leave_permission", "إذن رسمي");
      } else if (raw.includes("مبيت")) {
        addCount("leave_sleep", "مبيت يومي");
      } else if (raw.includes("بدل راحة")) {
        addCount("leave_comp_rest", "بدل راحة");
      } else if (raw.includes("اعتياد")) {
        addCount("leave_regular", "إجازة اعتيادية");
      } else if (raw.length > 0) {
        const formatted = raw.includes("إجازة") || raw.includes("اجازة") ? raw : `إجازة ${raw}`;
        addCount(`leave_${raw}`, formatted);
      } else {
        addCount("leave_regular", "إجازة اعتيادية");
      }
    } else {
      addCount("other_out", "خارج الوحدة");
    }
  }

  return Array.from(categoryMap.values());
}

