import type { UnitMilestoneCategory } from "@/lib/db/models/UnitHistoricalInfo.shared";

export type { UnitMilestoneCategory };
export {
  UNIT_MILESTONE_CATEGORIES,
  UNIT_MILESTONE_CATEGORY_LABELS,
  formatMilestoneCategoryLabel,
} from "@/lib/db/models/UnitHistoricalInfo.shared";

export type HistoricalRecordTab = "visits" | "commanders" | "unit-info";

export type TimelineSortOrder = "desc" | "asc";

export type CommanderStatusFilter = "all" | "current" | "former";

export interface OfficerSnapshotDTO {
  militaryId: string;
  fullName: string;
  rank: string;
  rankLabel?: string;
  seniorityNumber?: string;
}

export interface HistoricalVisitDTO {
  id: string;
  title: string;
  visitorName: string;
  visitDate: string;
  description?: string;
  photos: string[];
  createdBy: string;
  createdByName?: string;
  createdAt: string;
  updatedAt: string;
}

export interface HistoricalCommanderDTO {
  id: string;
  officerId?: string;
  officerSnapshot: OfficerSnapshotDTO;
  photoUrl?: string;
  startDate: string;
  endDate?: string;
  isCurrent: boolean;
  durationLabel: string;
  notes?: string;
  createdBy: string;
  createdByName?: string;
  createdAt: string;
  updatedAt: string;
}

export interface UnitHistoricalProfileDTO {
  id: string;
  unitName: string;
  foundingDate?: string;
  affiliation?: string;
  location?: string;
  motto?: string;
  mission?: string;
  emblemUrl?: string;
  updatedBy?: string;
  updatedByName?: string;
  updatedAt: string;
}

export interface UnitHistoricalMilestoneDTO {
  id: string;
  milestoneDate: string;
  title: string;
  category: UnitMilestoneCategory;
  categoryLabel: string;
  description?: string;
  photos: string[];
  createdBy: string;
  createdByName?: string;
  createdAt: string;
  updatedAt: string;
}

export interface HistoricalOfficerOptionDTO {
  id: string;
  militaryId: string;
  seniorityNumber: string;
  fullName: string;
  rank: string;
  rankLabel: string;
  isInUnit: boolean;
  employmentStatus: string;
  photoUrl?: string;
}

export interface HistoricalVisitsListResponse {
  items: HistoricalVisitDTO[];
  availableYears: number[];
}

export interface HistoricalCommandersListResponse {
  items: HistoricalCommanderDTO[];
  currentCommander: HistoricalCommanderDTO | null;
  availableYears: number[];
}

export interface HistoricalMilestonesListResponse {
  items: UnitHistoricalMilestoneDTO[];
  availableYears: number[];
}

export interface HistoricalRecordCapabilities {
  canView: boolean;
  canAdd: boolean;
  isAdmin: boolean;
}

export interface HistoricalGovernancePayload {
  reason: string;
  confirmed: boolean;
}

export const HISTORICAL_IMAGE_MAX_BYTES = 10 * 1024 * 1024;
export const HISTORICAL_MAX_PHOTOS_PER_ITEM = 10;
