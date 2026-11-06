"use client";

import React, { useRef } from "react";
import { format } from "date-fns";
import { ar } from "date-fns/locale";
import { Printer } from "lucide-react";
import {
  type IRollcallEntry,
  type ICustomRollcallTable,
  type RollcallStatus,
  ROLLCALL_STATUS_LABELS,
  isRollcallPresent,
  computeRollcallBreakdown,
  computeDetailedOutColumns,
} from "@/lib/db/models/DailyRollcall.shared";
import { getDayName, formatDateDisplay, parseSafeLocalDate } from "@/lib/utils/date-display";

export interface RollcallPrintReportEntry {
  officerId: string;
  militaryId?: string;
  fullName?: string;
  rank?: string;
  rankLabel?: string;
  primaryPositionTitle?: string;
  status: RollcallStatus;
  note?: string;
  customReason?: string;
  hospitalName?: string;
  hospitalAdmissionDate?: string;
  disciplinaryType?: "prison" | "unit_arrest" | "court";
  disciplinaryAuthority?: string;
  travelDestination?: string;
  travelPurpose?: string;
  statusStartDate?: string;
  statusEndDate?: string;
  leaveTypeLabel?: string;
  leaveStartDate?: string;
  leaveEndDate?: string;
  missionTitle?: string;
  missionDestination?: string;
  missionStartDate?: string;
  missionEndDate?: string;
  isReturningToday?: boolean;
  lastReturnDateOnly?: string;
  lastReturnDayName?: string;
}

interface RollcallPrintReportProps {
  date: string; // YYYY-MM-DD
  dateDisplay?: string;
  entries: RollcallPrintReportEntry[];
  targetOfficerCount?: number;
  customTables?: ICustomRollcallTable[];
  isSubmitted?: boolean;
  unitName?: string;
}

function formatDateString(val?: string | Date | null): string {
  if (!val) return "ـ";
  return formatDateDisplay(val) || "ـ";
}

