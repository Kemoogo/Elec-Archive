import { Types } from "mongoose";
import type { IOfficer } from "@/lib/db/models/Officer";
import { RANK_LABELS, EMPLOYMENT_LABELS, OFFICER_TYPE_LABELS, OFFICER_WEAPON_LABELS } from "@/lib/db/models/Officer";
import { MISSION_STATUS_LABELS, MISSION_STATUS_COLORS } from "@/lib/db/models/Mission.shared";
import { POSITION_STATUS_LABELS, POSITION_TYPE_LABELS } from "@/lib/db/models/PositionAssignment.shared";
import { MOVEMENT_LABELS } from "@/lib/db/models/ServiceHistory.shared";
import type { PositionType, PositionStatus } from "@/lib/db/models/PositionAssignment.shared";

import type { IPositionAssignment } from "@/lib/db/models/PositionAssignment";
import type { ILeave } from "@/lib/db/models/Leave";
import type { IPromotion } from "@/lib/db/models/Promotion";
import type { IMission } from "@/lib/db/models/Mission";
import type { IServiceHistory } from "@/lib/db/models/ServiceHistory";

export interface OfficerListItem {
  id: string;
  militaryId: string;
  seniorityNumber: string;
  fullName: string;
  rank: string;
  rankLabel: string;
  batch: string;
  type: string;
  typeLabel: string;
  weapon: string;
  weaponLabel: string;
  phone: string;
  nationalId: string;
  unit: string;
  position: string;
  joinDate: string;
  birthDate: string;
  graduationDate?: string;
  bloodType?: string;
  religion?: string;
  maritalStatus?: string;
  faculty?: string;
  file121IssueDate?: string;
  employmentStatus: string;
  employmentStatusLabel: string;
  isInUnit: boolean;
  file121Url: string;
  photoUrl: string;
  isArkanHarb: boolean;
  officerLabel: string;
}

export interface OfficerDetailData {
  id: string;
  militaryId: string;
  seniorityNumber: string;
  fullName: string;
  rank: string;
  rankLabel: string;
  batch: string;
  type: string;
  typeLabel: string;
  weapon: string;
  weaponLabel: string;
  phone: string;
  nationalId: string;
  unit: string;
  position: string;
  employmentStatus: string;
  employmentStatusLabel: string;
  isInUnit: boolean;
  joinDate: string;
  birthDate: string;
  graduationDate: string;
  bloodType: string;
  religion: string;
  maritalStatus: string;
  faculty: string;
  file121Url: string;
  file121UpdatedAt: string;
  file121IssueDate: string;
  photoUrl: string;
  isArkanHarb: boolean;
  officerLabel: string;
  createdAt: string;
  updatedAt: string;
}

export type OfficerLean = IOfficer & {
  _id: Types.ObjectId;
};

export interface SerializedPositionInterval {
  id: string;
  role: PositionType;
  roleLabel: string;
  startDate: string;
  endDate: string | null;
  status: PositionStatus;
  statusLabel: string;
  notes?: string;
}

export interface SerializedPositionGroup {
  id: string;
  positionTitle: string;
  department: string;
  role: PositionType | "both";
  roleLabel: string;
  recordsCount: number;
  status: PositionStatus;
  statusLabel: string;
  intervals: SerializedPositionInterval[];
}

export type SerializedPosition = SerializedPositionGroup;

export interface SerializedLeave {
  id: string;
  type: string;
  category: string;
  startDate: string;
  endDate: string;
  status: string;
}

export type SerializedTimelineEventType = 
  | "join" 
  | "promotion" 
  | "mission" 
  | "transfer" 
  | "termination" 
  | "return" 
  | "death" 
  | "retirement";

export interface SerializedTimelineEvent {
  id: string;
  type: SerializedTimelineEventType;
  date: string | number;
  endDate?: string | number;
  title: string;
  description?: string;
  statusLabel?: string;
  statusColor?: string;
  badge?: string;
}

