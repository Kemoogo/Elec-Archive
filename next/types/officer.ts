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
