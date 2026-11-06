import { Types } from "mongoose";
import { connectToDatabase } from "@/lib/db/connect";
import { DutyRoster, type IDutyRosterDocEntry } from "@/lib/db/models/DutyRoster";

export interface ActiveOfficerDutyConflict {
  date: string; // YYYY-MM-DD
  dutyType: string;
  dutyTitle: string;
  roleType: "primary" | "yadak";
  isSwapped: boolean;
  rosterStatus: string;
}

function toLocalDateStr(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Searches for any active duty roster assignments for an officer within a date range.
 * If the officer was swapped out (originalOfficerId on a swapped duty), they are NO LONGER active on that duty.
 * If the officer was swapped in (assignedOfficerId on a swapped duty), they ARE active and blocked from leave.
 */
export async function getOfficerActiveDutiesInRange(
  officerId: string | Types.ObjectId,
  startDate: Date | string,
  endDate: Date | string
): Promise<ActiveOfficerDutyConflict[]> {
  await connectToDatabase();

  const offIdStr = officerId.toString();
  if (!Types.ObjectId.isValid(offIdStr)) {
    return [];
  }
  const offObjId = new Types.ObjectId(offIdStr);

  const startStr = typeof startDate === "string" ? startDate.slice(0, 10) : toLocalDateStr(startDate);
  const endStr = typeof endDate === "string" ? endDate.slice(0, 10) : toLocalDateStr(endDate);

  const startRange = new Date(startStr + "T00:00:00.000Z");
  const endRange = new Date(endStr + "T23:59:59.999Z");

  const rosters = await DutyRoster.find({
    "entries.date": { $gte: startRange, $lte: endRange },
    status: { $in: ["approved", "draft"] },
    $or: [
      { "entries.assignedOfficerId": offObjId },
      { "entries.yadakOfficerId": offObjId },
      { "entries.substituteOfficerId": offObjId },
    ],
  }).lean();

  const conflicts: ActiveOfficerDutyConflict[] = [];

  for (const roster of rosters) {
    const entries = (roster.entries || []) as IDutyRosterDocEntry[];
    for (const e of entries) {
      const eDateStr =
        e.date instanceof Date
          ? e.date.toISOString().slice(0, 10)
          : String(e.date).slice(0, 10);

      if (eDateStr < startStr || eDateStr > endStr) {
        continue;
      }

      // Check Primary Duty assignment
      if (e.assignedOfficerId && e.assignedOfficerId.toString() === offIdStr) {
        conflicts.push({
          date: eDateStr,
          dutyType: e.dutyType,
          dutyTitle: e.dutyTitle,
          roleType: "primary",
          isSwapped: Boolean(e.isSwapped),
          rosterStatus: roster.status,
        });
        continue;
      }

      // Check Yadak Duty assignment
      const yadakId = e.yadakOfficerId || e.substituteOfficerId;
      if (yadakId && yadakId.toString() === offIdStr) {
        conflicts.push({
          date: eDateStr,
          dutyType: e.dutyType,
          dutyTitle: e.dutyTitle,
          roleType: "yadak",
          isSwapped: false,
          rosterStatus: roster.status,
        });
      }
    }
  }

  // Deduplicate and sort by date
  return conflicts.sort((a, b) => a.date.localeCompare(b.date));
}

/**
 * Formats a user-friendly military error message explaining why a leave is blocked
 * due to unswapped active duty roster assignments.
 */
export function formatDutyConflictErrorMessage(conflicts: ActiveOfficerDutyConflict[]): string {
  if (conflicts.length === 0) return "";

  const lines = conflicts.map((c) => {
    const roleLabel = c.roleType === "yadak" ? "ضابط يدك" : "ضابط أساسي";
    const statusLabel = c.rosterStatus === "approved" ? "جدول معتمد" : "جدول قيد الإعداد";
    return `• يوم (${c.date}): خدمة [${c.dutyTitle}] (${roleLabel} - ${statusLabel})`;
  });

  return `لا يمكن تسجيل أو نزول الإجازة لوجود نوبتجيات مكلف بها الضابط في نفس الفترة:\n${lines.join(
    "\n"
  )}\n\nيجب تقديم وإتمام "مبادلة نوبتجية" مع ضابط بديل لهذه الخدمات أولاً قبل نزول الإجازة.`;
}