export function serializeOfficerListItem(officer: OfficerLean): OfficerListItem {
  return {
    id: officer._id.toString(),
    militaryId: officer.militaryId,
    seniorityNumber: officer.seniorityNumber,
    fullName: officer.fullName,
    rank: officer.rank,
    rankLabel: `${RANK_LABELS[officer.rank] ?? officer.rank}${officer.isArkanHarb ? " أ ح" : ""}`,
    batch: officer.batch ?? "",
    type: officer.type ?? "",
    typeLabel: officer.type ? (OFFICER_TYPE_LABELS[officer.type] ?? officer.type) : "",
    weapon: officer.weapon ?? "",
    weaponLabel: officer.weapon ? (OFFICER_WEAPON_LABELS[officer.weapon] ?? officer.weapon) : "",
    phone: officer.phone ?? "",
    nationalId: officer.nationalId ?? "",
    unit: officer.unit ?? "",
    position: officer.position ?? "",
    joinDate: officer.joinDate ? officer.joinDate.toISOString() : new Date().toISOString(),
    birthDate: officer.birthDate ? officer.birthDate.toISOString() : "",
    graduationDate: officer.graduationDate ? officer.graduationDate.toISOString() : "",
    bloodType: officer.bloodType ?? "",
    religion: officer.religion ?? "",
    maritalStatus: officer.maritalStatus ?? "",
    faculty: officer.faculty ?? "",
    file121IssueDate: officer.file121IssueDate ?? "",
    employmentStatus: officer.employmentStatus ?? "inactive",
    employmentStatusLabel: EMPLOYMENT_LABELS[officer.employmentStatus] ?? officer.employmentStatus ?? "غير محدد",
    isInUnit: officer.isInUnit ?? false,
    file121Url: officer.file121Url ?? "",
    photoUrl: officer.photoUrl ?? "",
    isArkanHarb: officer.isArkanHarb ?? false,
    officerLabel: `${RANK_LABELS[officer.rank] ?? officer.rank}${officer.isArkanHarb ? " أ ح" : ""} / ${officer.fullName}`,
  };
}

export function serializeOfficerDetail(officer: OfficerLean): OfficerDetailData {
  return {
    id: officer._id.toString(),
    militaryId: officer.militaryId,
    seniorityNumber: officer.seniorityNumber,
    fullName: officer.fullName,
    rank: officer.rank,
    rankLabel: `${RANK_LABELS[officer.rank] ?? officer.rank}${officer.isArkanHarb ? " أ ح" : ""}`,
    batch: officer.batch ?? "",
    type: officer.type ?? "",
    typeLabel: officer.type ? (OFFICER_TYPE_LABELS[officer.type] ?? officer.type) : "",
    weapon: officer.weapon ?? "",
    weaponLabel: officer.weapon ? (OFFICER_WEAPON_LABELS[officer.weapon] ?? officer.weapon) : "",
    phone: officer.phone ?? "",
    nationalId: officer.nationalId ?? "",
    unit: officer.unit ?? "",
    position: officer.position ?? "",
    employmentStatus: officer.employmentStatus ?? "inactive",
    employmentStatusLabel: EMPLOYMENT_LABELS[officer.employmentStatus] ?? officer.employmentStatus ?? "غير محدد",
    isInUnit: officer.isInUnit ?? false,
    joinDate: officer.joinDate ? officer.joinDate.toISOString() : new Date().toISOString(),
    birthDate: officer.birthDate ? officer.birthDate.toISOString() : "",
    graduationDate: officer.graduationDate ? officer.graduationDate.toISOString() : "",
    bloodType: officer.bloodType ?? "",
    religion: officer.religion ?? "",
    maritalStatus: officer.maritalStatus ?? "",
    faculty: officer.faculty ?? "",
    file121Url: officer.file121Url ?? "",
    file121UpdatedAt: officer.file121UpdatedAt ? officer.file121UpdatedAt.toISOString() : "",
    file121IssueDate: officer.file121IssueDate ?? "",
    photoUrl: officer.photoUrl ?? "",
    isArkanHarb: officer.isArkanHarb ?? false,
    officerLabel: `${RANK_LABELS[officer.rank] ?? officer.rank}${officer.isArkanHarb ? " أ ح" : ""} / ${officer.fullName}`,
    createdAt: (officer.createdAt || new Date()).toISOString(),
    updatedAt: (officer.updatedAt || new Date()).toISOString(),
  };
}

function safeIso(val: unknown, fallback: Date = new Date()): string {
  if (!val) return fallback.toISOString();
  const d = new Date(val as string | number | Date);
  return isNaN(d.getTime()) ? fallback.toISOString() : d.toISOString();
}

