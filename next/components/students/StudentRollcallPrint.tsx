"use client";

import React, { forwardRef } from "react";
import { formatDateDisplay } from "@/lib/utils/date-display";
import { formatMrhlaName } from "@/lib/students/format";
import type { IStudentRollcallEntry, StudentAttendanceStatus } from "@/lib/db/models/StudentRollcall.shared";

const STATUS_PRINT_LABELS: Record<StudentAttendanceStatus, string> = {
  present: "حاضر",
  duty_service: "خدمة داخلية",
  clinic: "عيادة",
  leave: "إجازة دورية",
  sick_leave: "إجازة مرضي",
  rest: "راحة طبية",
  hospital: "مستشفى عسكري",
  police_academy_exam: "اختبار كلية شرطة",
  military_academy_exam: "اختبار أكاديمية عسكرية",
  mission: "مأمورية",
  absent: "غياب",
  prison: "حبس",
  court: "محكمة عسكرية",
};

interface StudentRollcallPrintProps {
  date: string;
  mrhla: string;
  totalStrength: number;
  presentCount: number;
  outOfficialCount: number;
  outDisciplinaryCount: number;
  entries: IStudentRollcallEntry[];
  preparedByName?: string;
  approvedByName?: string;
}

export const StudentRollcallPrint = forwardRef<HTMLDivElement, StudentRollcallPrintProps>(
  (
    {
      date,
      mrhla,
      totalStrength,
      presentCount,
      outOfficialCount,
      outDisciplinaryCount,
      entries,
      preparedByName,
      approvedByName,
    },
    ref
  ) => {
    const totalOut = outOfficialCount + outDisciplinaryCount;
    const attendancePct = totalStrength > 0 ? ((presentCount / totalStrength) * 100).toFixed(1) : "0";

    return (
      <div
        ref={ref}
        dir="rtl"
        className="w-[210mm] min-h-[297mm] p-8 mx-auto bg-white text-black font-sans print:p-6 print:m-0"
        style={{ color: "#000" }}
      >
        {/* Military Document Header */}
        <div className="flex justify-between items-start border-b-2 border-black pb-4 mb-6">
          <div className="text-right space-y-0.5 text-xs font-bold">
            <p>جمهورية مصر العربية</p>
            <p>القوات المسلحة</p>
            <p>جناح تدريب وتأهيل الطلبة</p>
            <p>فرع شئون الطلاب</p>
          </div>
          <div className="text-center space-y-1">
            <h1 className="text-base font-black underline tracking-wide">
              كشف التمام اليومي للطلبة
            </h1>
            <p className="text-xs font-bold">
              {formatMrhlaName(mrhla)}
            </p>
            <p className="text-xs font-bold font-mono">
              تاريخ التمام: {formatDateDisplay(date)}
            </p>
          </div>
          <div className="text-left space-y-0.5 text-[10px] font-bold text-gray-700">
            <p>سري وعاجل</p>
            <p>نموذج رقم (14/طلبة)</p>
          </div>
        </div>

        {/* Strength & Attendance Summary Box */}
        <div className="border border-black rounded-lg mb-6 overflow-hidden">
          <div className="bg-gray-100 border-b border-black py-1.5 px-3 text-center text-xs font-black">
            موقف القوة والحضور الفعلي
          </div>
          <div className="grid grid-cols-6 divide-x divide-x-reverse divide-black text-center text-xs">
            <div className="p-2">
              <span className="block font-bold text-[10px] text-gray-700">القوة الإجمالية</span>
              <span className="font-mono font-black text-sm">{totalStrength}</span>
            </div>
            <div className="p-2 bg-gray-50">
              <span className="block font-bold text-[10px] text-gray-700">الموجود الفعلي</span>
              <span className="font-mono font-black text-sm">{presentCount}</span>
            </div>
            <div className="p-2">
              <span className="block font-bold text-[10px] text-gray-700">إجمالي الخوارج</span>
              <span className="font-mono font-black text-sm">{totalOut}</span>
            </div>
            <div className="p-2">
              <span className="block font-bold text-[10px] text-gray-700">خوارج رسمية وطبية</span>
              <span className="font-mono font-black text-sm">{outOfficialCount}</span>
            </div>
            <div className="p-2">
              <span className="block font-bold text-[10px] text-gray-700">خوارج انضباطية</span>
              <span className="font-mono font-black text-sm">{outDisciplinaryCount}</span>
            </div>
            <div className="p-2 bg-gray-50">
              <span className="block font-bold text-[10px] text-gray-700">نسبة الحضور</span>
              <span className="font-mono font-black text-sm">%{attendancePct}</span>
            </div>
          </div>
        </div>

        {/* Students Table */}
        <div className="mb-8">
          <table className="w-full border-collapse border border-black text-xs">
            <thead>
              <tr className="bg-gray-100 border-b border-black">
                <th className="border border-black px-2 py-1.5 w-10 text-center font-black">م</th>
                <th className="border border-black px-2 py-1.5 w-28 text-center font-black">الرقم العسكري</th>
                <th className="border border-black px-3 py-1.5 text-right font-black">الاسم رباعياً</th>
                <th className="border border-black px-2 py-1.5 w-28 text-center font-black">حالة التمام</th>
                <th className="border border-black px-2 py-1.5 text-right font-black">الملاحظات / الوجهة</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((entry, index) => {
                const isOut = entry.status !== "present";
                return (
                  <tr
                    key={entry.studentId}
                    className={`border-b border-black ${isOut ? "bg-gray-50 font-bold" : ""}`}
                  >
                    <td className="border border-black px-2 py-1 text-center font-mono">{index + 1}</td>
                    <td className="border border-black px-2 py-1 text-center font-mono">{entry.militaryNo}</td>
                    <td className="border border-black px-3 py-1 text-right font-bold">{entry.fullName}</td>
                    <td className="border border-black px-2 py-1 text-center">
                      <span className={isOut ? "underline" : ""}>
                        {STATUS_PRINT_LABELS[entry.status] || entry.status}
                      </span>
                    </td>
                    <td className="border border-black px-2 py-1 text-right text-[11px]">
                      {entry.destination ? `الجهة: ${entry.destination}` : ""}
                      {entry.destination && entry.notes ? " - " : ""}
                      {entry.notes || ""}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Military Signatures */}
        <div className="grid grid-cols-2 gap-8 pt-8 mt-auto border-t border-black text-center text-xs">
          <div className="space-y-12">
            <div>
              <p className="font-black">ضابط شئون الطلاب (معد التمام)</p>
              <p className="text-[11px] text-gray-700 font-bold">الرتبة / الاسم: {preparedByName || "..........................."}</p>
            </div>
            <p className="font-bold">التوقيع: ...........................</p>
          </div>

          <div className="space-y-12">
            <div>
              <p className="font-black">قائد جناح التدريب (المصدق)</p>
              <p className="text-[11px] text-gray-700 font-bold">الرتبة / الاسم: {approvedByName || "..........................."}</p>
            </div>
            <p className="font-bold">التوقيع: ...........................</p>
          </div>
        </div>
      </div>
    );
  }
);

StudentRollcallPrint.displayName = "StudentRollcallPrint";
