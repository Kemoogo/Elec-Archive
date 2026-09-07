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
  "custom_out",
] as const;

export type RollcallStatus = (typeof ROLLCALL_STATUSES)[number];

export const PRESENT_STATUSES: RollcallStatus[] = ["present", "daily_mission", "clinic", "custom_present"];
export const OUT_STATUSES: RollcallStatus[] = ["leave", "absent", "course", "rest", "external_mission", "mission", "medical", "attached", "hospital", "custom_out"];

export const ROLLCALL_STATUS_LABELS: Record<RollcallStatus, string> = {
  present: "داخل الوحدة (موجود)",
  daily_mission: "مأمورية يومية",
  clinic: "عيادة",
  custom_present: "سبب آخر (موجود)",
  leave: "إجازة",
  absent: "غياب",
  course: "فرقة",
  rest: "راحة",
  external_mission: "مأمورية خارجية",
  mission: "مأمورية خارجية",
  medical: "عيادة/راحة",
  attached: "ملحق",
  hospital: "حجز بمستشفى",
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
  relatedLeaveId?: Types.ObjectId | string;
  relatedMissionId?: Types.ObjectId | string;
  relatedAssignmentId?: Types.ObjectId | string;
  isLocked?: boolean;
  lockReason?: string;
  sourceId?: string;
  sourceType?: "leave" | "mission";
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
  let customOut = 0;

  for (const entry of entries) {
    const s = entry.status;
    if (s === "present") insideUnit++;
    else if (s === "daily_mission") dailyMission++;
    else if (s === "clinic") clinic++;
    else if (s === "custom_present") customPresent++;
    else if (s === "leave") leave++;
    else if (s === "absent") absence++;
    else if (s === "course") course++;
    else if (s === "rest") rest++;
    else if (s === "external_mission" || s === "mission") externalMission++;
    else if (s === "attached") attached++;
    else if (s === "hospital") hospital++;
    else if (s === "custom_out") customOut++;
    else if (s === "medical") clinic++;
  }

  const presentTotal = insideUnit + dailyMission + clinic + customPresent;
  const outTotal = leave + absence + course + rest + externalMission + attached + hospital + customOut;

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
      customOut,
    },
  };
}
