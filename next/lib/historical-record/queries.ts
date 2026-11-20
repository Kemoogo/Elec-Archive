import type { Types } from "mongoose";
import { escapeRegex } from "@/lib/utils";
import { HistoricalVisit } from "@/lib/db/models/HistoricalVisit";
import {
  HistoricalCommander,
  type IOfficerSnapshot,
} from "@/lib/db/models/HistoricalCommander";
import {
  UnitHistoricalMilestone,
  UnitHistoricalProfile,
} from "@/lib/db/models/UnitHistoricalInfo";
import { Officer } from "@/lib/db/models/Officer";
import { formatOfficerRank, RANK_WEIGHTS } from "@/lib/db/models/Officer.shared";
import { calculateCommandDuration } from "./duration";
import {
  formatMilestoneCategoryLabel,
  type CommanderStatusFilter,
  type HistoricalCommanderDTO,
  type HistoricalCommandersListResponse,
  type HistoricalMilestonesListResponse,
  type HistoricalOfficerOptionDTO,
  type HistoricalVisitDTO,
  type HistoricalVisitsListResponse,
  type TimelineSortOrder,
  type UnitHistoricalMilestoneDTO,
  type UnitHistoricalProfileDTO,
  type UnitMilestoneCategory,
} from "@/types/historical-record";

type PopulatedUserRef =
  | Types.ObjectId
  | string
  | { _id: Types.ObjectId | string; fullName?: string }
  | null
  | undefined;

interface VisitLeanDoc {
  _id: Types.ObjectId | string;
  title: string;
  visitorName: string;
  visitDate: Date | string;
  description?: string;
  photos?: string[];
  createdBy: PopulatedUserRef;
  createdAt: Date | string;
  updatedAt: Date | string;
}

interface CommanderLeanDoc {
  _id: Types.ObjectId | string;
  officerId?: Types.ObjectId | string;
  officerSnapshot: IOfficerSnapshot;
  photoUrl?: string;
  startDate: Date | string;
  endDate?: Date | string;
  isCurrent: boolean;
  notes?: string;
  createdBy: PopulatedUserRef;
  createdAt: Date | string;
  updatedAt: Date | string;
}

interface UnitProfileLeanDoc {
  _id: Types.ObjectId | string;
  unitName: string;
  foundingDate?: Date | string;
  affiliation?: string;
  location?: string;
  motto?: string;
  mission?: string;
  emblemUrl?: string;
  updatedBy?: PopulatedUserRef;
  updatedAt: Date | string;
}

interface MilestoneLeanDoc {
  _id: Types.ObjectId | string;
  milestoneDate: Date | string;
  title: string;
  category: UnitMilestoneCategory;
  description?: string;
  photos?: string[];
  createdBy: PopulatedUserRef;
  createdAt: Date | string;
  updatedAt: Date | string;
}

interface OfficerOptionLeanDoc {
  _id: Types.ObjectId | string;
  militaryId: string;
  seniorityNumber: string;
  fullName: string;
  rank: string;
  isArkanHarb?: boolean;
  isInUnit: boolean;
  employmentStatus: string;
  photoUrl?: string;
}

function extractUserRef(ref: PopulatedUserRef): { id: string; name?: string } {
  if (!ref) return { id: "" };
  if (typeof ref === "string") return { id: ref };
  if (typeof ref === "object" && "fullName" in ref) {
    return {
      id: String(ref._id),
      name: ref.fullName,
    };
  }
  return { id: String(ref) };
}

/**
 * Converts a strict YYYY-MM-DD string to a UTC midday Date to prevent timezone drift.
 */
export function toUtcMiddayDate(isoDate: string): Date {
  return new Date(`${isoDate}T12:00:00.000Z`);
}

/**
 * Formats a Date or string into strict ISO calendar date YYYY-MM-DD.
 */
export function toIsoDateOnly(value?: Date | string | null): string | undefined {
  if (!value) return undefined;
  if (typeof value === "string") {
    const match = value.match(/^(\d{4}-\d{2}-\d{2})/);
    if (match) return match[1];
  }
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return undefined;
  return d.toISOString().slice(0, 10);
}

function toIsoTimestamp(value?: Date | string | null): string {
  if (!value) return new Date().toISOString();
  const d = value instanceof Date ? value : new Date(value);
  return Number.isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString();
}

