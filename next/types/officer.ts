import type { OfficerRank, EmploymentStatus, OfficerType, OfficerWeapon } from "@/lib/db/models/Officer.shared";

export type { OfficerRank, EmploymentStatus, OfficerType, OfficerWeapon };
export { formatOfficerRank, formatOfficerLabel } from "@/lib/db/models/Officer.shared";
export {
  OFFICER_LEAVE_SYSTEMS,
  OFFICER_LEAVE_SYSTEM_LABELS,
  LEAVE_REQUEST_TYPES,
  type OfficerLeaveSystem,
  type LeaveRequestType,
} from "@/lib/db/models/Leave.shared";

/**
 * Standard Officer Option for Selects / Dropdowns / Modals across all modules
 */
export interface OfficerOption {
  id: string;
  _id?: string;
  fullName: string;
  militaryId?: string;
  seniorityNumber?: string;
  rank?: string;
  rankLabel?: string;
  isArkanHarb?: boolean;
  officerLabel?: string;
  defaultLeaveSystem?: string;
  isInUnit?: boolean;
  name?: string;
  operationalStatus?: "إجازة" | "فرقة" | "مأمورية خارجية" | "عودة إجازة";
  operationalStatusDetails?: string;
  value?: string;
  label?: string;
}

/**
 * Common Aliases for Centralized Officer Option
 */
export type OfficerInfo = OfficerOption;
export type OfficerData = OfficerOption;
export interface OfficerOptionItem extends OfficerOption {
  value?: string;
  label?: string;
  primaryPosition?: string;
  currentStatusLabel?: string;
  isExternalMissionOrCourse?: boolean;
}

/**
 * Officer System Info for leave system assignment modals
 */
export interface OfficerSystemInfo {
  officerId: string;
  officerName: string;
  officerLabel?: string;
  officerRank?: string;
  militaryId?: string;
  seniorityNumber?: string;
  currentSystem?: string;
}

/**
 * Standard Officer Leave Record representation
 */
export interface LeaveRecord {
  id: string;
  type: string;
  category: string;
  startDate: string;
  endDate: string;
  actualReturnDate?: string;
  lastReturnDate?: string;
  presenceDurationDays?: number;
  createdAt?: string;
  status: string;
  reason?: string;
  medicalReportUrl?: string;
  actingOfficerName?: string;
}

/**
 * Basic Officer Information representation
 */
export interface OfficerBasicInfo {
  id: string;
  militaryId: string;
  seniorityNumber: string;
  fullName: string;
  rank: OfficerRank | string;
  rankLabel: string;
  isArkanHarb: boolean;
  officerLabel: string;
  defaultLeaveSystem?: string;
  isInUnit?: boolean;
}

/**
 * Detailed Officer List Item (for Registry Table)
 */
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
  employmentStatus: EmploymentStatus | string;
  employmentStatusLabel: string;
  isInUnit: boolean;
  file121Url: string;
  photoUrl: string;
  isArkanHarb: boolean;
  officerLabel: string;
  _isComplete?: boolean;
  _missingFields?: string[];
}
