export type StudentStatus =
  | "active"                  // نشط في التدريب
  | "graduated"               // متخرج / مسرح بالموعد
  | "inactive"                // غير نشط
  | "withdrawn"               // منسحب
  | "transferred_personnel";  // مشطوب ومضموم لقوة أفراد الوحدة

export type QualificationType =
  | "high"          // مؤهل عالٍ
  | "above_avg"      // مؤهل فوق متوسط
  | "average"        // مؤهل متوسط
  | "normal";        // عادة / بدون مؤهل

export const QUALIFICATION_LABELS: Record<QualificationType, string> = {
  high: "مؤهل عالٍ",
  above_avg: "مؤهل فوق متوسط",
  average: "مؤهل متوسط",
  normal: "عادة",
};

export function formatQualificationLabel(
  qualification?: string | null,
  fallback = "غير محدد"
): string {
  if (!qualification) return fallback;
  if (qualification in QUALIFICATION_LABELS) {
    return QUALIFICATION_LABELS[qualification as QualificationType];
  }
  return qualification;
}

export type StudentLocationStatus =
  | "in_unit"                         // لا زال بالوحدة
  | "relocated"                       // تم ترحيله لخارج الوحدة
  | "transferred_to_unit_personnel";  // انتقل لقوة الأفراد في الوحدة

export const LOCATION_STATUS_LABELS: Record<StudentLocationStatus, string> = {
  in_unit: "لا زال بالوحدة",
  relocated: "تم ترحيله",
  transferred_to_unit_personnel: "انتقل لقوة الأفراد",
};

export function formatLocationStatusLabel(
  status?: StudentLocationStatus | string | null,
  fallback = "لا زال بالوحدة"
): string {
  if (!status) return fallback;
  if (status in LOCATION_STATUS_LABELS) {
    return LOCATION_STATUS_LABELS[status as StudentLocationStatus];
  }
  return status;
}

export interface IRelocationDetails {
  destination: string;
  date: Date;
  orderNo: string;
  reason?: string;
  relocatedBy?: unknown; // Types.ObjectId in model
  relocatedAt?: Date;
}

export interface IUnitPersonnelDetails {
  transferDate: Date;
  orderNo: string;
  assignedRole?: string;
  transferredBy?: unknown; // Types.ObjectId in model
  transferredAt?: Date;
}

export type DistributionStatus =
  | "distributed_to_unit"  // تم التوزيع على الوحدة
  | "halt_transfer"        // إيقاف ترحيل
  | "without_distribution" // بدون توزيعة
  | "stage_remnants"       // متبقيات المرحلة
  | "unspecified";         // غير محدد

export interface IDisciplinaryRecord {
  type: "absence" | "detention";
  startDate: Date;
  endDate?: Date;
  totalDays?: number;
  source: "mdb_import" | "manual";
  notes?: string;
}

export interface IShatbHistory {
  shatbDate: Date;
  shatbOrderNo: string;
  shatbReason: string;
  strickenBy?: unknown; // Types.ObjectId in model
  strickenAt: Date;
  reversalReason?: string;
  reversedBy?: unknown; // Types.ObjectId in model
  reversedAt?: Date;
}