export function serializeHistoricalVisit(doc: VisitLeanDoc): HistoricalVisitDTO {
  const user = extractUserRef(doc.createdBy);
  return {
    id: String(doc._id),
    title: doc.title,
    visitorName: doc.visitorName,
    visitDate: toIsoDateOnly(doc.visitDate) ?? "",
    description: doc.description || undefined,
    photos: Array.isArray(doc.photos) ? doc.photos : [],
    createdBy: user.id,
    createdByName: user.name,
    createdAt: toIsoTimestamp(doc.createdAt),
    updatedAt: toIsoTimestamp(doc.updatedAt),
  };
}

export function serializeHistoricalCommander(
  doc: CommanderLeanDoc,
): HistoricalCommanderDTO {
  const user = extractUserRef(doc.createdBy);
  const startDate = toIsoDateOnly(doc.startDate) ?? "";
  const endDate = doc.isCurrent ? undefined : toIsoDateOnly(doc.endDate);
  const rankLabel = formatOfficerRank(doc.officerSnapshot.rank);

  return {
    id: String(doc._id),
    officerId: doc.officerId ? String(doc.officerId) : undefined,
    officerSnapshot: {
      militaryId: doc.officerSnapshot.militaryId,
      fullName: doc.officerSnapshot.fullName,
      rank: doc.officerSnapshot.rank,
      rankLabel: rankLabel || doc.officerSnapshot.rank,
      seniorityNumber: doc.officerSnapshot.seniorityNumber || undefined,
    },
    photoUrl: doc.photoUrl || undefined,
    startDate,
    endDate,
    isCurrent: Boolean(doc.isCurrent),
    durationLabel: calculateCommandDuration(startDate, endDate, doc.isCurrent),
    notes: doc.notes || undefined,
    createdBy: user.id,
    createdByName: user.name,
    createdAt: toIsoTimestamp(doc.createdAt),
    updatedAt: toIsoTimestamp(doc.updatedAt),
  };
}

export function serializeUnitProfile(
  doc: UnitProfileLeanDoc,
): UnitHistoricalProfileDTO {
  const user = extractUserRef(doc.updatedBy);
  return {
    id: String(doc._id),
    unitName: doc.unitName,
    foundingDate: toIsoDateOnly(doc.foundingDate),
    affiliation: doc.affiliation || undefined,
    location: doc.location || undefined,
    motto: doc.motto || undefined,
    mission: doc.mission || undefined,
    emblemUrl: doc.emblemUrl || undefined,
    updatedBy: user.id || undefined,
    updatedByName: user.name,
    updatedAt: toIsoTimestamp(doc.updatedAt),
  };
}

export function serializeUnitMilestone(
  doc: MilestoneLeanDoc,
): UnitHistoricalMilestoneDTO {
  const user = extractUserRef(doc.createdBy);
  return {
    id: String(doc._id),
    milestoneDate: toIsoDateOnly(doc.milestoneDate) ?? "",
    title: doc.title,
    category: doc.category,
    categoryLabel: formatMilestoneCategoryLabel(doc.category),
    description: doc.description || undefined,
    photos: Array.isArray(doc.photos) ? doc.photos : [],
    createdBy: user.id,
    createdByName: user.name,
    createdAt: toIsoTimestamp(doc.createdAt),
    updatedAt: toIsoTimestamp(doc.updatedAt),
  };
}

function buildYearRange(year: number): { $gte: Date; $lte: Date } {
  return {
    $gte: new Date(Date.UTC(year, 0, 1, 0, 0, 0, 0)),
    $lte: new Date(Date.UTC(year, 11, 31, 23, 59, 59, 999)),
  };
}

function normalizeSearchTerm(search?: string): string | null {
  const trimmed = search?.trim() ?? "";
  return trimmed.length >= 2 ? trimmed : null;
}

const OPEN_ENDED_TENURE_DATE = "9999-12-31";

export interface OverlapCheckParams {
  startDate: string;
  endDate?: string;
  isCurrent: boolean;
  excludeCommanderId?: string;
  closedCurrentCommanderId?: string;
  closedCurrentEndDate?: string;
}

/**
 * Checks whether a proposed command tenure overlaps any existing HistoricalCommander tenure.
 * Allows seamless handoff on the exact same calendar day (aEnd === bStart when at least one spans > 0 days),
 * while blocking multi-day overlaps and duplicate single-day tenures on the exact same date.
 */