export function RollcallPrintReport({
  date,
  dateDisplay,
  entries,
  customTables = [],
  isSubmitted = false,
  unitName,
}: RollcallPrintReportProps) {
  const printRef = useRef<HTMLDivElement>(null);

  // Cast entries to IRollcallEntry for standard breakdown computation
  const breakdown = computeRollcallBreakdown(entries as IRollcallEntry[]);
  const dynamicOutColumns = computeDetailedOutColumns(entries, customTables);
  const outColSpan = Math.max(1, dynamicOutColumns.length);
  const parsedDate = parseSafeLocalDate(date) || new Date();
  const dayName = getDayName(parsedDate, false) || (!isNaN(parsedDate.getTime()) ? format(parsedDate, "EEEE", { locale: ar }) : "");
  const formattedDateNum = formatDateDisplay(parsedDate) || dateDisplay || date;

  const handlePrint = () => {
    const originalTitle = document.title;
    document.title = "";
    window.print();
    setTimeout(() => {
      document.title = originalTitle;
    }, 1000);
  };

  // Build officer assignment lookup in custom tables
  const customTableOfficerMap = new Map<string, ICustomRollcallTable>();
  customTables.forEach((tbl) => {
    (tbl.officerIds || []).forEach((id) => {
      customTableOfficerMap.set(String(id), tbl);
    });
  });

  // Categorize officers matching operational on-screen view
  const presentOfficers = entries.filter((e) => {
    if (customTableOfficerMap.has(String(e.officerId))) return false;
    return isRollcallPresent(e.status);
  });

  const leaveOfficers = entries.filter((e) => {
    if (customTableOfficerMap.has(String(e.officerId))) return false;
    return e.status === "leave" || e.status === "rest";
  });

  const outOfficers = entries.filter((e) => {
    if (customTableOfficerMap.has(String(e.officerId))) return false;
    return !isRollcallPresent(e.status) && e.status !== "leave" && e.status !== "rest";
  });

  return (
    <div>
      <button
        type="button"
        onClick={handlePrint}
        className="print:hidden px-4 py-2 bg-(--color-primary) text-white font-bold text-xs rounded-xl shadow-md hover:bg-(--color-primary-hover) transition-all flex items-center gap-2 cursor-pointer"
      >
        <Printer className="w-4 h-4" />
        طباعة كشف التمام الرسمي (A4)
      </button>

      {/* Hidden container for print, visible when printing */}
      <div className="hidden print:block font-sans text-black bg-white printable-rollcall-sheet" dir="rtl">
        {/* Double Border Egyptian Military Stationery Frame */}
        <div className="military-print-double-border single-page-rollcall">
          <div ref={printRef} className="military-print-inner-frame flex flex-col justify-between h-full space-y-2">
            
            {/* Top Military Header with Unit Name and Centered Title */}
            <div className="flex items-center justify-between border-b-2 border-black pb-1.5 px-1">
              <div className="text-right text-[11px] font-black text-black leading-tight min-w-[140px]">
                {unitName || "قيادة الوحدة العسكرية"}
              </div>

              <div className="text-center my-auto flex-1">
                <h1 className="text-xs sm:text-sm font-black text-black">
                  تمام تواجد السادة الضباط عن يوم {dayName} الموافق {formattedDateNum} .
                </h1>
              </div>

              <div className="min-w-[140px]" />
            </div>

            {/* Section 1: الموجود بالوحدة */}
            <div className="avoid-break space-y-0.5">
              <div className="flex items-center justify-between bg-slate-100 py-0.5 px-2 border border-black">
                <h2 className="text-[9px] font-black text-black">
                  أولاً: كشف الضباط المتواجدين بالوحدة (الموجود) — العدد ({presentOfficers.length}) ضابط
                </h2>
              </div>
              <table className="w-full text-[8px] text-right border-collapse border border-black">
                <thead>
                  <tr className="bg-slate-200 text-black font-black text-center">
                    <th className="py-0.5 px-1 border border-black w-6">م</th>
                    <th className="py-0.5 px-1 border border-black w-20">الرتبة</th>
                    <th className="py-0.5 px-1 border border-black text-right">الاسم والبيانات العسكرية</th>
                    <th className="py-0.5 px-1 border border-black w-20">الرقم العسكري</th>
                    <th className="py-0.5 px-1 border border-black w-28">الوظيفة المكلف بها</th>
                    <th className="py-0.5 px-1 border border-black w-28">ملاحظات التمام</th>
                  </tr>
                </thead>
                <tbody>
                  {presentOfficers.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-1 text-center text-slate-600 font-bold border border-black">
                        لا يوجد ضباط مسجلين في كشف الموجود
                      </td>
                    </tr>
                  ) : (
                    presentOfficers.map((o, idx) => (
                      <tr key={o.officerId || idx} className="border border-black">
                        <td className="py-0.5 px-1 text-center font-bold border border-black">{idx + 1}</td>
                        <td className="py-0.5 px-1 text-center font-bold border border-black">{o.rankLabel || o.rank}</td>
                        <td className="py-0.5 px-1 font-bold border border-black">{o.fullName}</td>
                        <td className="py-0.5 px-1 text-center font-mono font-bold border border-black">{o.militaryId || "ـ"}</td>
                        <td className="py-0.5 px-1 border border-black">{o.primaryPositionTitle || "ـ"}</td>
                        <td className="py-0.5 px-1 border border-black">{o.note || (o.isReturningToday ? "عودة من إجازة" : "ـ")}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Section 2: الإجازات والراحات */}
            <div className="avoid-break space-y-0.5">
              <div className="flex items-center justify-between bg-slate-100 py-0.5 px-2 border border-black">
                <h2 className="text-[9px] font-black text-black">
                  ثانياً: كشف الإجازات والراحات — العدد ({leaveOfficers.length}) ضابط
                </h2>
              </div>
              <table className="w-full text-[8px] text-right border-collapse border border-black">
                <thead>
                  <tr className="bg-slate-200 text-black font-black text-center">
                    <th className="py-0.5 px-1 border border-black w-6">م</th>
                    <th className="py-0.5 px-1 border border-black w-20">الرتبة</th>
                    <th className="py-0.5 px-1 border border-black text-right">الاسم والبيانات العسكرية</th>
                    <th className="py-0.5 px-1 border border-black w-24">نوع الإجازة</th>
                    <th className="py-0.5 px-1 border border-black w-32">الفترة (من - إلى)</th>
                    <th className="py-0.5 px-1 border border-black w-28">الملاحظات</th>
                  </tr>
                </thead>
                <tbody>
                  {leaveOfficers.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-1 text-center text-slate-600 font-bold border border-black">
                        لا توجد إجازات أو راحات مسجلة اليوم
                      </td>
                    </tr>
                  ) : (
                    leaveOfficers.map((o, idx) => (
                      <tr key={o.officerId || idx} className="border border-black">
                        <td className="py-0.5 px-1 text-center font-bold border border-black">{idx + 1}</td>
                        <td className="py-0.5 px-1 text-center font-bold border border-black">{o.rankLabel || o.rank}</td>
                        <td className="py-0.5 px-1 font-bold border border-black">{o.fullName}</td>
                        <td className="py-0.5 px-1 text-center font-bold border border-black">{o.leaveTypeLabel || ROLLCALL_STATUS_LABELS[o.status] || o.status}</td>
                        <td className="py-0.5 px-1 text-center font-mono border border-black">
                          {o.leaveStartDate ? `${formatDateString(o.leaveStartDate)} إلى ${formatDateString(o.leaveEndDate)}` : "ـ"}
                        </td>
                        <td className="py-0.5 px-1 border border-black">{o.note || "ـ"}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Section 3: الخوارج */}
            <div className="avoid-break space-y-0.5">
              <div className="flex items-center justify-between bg-slate-100 py-0.5 px-2 border border-black">
                <h2 className="text-[9px] font-black text-black">
                  ثالثاً: كشف الخوارج (مأموريات، فرق، مستشفيات، عيادات، غياب) — العدد ({outOfficers.length}) ضابط
                </h2>
              </div>
              <table className="w-full text-[8px] text-right border-collapse border border-black">
                <thead>
                  <tr className="bg-slate-200 text-black font-black text-center">
                    <th className="py-0.5 px-1 border border-black w-6">م</th>
                    <th className="py-0.5 px-1 border border-black w-20">الرتبة</th>
                    <th className="py-0.5 px-1 border border-black text-right">الاسم والبيانات العسكرية</th>
                    <th className="py-0.5 px-1 border border-black w-24">بيان الخارج</th>
                    <th className="py-0.5 px-1 border border-black w-32">الجهة / التفاصيل</th>
                    <th className="py-0.5 px-1 border border-black w-28">الملاحظات</th>
                  </tr>
                </thead>
                <tbody>
                  {outOfficers.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-1 text-center text-slate-600 font-bold border border-black">
                        لا يوجد خوارج مسجلين اليوم
                      </td>
                    </tr>
                  ) : (
                    outOfficers.map((o, idx) => (
                      <tr key={o.officerId || idx} className="border border-black">
                        <td className="py-0.5 px-1 text-center font-bold border border-black">{idx + 1}</td>
                        <td className="py-0.5 px-1 text-center font-bold border border-black">{o.rankLabel || o.rank}</td>
                        <td className="py-0.5 px-1 font-bold border border-black">{o.fullName}</td>
                        <td className="py-0.5 px-1 text-center font-bold border border-black">{ROLLCALL_STATUS_LABELS[o.status] || o.status}</td>
                        <td className="py-0.5 px-1 border border-black">
                          {o.hospitalName
                            ? `مستشفى: ${o.hospitalName}`
                            : o.disciplinaryAuthority
                              ? `الجهة: ${o.disciplinaryAuthority}`
                              : o.travelDestination
                                ? `جهة السفر: ${o.travelDestination}${o.travelPurpose ? ` (${o.travelPurpose})` : ""}`
                                : o.missionDestination || o.missionTitle || o.customReason || "ـ"}
                        </td>
                        <td className="py-0.5 px-1 border border-black">{o.note || "ـ"}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Section 4: الجداول المخصصة (إن وجدت) */}
            {customTables.length > 0 && (
              <div className="space-y-1">
                {customTables.map((tbl, tblIdx) => {
                  const assigned = entries.filter((e) => (tbl.officerIds || []).map(String).includes(String(e.officerId)));
                  const isOfficerOnLeave = (o: RollcallPrintReportEntry) => {
                    if (o.isReturningToday) return false;
                    return o.status === "leave" || o.status === "rest" || Boolean(o.leaveStartDate || o.leaveTypeLabel);
                  };
                  const isAllLeave = assigned.length > 0 && assigned.every(isOfficerOnLeave);
                  const isAllPresent = assigned.length === 0 || assigned.every((o) => !isOfficerOnLeave(o));
                  const hasTasks = Boolean(tbl.officerTasks && Object.values(tbl.officerTasks).some(Boolean));

                  return (
                    <div key={tbl.id || tblIdx} className="avoid-break space-y-0.5">
                      <div className="flex items-center justify-between bg-slate-100 py-0.5 px-2 border border-black">
                        <h2 className="text-[9px] font-black text-black">
                          رابعاً ({tblIdx + 1}): {tbl.name} — ({tbl.isInsideUnit ? "داخل الوحدة / موجود" : "خارج الوحدة / خارج"}) — العدد ({assigned.length}) ضابط
                        </h2>
                        {tbl.notes && <span className="text-[8px] text-slate-700 font-bold">{tbl.notes}</span>}
                      </div>
                      <table className="w-full text-[8px] text-right border-collapse border border-black">
                        <thead>
                          <tr className="bg-slate-200 text-black font-black text-center">
                            <th className="py-0.5 px-1 border border-black w-6">م</th>
                            <th className="py-0.5 px-1 border border-black w-16">الرتبة</th>
                            <th className="py-0.5 px-1 border border-black text-right">الاسم والبيانات العسكرية</th>

                            {isAllPresent ? (
                              <>
                                <th className="py-0.5 px-1 border border-black w-14">التواجد</th>
                                <th className="py-0.5 px-1 border border-black w-20">آخر عودة</th>
                              </>
                            ) : isAllLeave ? (
                              <>
                                <th className="py-0.5 px-1 border border-black w-20">نوع الإجازة</th>
                                <th className="py-0.5 px-1 border border-black w-24">الفترة (من - إلى)</th>
                              </>
                            ) : (
                              <>
                                <th className="py-0.5 px-1 border border-black w-20">التواجد</th>
                                <th className="py-0.5 px-1 border border-black w-24">الفترة (من - إلى)</th>
                                <th className="py-0.5 px-1 border border-black w-20">آخر عودة</th>
                              </>
                            )}

                            {hasTasks && <th className="py-0.5 px-1 border border-black w-24">المهمة المكلف بها</th>}
                            <th className="py-0.5 px-1 border border-black w-24">الوظيفة المكلف بها</th>
                            <th className="py-0.5 px-1 border border-black w-24">الملاحظات</th>
                          </tr>
                        </thead>
                        <tbody>
                          {assigned.length === 0 ? (
                            <tr>
                              <td colSpan={isAllPresent || isAllLeave ? (hasTasks ? 7 : 6) : (hasTasks ? 8 : 7)} className="py-1 text-center text-slate-600 font-bold border border-black">
                                لا يوجد ضباط مسكنين في هذا الجدول
                              </td>
                            </tr>
                          ) : (
                            assigned.map((o, idx) => {
                              const onLeave = isOfficerOnLeave(o);
                              const isMission = Boolean(
                                o.status === "daily_mission" ||
                                o.status === "external_mission" ||
                                o.status === "mission" ||
                                o.missionTitle
                              );

                              return (
                                <tr key={o.officerId || idx} className="border border-black">
                                  <td className="py-0.5 px-1 text-center font-bold border border-black">{idx + 1}</td>
                                  <td className="py-0.5 px-1 text-center font-bold border border-black">{o.rankLabel || o.rank}</td>
                                  <td className="py-0.5 px-1 font-bold border border-black">{o.fullName}</td>

                                  {isAllPresent ? (
                                    <>
                                      <td className="py-0.5 px-1 text-center font-bold border border-black">
                                        {isMission ? "✔ مأمورية" : "✔ موجود"}
                                      </td>
                                      <td className="py-0.5 px-1 text-center font-mono border border-black">
                                        {o.lastReturnDateOnly && o.lastReturnDateOnly !== "ـ" ? `${o.lastReturnDayName || ""} ${o.lastReturnDateOnly}` : "ـ"}
                                      </td>
                                    </>
                                  ) : isAllLeave ? (
                                    <>
                                      <td className="py-0.5 px-1 text-center font-bold border border-black">
                                        {o.leaveTypeLabel || (o.status === "rest" ? "راحة أسبوعية" : "إجازة اعتيادية")}
                                      </td>
                                      <td className="py-0.5 px-1 text-center font-mono border border-black">
                                        {o.leaveStartDate ? `${formatDateString(o.leaveStartDate)} إلى ${formatDateString(o.leaveEndDate)}` : "ـ"}
                                      </td>
                                    </>
                                  ) : (
                                    <>
                                      <td className="py-0.5 px-1 text-center font-bold border border-black">
                                        {onLeave
                                          ? (o.leaveTypeLabel ? (o.leaveTypeLabel.includes("إجازة") || o.leaveTypeLabel.includes("راحة") ? o.leaveTypeLabel : `إجازة ${o.leaveTypeLabel}`) : (o.status === "rest" ? "راحة" : "إجازة"))
                                          : (isMission ? "✔ مأمورية" : "✔ موجود")}
                                      </td>
                                      <td className="py-0.5 px-1 text-center font-mono border border-black">
                                        {onLeave && o.leaveStartDate ? `${formatDateString(o.leaveStartDate)} إلى ${formatDateString(o.leaveEndDate)}` : "ـ"}
                                      </td>
                                      <td className="py-0.5 px-1 text-center font-mono border border-black">
                                        {!onLeave && o.lastReturnDateOnly && o.lastReturnDateOnly !== "ـ" ? `${o.lastReturnDayName || ""} ${o.lastReturnDateOnly}` : "ـ"}
                                      </td>
                                    </>
                                  )}

                                  {hasTasks && (
                                    <td className="py-0.5 px-1 border border-black text-center">{tbl.officerTasks?.[o.officerId] || "ـ"}</td>
                                  )}
                                  <td className="py-0.5 px-1 border border-black text-center">{o.primaryPositionTitle || "ـ"}</td>
                                  <td className="py-0.5 px-1 border border-black">{o.note || "ـ"}</td>
                                </tr>
                              );
                            })
                          )}
                        </tbody>
                      </table>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Section 5: بيان تمام الضباط في النهاية (جدول التفكيك المعتمد لتمام القوة) */}
            <div className="avoid-break pt-1.5 border-t-2 border-black space-y-1">
              <div className="flex items-center justify-between">
                <h3 className="text-[9.5px] font-black text-black">
                  بيان تمام الضباط في النهاية (جدول التفكيك المعتمد لتمام القوة العسكرية)
                </h3>
              </div>
              <table className="w-full text-[8px] text-center border-collapse border border-black">
                <thead>
                  <tr className="bg-slate-200 text-black font-black border-b-2 border-black">
                    <th className="py-0.5 px-1 border-2 border-black bg-slate-300 w-16" rowSpan={2}>إجمالي القوة</th>
                    <th className="py-1 px-1 border-2 border-black bg-slate-300 font-black text-[8.5px]" colSpan={5}>
                      الموجود ({breakdown.present.total}) ضابط
                    </th>
                    <th className="py-1 px-1 border-2 border-black bg-slate-300 font-black text-[8.5px]" colSpan={outColSpan + 1}>
                      الخارج ({breakdown.out.total}) ضابط
                    </th>
                  </tr>
                  <tr className="bg-slate-100 text-black font-bold border-b border-black text-[7.5px]">
                    {/* Present columns */}
                    <th className="py-0.5 px-0.5 border border-black font-black bg-slate-200">الموجود</th>
                    <th className="py-0.5 px-0.5 border border-black">بالوحدة</th>
                    <th className="py-0.5 px-0.5 border border-black">مأمورية يومية</th>
                    <th className="py-0.5 px-0.5 border border-black">عيادة</th>
                    <th className="py-0.5 px-0.5 border border-black">تمام مستقل</th>
                    {/* Out columns */}
                    <th className="py-0.5 px-0.5 border border-black font-black bg-slate-200">الخارج</th>
                    {dynamicOutColumns.length === 0 ? (
                      <th className="py-0.5 px-0.5 border border-black">ـ</th>
                    ) : (
                      dynamicOutColumns.map((col) => (
                        <th key={col.id} className="py-0.5 px-0.5 border border-black">{col.label}</th>
                      ))
                    )}
                  </tr>
                </thead>
                <tbody>
                  <tr className="font-black text-black text-[8px]">
                    <td className="py-0.5 px-1 border-2 border-black bg-slate-100">{breakdown.totalOfficers}</td>
                    {/* Present numbers */}
                    <td className="py-0.5 px-0.5 border border-black bg-slate-100 font-black">{breakdown.present.total}</td>
                    <td className="py-0.5 px-0.5 border border-black">{breakdown.present.insideUnit}</td>
                    <td className="py-0.5 px-0.5 border border-black">{breakdown.present.dailyMission}</td>
                    <td className="py-0.5 px-0.5 border border-black">{breakdown.present.clinic}</td>
                    <td className="py-0.5 px-0.5 border border-black">{breakdown.present.customPresent}</td>
                    {/* Out numbers */}
                    <td className="py-0.5 px-0.5 border border-black bg-slate-100 font-black">{breakdown.out.total}</td>
                    {dynamicOutColumns.length === 0 ? (
                      <td className="py-0.5 px-0.5 border border-black">0</td>
                    ) : (
                      dynamicOutColumns.map((col) => (
                        <td key={col.id} className="py-0.5 px-0.5 border border-black">{col.count}</td>
                      ))
                    )}
                  </tr>
                </tbody>
              </table>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