function safeTime(val: unknown, fallback: number = Date.now()): number {
  if (!val) return fallback;
  const d = new Date(val as string | number | Date);
  return isNaN(d.getTime()) ? fallback : d.getTime();
}

function matchOfficerId(rawOfficerId: unknown, targetOfficerId?: string): boolean {
  if (!targetOfficerId) return true;
  if (!rawOfficerId) return false;
  if (typeof rawOfficerId === "object") {
    const obj = rawOfficerId as { _id?: unknown; id?: unknown };
    const str = String(obj._id || obj.id || "");
    return str === targetOfficerId;
  }
  return String(rawOfficerId) === targetOfficerId;
}

export function serializePositions(
  positions: (IPositionAssignment & { _id: Types.ObjectId })[],
  officerId?: string
): SerializedPositionGroup[] {
  if (!Array.isArray(positions)) return [];
  const result: SerializedPositionGroup[] = [];

  for (const pa of positions) {
    if (!pa) continue;
    const rawIntervals: SerializedPositionInterval[] = [];
    const paId = pa._id ? pa._id.toString() : String(Math.random());

    if (pa.assignmentHistory && Array.isArray(pa.assignmentHistory) && pa.assignmentHistory.length > 0) {
      for (const h of pa.assignmentHistory) {
        if (!h) continue;
        if (matchOfficerId(h.officerId, officerId)) {
          const isAct = !h.endDate;
          const statusKey: PositionStatus = isAct ? "active" : "ended";
          const hId = h._id ? h._id.toString() : `${paId}-${safeIso(h.startDate)}`;
          rawIntervals.push({
            id: hId,
            role: h.role || "primary",
            roleLabel: POSITION_TYPE_LABELS[h.role] || (h.role === "primary" ? "ضابط أساسي" : "ضابط بديل"),
            startDate: safeIso(h.startDate),
            endDate: h.endDate ? safeIso(h.endDate) : null,
            status: statusKey,
            statusLabel: POSITION_STATUS_LABELS[statusKey] || (isAct ? "تكليف سارٍ" : "منتهٍ"),
            notes: h.notes || undefined,
          });
        }
      }
    }

    // Fallback if no history entries were recorded yet
    if (rawIntervals.length === 0 && officerId) {
      const isPrimary = pa.primaryOfficerId && pa.primaryOfficerId.toString() === officerId;
      const isSub =
        Array.isArray(pa.substituteOfficerIds) &&
        pa.substituteOfficerIds.some((s) => s && s.toString() === officerId);
      if (isPrimary || isSub) {
        const roleKey: PositionType = isPrimary ? "primary" : "substitute";
        rawIntervals.push({
          id: paId,
          role: roleKey,
          roleLabel: POSITION_TYPE_LABELS[roleKey] || (isPrimary ? "ضابط أساسي" : "ضابط بديل"),
          startDate: safeIso(pa.primaryStartDate || pa.createdAt),
          endDate: null,
          status: "active",
          statusLabel: "تكليف سارٍ",
          notes: pa.notes || undefined,
        });
      }
    }

    if (rawIntervals.length > 0) {
      rawIntervals.sort((a, b) => safeTime(b.startDate) - safeTime(a.startDate));

      const hasPrimary = rawIntervals.some((i) => i.role === "primary");
      const hasSub = rawIntervals.some((i) => i.role === "substitute");
      const combinedRole: PositionType | "both" =
        hasPrimary && hasSub ? "both" : hasPrimary ? "primary" : "substitute";
      const combinedRoleLabel =
        combinedRole === "both"
          ? "أساسي / بديل"
          : combinedRole === "primary"
          ? "ضابط أساسي"
          : "ضابط بديل";

      const isActive = rawIntervals.some((i) => i.status === "active");
      const statusKey: PositionStatus = isActive ? "active" : "ended";

      result.push({
        id: paId,
        positionTitle: pa.positionTitle || "وظيفة بدون مسمى",
        department: pa.department || "القيادة",
        role: combinedRole,
        roleLabel: combinedRoleLabel,
        recordsCount: rawIntervals.length,
        status: statusKey,
        statusLabel: isActive ? "تكليف سارٍ" : "تكليف سابق (منتهٍ)",
        intervals: rawIntervals,
      });
    }
  }

  return result;
}