export async function findOverlappingCommander(
  params: OverlapCheckParams,
): Promise<HistoricalCommanderDTO | null> {
  const query: Record<string, unknown> = {};
  if (params.excludeCommanderId) {
    query._id = { $ne: params.excludeCommanderId };
  }

  const existingDocs = await HistoricalCommander.find(query)
    .populate("createdBy", "fullName")
    .lean<CommanderLeanDoc[]>();

  const candidateStart = params.startDate;
  const candidateEnd = params.isCurrent
    ? OPEN_ENDED_TENURE_DATE
    : (params.endDate ?? params.startDate);

  for (const doc of existingDocs) {
    const docId = String(doc._id);
    const otherStart = toIsoDateOnly(doc.startDate) ?? "";
    let otherEnd: string;

    if (
      params.closedCurrentCommanderId &&
      docId === params.closedCurrentCommanderId &&
      params.closedCurrentEndDate
    ) {
      otherEnd = params.closedCurrentEndDate;
    } else if (doc.isCurrent) {
      otherEnd = OPEN_ENDED_TENURE_DATE;
    } else {
      otherEnd = toIsoDateOnly(doc.endDate) ?? otherStart;
    }

    const strictOverlap = candidateStart < otherEnd && otherStart < candidateEnd;
    const sameSingleDay =
      candidateStart === candidateEnd &&
      otherStart === otherEnd &&
      candidateStart === otherStart;

    if (strictOverlap || sameSingleDay) {
      return serializeHistoricalCommander(doc);
    }
  }

  return null;
}

export async function queryHistoricalVisits(filters: {
  search?: string;
  year?: number;
  sortOrder?: TimelineSortOrder;
}): Promise<HistoricalVisitsListResponse> {
  const query: Record<string, unknown> = {};
  const term = normalizeSearchTerm(filters.search);
  if (term) {
    const regex = new RegExp(escapeRegex(term), "i");
    query.$or = [
      { title: regex },
      { visitorName: regex },
      { description: regex },
    ];
  }
  if (filters.year) {
    query.visitDate = buildYearRange(filters.year);
  }

  const sortDir = filters.sortOrder === "asc" ? 1 : -1;

  const [docs, yearDates] = await Promise.all([
    HistoricalVisit.find(query)
      .sort({ visitDate: sortDir, createdAt: sortDir })
      .populate("createdBy", "fullName")
      .lean<VisitLeanDoc[]>(),
    HistoricalVisit.find({}, { visitDate: 1 }).lean<{ visitDate: Date }[]>(),
  ]);

  const yearsSet = new Set<number>();
  for (const row of yearDates) {
    const iso = toIsoDateOnly(row.visitDate);
    if (iso) yearsSet.add(Number(iso.slice(0, 4)));
  }

  return {
    items: docs.map(serializeHistoricalVisit),
    availableYears: Array.from(yearsSet).sort((a, b) => b - a),
  };
}

export async function queryHistoricalCommanders(filters: {
  search?: string;
  year?: number;
  status?: CommanderStatusFilter;
  sortOrder?: TimelineSortOrder;
}): Promise<HistoricalCommandersListResponse> {
  const query: Record<string, unknown> = {};
  const term = normalizeSearchTerm(filters.search);
  if (term) {
    const regex = new RegExp(escapeRegex(term), "i");
    query.$or = [
      { "officerSnapshot.fullName": regex },
      { "officerSnapshot.militaryId": regex },
      { "officerSnapshot.rank": regex },
      { "officerSnapshot.seniorityNumber": regex },
      { notes: regex },
    ];
  }

  if (filters.status === "current") {
    query.isCurrent = true;
  } else if (filters.status === "former") {
    query.isCurrent = false;
  }

  if (filters.year) {
    const yearStart = new Date(Date.UTC(filters.year, 0, 1, 0, 0, 0, 0));
    const yearEnd = new Date(Date.UTC(filters.year, 11, 31, 23, 59, 59, 999));
    query.$and = [
      { startDate: { $lte: yearEnd } },
      {
        $or: [
          { isCurrent: true },
          { endDate: { $gte: yearStart } },
        ],
      },
    ];
  }

  const sortDir = filters.sortOrder === "asc" ? 1 : -1;

  const [docs, currentDoc, allDates] = await Promise.all([
    HistoricalCommander.find(query)
      .sort({ startDate: sortDir, createdAt: sortDir })
      .populate("createdBy", "fullName")
      .lean<CommanderLeanDoc[]>(),
    HistoricalCommander.findOne({ isCurrent: true })
      .populate("createdBy", "fullName")
      .lean<CommanderLeanDoc | null>(),
    HistoricalCommander.find(
      {},
      { startDate: 1, endDate: 1, isCurrent: 1 },
    ).lean<{ startDate: Date; endDate?: Date; isCurrent: boolean }[]>(),
  ]);

  const currentYear = new Date().getFullYear();
  const yearsSet = new Set<number>();
  for (const row of allDates) {
    const startIso = toIsoDateOnly(row.startDate);
    const endIso = row.isCurrent
      ? `${currentYear}-12-31`
      : toIsoDateOnly(row.endDate) ?? startIso;
    if (!startIso || !endIso) continue;
    const startY = Number(startIso.slice(0, 4));
    const endY = Number(endIso.slice(0, 4));
    for (let y = startY; y <= endY; y++) {
      yearsSet.add(y);
    }
  }

  return {
    items: docs.map(serializeHistoricalCommander),
    currentCommander: currentDoc ? serializeHistoricalCommander(currentDoc) : null,
    availableYears: Array.from(yearsSet).sort((a, b) => b - a),
  };
}

