"use client";

import React from "react";
import { format } from "date-fns";
import { ar } from "date-fns/locale";
import { Shield } from "lucide-react";
import { formatDateDisplay } from "@/lib/utils/date-display";
import { getMissionStatusLabel } from "@/lib/utils/status-badge";
import type { Mission } from "./MissionsTable";

interface MissionsPrintReportProps {
  ongoingMissions?: Mission[];
  tomorrowMissions: Mission[];
  todayMissions: Mission[];
  yesterdayMissions: Mission[];
  date?: string | Date;
  unitName?: string;
}

export function MissionsPrintReport({
  ongoingMissions = [],
  tomorrowMissions,
  todayMissions,
  yesterdayMissions,
  date = new Date(),
  unitName,
}: MissionsPrintReportProps) {
  const currentDate = new Date(date);
  const formattedDate = !isNaN(currentDate.getTime())
    ? format(currentDate, "EEEE, d MMMM yyyy", { locale: ar })
    : formatDateDisplay(date);

  const renderMissionRow = (m: Mission, idx: number) => {
    const isMultiDay = Boolean(
      m.endDate &&
      formatDateDisplay(m.startDate) !== formatDateDisplay(m.endDate)
    );

    return (
      <tr key={m.id || idx} className="border border-black text-xs">
        <td className="p-1.5 text-center font-bold border border-black">{idx + 1}</td>
        <td className="p-1.5 text-center font-bold border border-black">{m.officerRankLabel || "ـ"}</td>
        <td className="p-1.5 text-right font-black border border-black">
          {m.officerName || m.officerLabel || "ضابط غير معروف"}
        </td>
        <td className="p-1.5 text-right font-black border border-black">{m.title}</td>
        <td className="p-1.5 text-center font-bold border border-black">{m.destination || "ـ"}</td>
        <td className="p-1.5 text-center font-bold border border-black">
          <div>{formatDateDisplay(m.startDate)}</div>
          {isMultiDay && m.endDate && (
            <div className="text-[10px] text-slate-700">حتى {formatDateDisplay(m.endDate)}</div>
          )}
        </td>
        <td className="p-1.5 text-center font-bold border border-black">
          {getMissionStatusLabel(m.status)}
        </td>
        <td className="p-1.5 text-right text-[11px] font-medium border border-black">
          {m.statusReason || m.description || "ـ"}
        </td>
      </tr>
    );
  };

  return (
    <div className="hidden print:block font-sans text-black bg-white printable-missions-sheet" dir="rtl">
      <div className="military-print-double-border">
        <div className="military-print-inner-frame space-y-5">
          {/* Official Military Header with Unit Name */}
          <div className="flex items-start justify-between border-b-2 border-black pb-3">
            <div className="text-right space-y-0.5 text-xs text-black leading-tight">
              <p className="font-bold">جمهورية مصر العربية</p>
              <p className="font-bold">وزارة الدفاع</p>
              <p className="font-black text-sm text-black">{unitName || "قيادة الوحدة العسكرية"}</p>
              <p className="font-bold">فرع أركان حرب والعمليات</p>
            </div>

            <div className="text-center space-y-1">
              <Shield className="w-8 h-8 mx-auto text-black" />
              <h1 className="text-base font-black tracking-wide text-black underline underline-offset-4 decoration-2">
                كـشـف مـأمـوريـات الـقـوة
              </h1>
              <p className="text-xs font-bold text-black">تاريخ الإصدار: {formattedDate}</p>
            </div>

            <div className="text-left space-y-0.5 text-xs text-black">
              <p className="font-black">سري وشخصي</p>
              <p className="font-medium text-[10px] text-slate-700">منظومة الأرشيف الإلكتروني</p>
            </div>
          </div>

        {/* 0. بيان المأموريات الممتدة والجارية (إن وجدت) */}
        {ongoingMissions && ongoingMissions.length > 0 && (
          <div className="space-y-2 avoid-break">
            <div className="flex items-center justify-between bg-slate-100 p-2 border border-slate-900">
              <h2 className="font-black text-xs text-slate-900">
                بيان المأموريات الممتدة والجارية (المستمرة حالياً)
              </h2>
              <span className="text-[11px] font-bold text-slate-800">
                العدد: {ongoingMissions.length} مأمورية
              </span>
            </div>

            <table className="w-full text-right border-collapse text-xs border border-slate-900">
              <thead>
                <tr className="bg-slate-200 text-slate-900 font-black text-center text-[11px]">
                  <th className="p-1.5 border border-slate-900 w-10">م</th>
                  <th className="p-1.5 border border-slate-900 w-24">الرتبة</th>
                  <th className="p-1.5 border border-slate-900 w-48">الاسم</th>
                  <th className="p-1.5 border border-slate-900">عنوان المأمورية</th>
                  <th className="p-1.5 border border-slate-900 w-32">الجهة المقصودة</th>
                  <th className="p-1.5 border border-slate-900 w-28">الفترة</th>
                  <th className="p-1.5 border border-slate-900 w-20">الحالة</th>
                  <th className="p-1.5 border border-slate-900">ملاحظات</th>
                </tr>
              </thead>
              <tbody>
                {ongoingMissions.map(renderMissionRow)}
              </tbody>
            </table>
          </div>
        )}

        {/* 1. بيان مأموريات باكر */}
        <div className="space-y-2 avoid-break">
          <div className="flex items-center justify-between bg-slate-100 p-2 border border-slate-900">
            <h2 className="font-black text-xs text-slate-900">
              أولاً: بيان مأموريات باكر (المجدولة لباكر)
            </h2>
            <span className="text-[11px] font-bold text-slate-800">
              العدد: {tomorrowMissions.length} مأمورية
            </span>
          </div>

          <table className="w-full text-right border-collapse text-xs border border-slate-900">
            <thead>
              <tr className="bg-slate-200 text-slate-900 font-black text-center text-[11px]">
                <th className="p-1.5 border border-slate-900 w-10">م</th>
                <th className="p-1.5 border border-slate-900 w-24">الرتبة</th>
                <th className="p-1.5 border border-slate-900 w-48">الاسم</th>
                <th className="p-1.5 border border-slate-900">عنوان المأمورية</th>
                <th className="p-1.5 border border-slate-900 w-32">الجهة المقصودة</th>
                <th className="p-1.5 border border-slate-900 w-28">الفترة</th>
                <th className="p-1.5 border border-slate-900 w-20">الحالة</th>
                <th className="p-1.5 border border-slate-900">ملاحظات</th>
              </tr>
            </thead>
            <tbody>
              {tomorrowMissions.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-3 text-center text-slate-600 font-bold border border-slate-900">
                    لا توجد مأموريات مجدولة لباكر
                  </td>
                </tr>
              ) : (
                tomorrowMissions.map(renderMissionRow)
              )}
            </tbody>
          </table>
        </div>

        {/* 2. بيان مأموريات اليوم */}
        <div className="space-y-2 avoid-break">
          <div className="flex items-center justify-between bg-slate-100 p-2 border border-slate-900">
            <h2 className="font-black text-xs text-slate-900">
              ثانياً: بيان مأموريات اليوم (الجارية والنشطة)
            </h2>
            <span className="text-[11px] font-bold text-slate-800">
              العدد: {todayMissions.length} مأمورية
            </span>
          </div>

          <table className="w-full text-right border-collapse text-xs border border-slate-900">
            <thead>
              <tr className="bg-slate-200 text-slate-900 font-black text-center text-[11px]">
                <th className="p-1.5 border border-slate-900 w-10">م</th>
                <th className="p-1.5 border border-slate-900 w-24">الرتبة</th>
                <th className="p-1.5 border border-slate-900 w-48">الاسم</th>
                <th className="p-1.5 border border-slate-900">عنوان المأمورية</th>
                <th className="p-1.5 border border-slate-900 w-32">الجهة المقصودة</th>
                <th className="p-1.5 border border-slate-900 w-28">الفترة</th>
                <th className="p-1.5 border border-slate-900 w-20">الحالة</th>
                <th className="p-1.5 border border-slate-900">ملاحظات</th>
              </tr>
            </thead>
            <tbody>
              {todayMissions.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-3 text-center text-slate-600 font-bold border border-slate-900">
                    لا توجد مأموريات نشطة اليوم
                  </td>
                </tr>
              ) : (
                todayMissions.map(renderMissionRow)
              )}
            </tbody>
          </table>
        </div>

        {/* 3. بيان مأموريات أمس */}
        <div className="space-y-2 avoid-break">
          <div className="flex items-center justify-between bg-slate-100 p-2 border border-slate-900">
            <h2 className="font-black text-xs text-slate-900">
              ثالثاً: بيان مأموريات أمس (المنفذة والسابقة)
            </h2>
            <span className="text-[11px] font-bold text-slate-800">
              العدد: {yesterdayMissions.length} مأمورية
            </span>
          </div>

          <table className="w-full text-right border-collapse text-xs border border-slate-900">
            <thead>
              <tr className="bg-slate-200 text-slate-900 font-black text-center text-[11px]">
                <th className="p-1.5 border border-slate-900 w-10">م</th>
                <th className="p-1.5 border border-slate-900 w-24">الرتبة</th>
                <th className="p-1.5 border border-slate-900 w-48">الاسم</th>
                <th className="p-1.5 border border-slate-900">عنوان المأمورية</th>
                <th className="p-1.5 border border-slate-900 w-32">الجهة المقصودة</th>
                <th className="p-1.5 border border-slate-900 w-28">الفترة</th>
                <th className="p-1.5 border border-slate-900 w-20">الحالة</th>
                <th className="p-1.5 border border-slate-900">ملاحظات</th>
              </tr>
            </thead>
            <tbody>
              {yesterdayMissions.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-3 text-center text-slate-600 font-bold border border-slate-900">
                    لا توجد مأموريات مسجلة لأمس
                  </td>
                </tr>
              ) : (
                yesterdayMissions.map(renderMissionRow)
              )}
            </tbody>
          </table>
        </div>

        {/* Signatures */}
        <div className="avoid-break pt-5 border-t-2 border-black grid grid-cols-2 gap-8 text-center text-xs">
          <div className="space-y-8">
            <p className="font-black text-black">رئيس فرع أركان الحرب والعمليات</p>
            <div className="h-8 border-b border-dashed border-black/40 w-3/4 mx-auto" />
            <p className="text-[10px] text-slate-600">التوقيع والخاتم الرسمي</p>
          </div>
          <div className="space-y-8">
            <p className="font-black text-black">يعتمد،، قائد الوحدة</p>
            <div className="h-8 border-b border-dashed border-black/40 w-3/4 mx-auto" />
            <p className="text-[10px] text-slate-600">التوقيع والخاتم الرسمي</p>
          </div>
        </div>
      </div>
    </div>
  </div>
  );
}