export function serializeLeaves(leaves: (ILeave & { _id: Types.ObjectId })[]): SerializedLeave[] {
  return leaves.map((l) => ({
    id: l._id.toString(),
    type: l.type,
    category: l.category,
    startDate: safeIso(l.startDate),
    endDate: safeIso(l.endDate),
    status: l.status,
  }));
}

export function buildCareerTimeline(
  officer: OfficerLean,
  promotions: (IPromotion & { _id: Types.ObjectId })[],
  missions: (IMission & { _id: Types.ObjectId })[],
  movements: (IServiceHistory & { _id: Types.ObjectId })[]
): SerializedTimelineEvent[] {
  const isArkanHarb = officer.isArkanHarb;
  const currentJoinDate = safeTime(officer.joinDate);

  // Separate join movements to avoid duplicates and handle rejoined status
  const nonJoinMovements = movements.filter((m) => m.action !== "join");
  const joinMovements = movements
    .filter((m) => m.action === "join")
    .sort((a, b) => safeTime(a.date) - safeTime(b.date));

  const joinEvents: SerializedTimelineEvent[] = joinMovements.map((m, idx) => {
    const isFirstJoin = idx === 0;
    const isCurrentJoin = safeTime(m.date) === currentJoinDate;

    return {
      id: m._id.toString(),
      type: "join",
      date: safeTime(m.date),
      title: isFirstJoin ? "أول انضمام للخدمة" : "إعادة انضمام للخدمة",
      description: isCurrentJoin
        ? `تم الانضمام برتبة ${RANK_LABELS[officer.rank] || officer.rank}${isArkanHarb ? " أ ح" : ""}`
        : m.notes,
      badge: isFirstJoin && !isCurrentJoin ? "تاريخ أصلي" : undefined,
    };
  });

  // If no join movements exist, fallback to the officer's current joinDate
  if (joinEvents.length === 0) {
    joinEvents.push({
      id: "join-fallback",
      type: "join",
      date: currentJoinDate,
      title: "الانضمام إلى الخدمة",
      description: `تم الانضمام برتبة ${RANK_LABELS[officer.rank] || officer.rank}${isArkanHarb ? " أ ح" : ""}`,
    });
  }

  return [
    ...joinEvents,
    ...promotions.map((p) => ({
      id: p._id.toString(),
      type: "promotion" as SerializedTimelineEventType,
      date: safeTime(p.effectiveDate),
      title: `ترقية إلى ${RANK_LABELS[p.toRank] || p.toRank}${isArkanHarb ? " أ ح" : ""}`,
      description: p.notes,
      badge: RANK_LABELS[p.fromRank] ? `${RANK_LABELS[p.fromRank]} ← ${RANK_LABELS[p.toRank]}` : undefined,
    })),
    ...missions.map((m) => ({
      id: m._id.toString(),
      type: "mission" as SerializedTimelineEventType,
      date: safeTime(m.startDate),
      endDate: m.endDate ? safeTime(m.endDate) : undefined,
      title: m.title,
      description: m.description,
      statusLabel: MISSION_STATUS_LABELS[m.status] || m.status,
      statusColor:
        MISSION_STATUS_COLORS[m.status] ||
        "bg-(--app-surface-container) text-(--app-muted-foreground) border-(--app-border)",
    })),
    ...nonJoinMovements.map((m) => ({
      id: m._id.toString(),
      type: m.action as SerializedTimelineEventType,
      date: safeTime(m.date),
      title: MOVEMENT_LABELS[m.action] || m.action,
      description: m.notes,
    })),
  ];
}

export function getOriginalJoinDate(
  currentJoinDateStr: string | Date,
  movements: (IServiceHistory & { _id: Types.ObjectId })[]
): { originalJoinDate: Date | null; isRejoined: boolean } {
  const currentJoinDate = new Date(currentJoinDateStr);
  
  // Get all movements and sort by date ascending to find the earliest record
  const sortedMovements = [...movements].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  const firstMovementDate = sortedMovements.length > 0 ? new Date(sortedMovements[0].date) : null;
  
  // Use the earliest movement date as the original join date
  const originalJoinDate = firstMovementDate;

  // We consider it a "rejoin" if the original date is significantly earlier than the current join date (e.g., > 24 hours)
  const isRejoined = originalJoinDate 
    ? (currentJoinDate.getTime() - originalJoinDate.getTime()) > (24 * 60 * 60 * 1000) 
    : false;
  
  return { originalJoinDate, isRejoined };
}
