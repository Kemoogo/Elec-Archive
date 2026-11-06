import type {
  StudentStatus,
  QualificationType,
  DistributionStatus,
  StudentLocationStatus,
} from "@/lib/db/models/Student.shared";
import type { IBatchClassification } from "@/lib/db/models/StudentBatch.shared";

export {
  QUALIFICATION_LABELS,
  formatQualificationLabel,
  LOCATION_STATUS_LABELS,
  formatLocationStatusLabel,
} from "@/lib/db/models/Student.shared";

export {
  DEFAULT_BATCH_CLASSIFICATIONS,
  formatBatchName,
} from "@/lib/db/models/StudentBatch.shared";

export type {
  StudentStatus,
  QualificationType,
  DistributionStatus,
  StudentLocationStatus,
  IRelocationDetails,
  IUnitPersonnelDetails,
  IDisciplinaryRecord,
  IShatbHistory,
  IStudent,
  IStudentDocument,
} from "@/lib/db/models/Student";

export type {
  IBatchClassification,
  IStudentBatch,
} from "@/lib/db/models/StudentBatch";

export type {
  StudentAttendanceStatus,
  StudentRollcallStatus,
  IStudentRollcallEntry,
  IStudentRollcallSummary,
  IStudentRollcall,
} from "@/lib/db/models/StudentRollcall";

export interface IStudentPreviewRow {
  militaryNo: string;
  fullName: string;
  mrhla: string;
  classificationName?: string;
  qualification?: string;
  qualificationName?: string;
  governorate?: string;
  governorateCode?: number;
  recruitmentArea?: string;
  bloodType?: string;
  bloodTypeCode?: number;
  isNew: boolean;
}

export interface IMdbPreviewData {
  fileId: string;
  fileName: string;
  totalRecords: number;
  stages: Array<{
    mrhla: string;
    name: string;
    count: number;
  }>;
  newCount: number;
  updateCount: number;
  excludedCount: number;
  warningsCount: number;
  disciplinaryCount: number;
  previewRows: IStudentPreviewRow[];
}

export interface IStudentListItem {
  _id: string;
  studentId: string;
  militaryNo: string;
  fullName: string;
  mrhla: string;
  mrhlaName?: string;
  nationalNo?: string;
  solasyNo?: string;
  birthDate?: string;
  tagneedDate?: string;
  tasrehDate?: string;
  qualification?: QualificationType;
  qualificationName?: string;
  classificationId?: string;
  classificationName?: string;
  locationStatus: StudentLocationStatus;
  relocationDetails?: {
    destination: string;
    date: string;
    orderNo: string;
    reason?: string;
    relocatedAt?: string;
  };
  unitPersonnelDetails?: {
    transferDate: string;
    orderNo: string;
    assignedRole?: string;
    transferredAt?: string;
  };
  governorate?: string;
  governorateCode?: number;
  recruitmentArea?: string;
  address?: string;
  bloodType?: string;
  bloodTypeCode?: number;
  enrollDate?: string;
  status: StudentStatus;
  distributionStatus: DistributionStatus;
  distributionSetAt?: string;
  isStriken: boolean;
  shatbDate?: string;
  shatbOrderNo?: string;
  shatbReason?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface IStageInfo {
  mrhla: string;
  name: string;
  count: number;
  activeCount?: number;
  targetCount?: number;
  arrivedCount?: number;
  remainingCount?: number;
  inUnitCount?: number;
  relocatedCount?: number;
  transferredPersonnelCount?: number;
  classifications?: IBatchClassification[];
}

export interface IStudentsAnalyticsData {
  mrhla: string;
  mrhlaName: string;
  totalStrength: number;
  targetCount: number;
  arrivedCount: number;
  remainingCount: number;
  inUnitCount: number;
  relocatedCount: number;
  transferredPersonnelCount: number;
  presentCount: number;
  outOfficialCount: number;
  outDisciplinaryCount: number;
  attendanceRate: number;
  strikenCount: number;
  classificationsMatrix: Array<{
    id: string;
    name: string;
    total: number;
    high: number;
    aboveAvg: number;
    average: number;
    normal: number;
  }>;
  qualifications: Array<{
    type: string;
    label: string;
    count: number;
    percentage: number;
  }>;
  governorates: Array<{
    name: string;
    count: number;
    percentage: number;
  }>;
  bloodTypes: Array<{
    type: string;
    count: number;
    percentage: number;
  }>;
}
