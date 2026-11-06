export type StudentAttendanceStatus =
  // الموجود (داخل الوحدة)
  | "present"                // حاضر (طابور / تدريب)
  | "duty_service"           // خدمة داخلية / نوبتجية
  | "clinic"                 // عيادة الوحدة للكشف
  // خوارج رسمية وطبية واختبارات
  | "leave"                  // إجازة دورية / ميدانية
  | "sick_leave"             // إجازة مرضي مصدق بها
  | "rest"                   // راحة طبية
  | "hospital"               // حجز مستشفى عسكري
  | "police_academy_exam"    // اختبار كلية شرطة
  | "military_academy_exam"  // اختبار الأكاديمية العسكرية
  | "mission"                // مأمورية خارجية
  // خوارج انضباطية وقضائية
  | "absent"                 // غياب بدون إذن
  | "prison"                 // حبس انضباطي / سجن حربي
  | "court";                 // محكمة / نيابة عسكرية

export type RollcallStatus = "draft" | "approved" | "closed";
export type StudentRollcallStatus = RollcallStatus;

export interface IStudentRollcallEntry {
  studentId: string;
  militaryNo: string;
  fullName: string;
  status: StudentAttendanceStatus;
  notes?: string;
  destination?: string;
  expectedReturnDate?: string | Date;
  isOngoingDisciplinary?: boolean;
}

export interface IStudentRollcallSummary {
  totalStrength: number;
  presentCount: number;
  outOfficialCount: number;
  outDisciplinaryCount: number;
}
