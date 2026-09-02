/**
 * Utility to merge overlapping or adjacent assignment history intervals for the same officer and role.
 */

export function extractOfficerIdFromUnknown(officer: unknown): string {
  if (!officer) return "";
  if (typeof officer === "string") return officer.trim();
  if (typeof officer === "object" && officer !== null) {
    const obj = officer as { _id?: unknown; id?: unknown };
    if (obj.id && String(obj.id) !== "undefined" && String(obj.id) !== "null") {
      return String(obj.id);
    }
    if (obj._id && String(obj._id) !== "undefined" && String(obj._id) !== "null") {
      return typeof obj._id === "object" && "_id" in (obj._id as object)
        ? String((obj._id as { _id: unknown })._id)
        : String(obj._id);
    }
  }
  return "";
}

export function mergeHistoryIntervals<T extends {
  _id?: unknown;
  officerId: unknown;
  role: "primary" | "substitute";
  startDate: string | Date;
  endDate?: string | Date | null;
  notes?: string;
}>(historyList: T[]): T[] {
  if (!historyList || historyList.length <= 1) return historyList;

  // Group by officerId + role
  const groups = new Map<string, T[]>();
  for (const item of historyList) {
    const offId = extractOfficerIdFromUnknown(item.officerId);
    const key = `${offId}_${item.role}`;
    if (!groups.has(key)) {
      groups.set(key, []);
    }
    groups.get(key)!.push(item);
  }

  const result: T[] = [];

  for (const group of groups.values()) {
    // Sort ascending by startDate
    const sorted = [...group].sort((a, b) => {
      const timeA = a.startDate ? new Date(a.startDate).getTime() : 0;
      const timeB = b.startDate ? new Date(b.startDate).getTime() : 0;
      return timeA - timeB;
    });

    const merged: T[] = [];

    for (const curr of sorted) {
      if (merged.length === 0) {
        merged.push({ ...curr });
        continue;
      }

      const prev = merged[merged.length - 1];
      const _prevStart = prev.startDate ? new Date(prev.startDate).getTime() : 0;
      const prevEnd = prev.endDate ? new Date(prev.endDate).getTime() : null;
      const currStart = curr.startDate ? new Date(curr.startDate).getTime() : 0;
      const currEnd = curr.endDate ? new Date(curr.endDate).getTime() : null;

      // Check if overlapping or adjacent (within 24 hours / 86400000 ms)
      const isOverlappingOrAdjacent =
        prevEnd === null || // prev is still ongoing, so it absorbs everything after
        prevEnd >= currStart - 86400000; // prev extends up to or past currStart (or adjacent next day)

      if (isOverlappingOrAdjacent) {
        // Merge intervals
        if (prevEnd === null || currEnd === null) {
          prev.endDate = null;
        } else {
          const maxEndMs = Math.max(prevEnd, currEnd);
          prev.endDate = prev.endDate instanceof Date ? new Date(maxEndMs) : new Date(maxEndMs).toISOString() as unknown as Date;
        }

        // Merge notes if any
        if (curr.notes && !prev.notes?.includes(curr.notes)) {
          prev.notes = prev.notes ? `${prev.notes} • ${curr.notes}` : curr.notes;
        }
      } else {
        merged.push({ ...curr });
      }
    }

    result.push(...merged);
  }

  // Sort all merged records descending by startDate for recent-first presentation
  return result.sort((a, b) => {
    const timeA = a.startDate ? new Date(a.startDate).getTime() : 0;
    const timeB = b.startDate ? new Date(b.startDate).getTime() : 0;
    return timeB - timeA;
  });
}