export async function getUnitHistoricalProfile(): Promise<UnitHistoricalProfileDTO | null> {
  const doc = await UnitHistoricalProfile.findOne({ singletonKey: "default" })
    .populate("updatedBy", "fullName")
    .lean<UnitProfileLeanDoc | null>();
  return doc ? serializeUnitProfile(doc) : null;
}

export async function queryUnitMilestones(filters: {
  search?: string;
  year?: number;
  category?: UnitMilestoneCategory;
  sortOrder?: TimelineSortOrder;
}): Promise<HistoricalMilestonesListResponse> {
  const query: Record<string, unknown> = {};
  const term = normalizeSearchTerm(filters.search);
  if (term) {
    const regex = new RegExp(escapeRegex(term), "i");
    query.$or = [{ title: regex }, { description: regex }];
  }
  if (filters.year) {
    query.milestoneDate = buildYearRange(filters.year);
  }
  if (filters.category) {
    query.category = filters.category;
  }

  const sortDir = filters.sortOrder === "asc" ? 1 : -1;

  const [docs, yearDates] = await Promise.all([
    UnitHistoricalMilestone.find(query)
      .sort({ milestoneDate: sortDir, createdAt: sortDir })
      .populate("createdBy", "fullName")
      .lean<MilestoneLeanDoc[]>(),
    UnitHistoricalMilestone.find({}, { milestoneDate: 1 }).lean<
      { milestoneDate: Date }[]
    >(),
  ]);

  const yearsSet = new Set<number>();
  for (const row of yearDates) {
    const iso = toIsoDateOnly(row.milestoneDate);
    if (iso) yearsSet.add(Number(iso.slice(0, 4)));
  }

  return {
    items: docs.map(serializeUnitMilestone),
    availableYears: Array.from(yearsSet).sort((a, b) => b - a),
  };
}

/**
 * Returns ALL officers across active and archived statuses (`isInUnit: true | false`)
 * strictly for historical commander selection in `/historical-record` (Constitution Principle VII exception).
 */
export async function queryHistoricalOfficerOptions(): Promise<
  HistoricalOfficerOptionDTO[]
> {
  const docs = await Officer.find(
    {},
    {
      militaryId: 1,
      seniorityNumber: 1,
      fullName: 1,
      rank: 1,
      isArkanHarb: 1,
      isInUnit: 1,
      employmentStatus: 1,
      photoUrl: 1,
    },
  )
    .sort({ isInUnit: -1, fullName: 1 })
    .lean<OfficerOptionLeanDoc[]>();

  return docs
    .sort((a, b) => {
      if (a.isInUnit !== b.isInUnit) return a.isInUnit ? -1 : 1;
      const wA = RANK_WEIGHTS[a.rank] ?? 99;
      const wB = RANK_WEIGHTS[b.rank] ?? 99;
      if (wA !== wB) return wA - wB;
      return a.fullName.localeCompare(b.fullName, "ar");
    })
    .map((officer) => ({
      id: String(officer._id),
      militaryId: officer.militaryId,
      seniorityNumber: officer.seniorityNumber,
      fullName: officer.fullName,
      rank: officer.rank,
      rankLabel: formatOfficerRank(officer.rank, officer.isArkanHarb),
      isInUnit: Boolean(officer.isInUnit),
      employmentStatus: officer.employmentStatus,
      photoUrl: officer.photoUrl || undefined,
    }));
}
