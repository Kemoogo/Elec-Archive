"use client";

import React, { useRef } from "react";
import { format } from "date-fns";
import { ar } from "date-fns/locale";
import { Printer } from "lucide-react";
import {
  type IRollcallEntry,
  ROLLCALL_STATUS_LABELS,
  isRollcallPresent,
  computeRollcallBreakdown,
} from "@/lib/db/models/DailyRollcall.shared";

interface RollcallPrintReportProps {
  date: string; // YYYY-MM-DD
  entries: IRollcallEntry[];
  targetOfficerCount: number;
}

export function RollcallPrintReport({
  date,
  entries,
  targetOfficerCount: _targetOfficerCount,
}: RollcallPrintReportProps) {
  const printRef = useRef<HTMLDivElement>(null);

  const breakdown = computeRollcallBreakdown(entries);
  const formattedDate = format(new Date(date), "EEEE, d MMMM yyyy", { locale: ar });

  const handlePrint = () => {
    window.print();
  };

  return (
    <div>
      <button
        onClick={handlePrint}
        className="px-4 py-2 bg-(--color-primary) text-white font-bold text-xs rounded-xl shadow-md hover:bg-(--color-primary-hover) transition-all flex items-center gap-2"
      >
        <Printer className="w-4 h-4" />
        طباعة كشف التمام الرسمي (A4)
      </button>

      {/* Hidden container for print, visible when printing or in preview modal */}
      <div className="hidden print:block font-sans dir-rtl text-black bg-white p-8">
        <style dangerouslySetInnerHTML={{ __html: `
          @media print {
            body {
              background: #fff !important;
              color: #000 !important;
              font-family: inherit;
            }
            .print\\:hidden {
              display: none !important;
            }
            .page-break {
              page-break-after: always;
            }
          }
        ` }} />

        <div ref={printRef} className="max-w-[210mm] mx-auto space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between border-b-2 border-slate-900 pb-4">
            <div className="text-right space-y-1">
              <h2 className="text-xl font-black text-slate-900">سجل التمام اليومي لضباط الوحدة</h2>
              <p className="text-sm font-semibold text-slate-700">التاريخ: {formattedDate}</p>
            </div>
            <div className="text-left text-xs font-bold text-slate-600">
              <p>فرع أركان الحرب</p>
              <p>سرية التمام والعمليات</p>
            </div>
          </div>

          {/* Roster Table */}
          <div>
            <h3 className="text-xs font-bold text-slate-800 mb-2">أولاً: كشف أسماء وتوزيع تمام الضباط (مرتبة حسب الرتبة والأقدمية)</h3>
            <table className="w-full text-xs text-right border-collapse border border-slate-900">
              <thead>
                <tr className="bg-slate-100 text-slate-900 font-bold border-b border-slate-900">
                  <th className="p-2 border-r border-slate-900 text-center w-10">م</th>
                  <th className="p-2 border-r border-slate-900 w-32">الرتبة</th>
                  <th className="p-2 border-r border-slate-900">الاسم والصفة</th>
                  <th className="p-2 border-r border-slate-900 w-28">حالة التمام</th>
                  <th className="p-2 border-r border-slate-900">التفاصيل / الملاحظات</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((entry, idx) => {
                  const isPresent = isRollcallPresent(entry.status);
                  const statusLabel = ROLLCALL_STATUS_LABELS[entry.status] || entry.status;
                  const detailsStr = entry.customReason || entry.attachedDestination || entry.note || "-";

                  return (
                    <tr key={idx} className="border-b border-slate-300 hover:bg-slate-50">
                      <td className="p-2 border-r border-slate-300 text-center font-bold">{idx + 1}</td>
                      <td className="p-2 border-r border-slate-300 font-bold">{entry.rank}</td>
                      <td className="p-2 border-r border-slate-300 font-semibold">{entry.fullName}</td>
                      <td className={`p-2 border-r border-slate-300 font-bold ${isPresent ? "text-slate-900" : "text-red-700"}`}>
                        {statusLabel}
                      </td>
                      <td className="p-2 border-r border-slate-300 text-slate-700">{detailsStr}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Military Summary Breakdown Table at Bottom */}
          <div className="pt-6 border-t-2 border-slate-900 space-y-3">
            <h3 className="text-xs font-bold text-slate-800">ثانياً: جدول التفكيك المعتمد لتمام القوة (جدول التمام العسكري)</h3>
            <table className="w-full text-xs text-center border-collapse border border-slate-900">
              <thead>
                <tr className="bg-slate-200 text-slate-900 font-black border-b border-slate-900">
                  <th className="p-2 border-r border-slate-900">القوة الإجمالية</th>
                  <th className="p-2 border-r border-slate-900 bg-emerald-100 text-emerald-900" colSpan={4}>
                    الموجود ({breakdown.present.total})
                  </th>
                  <th className="p-2 border-r border-slate-900 bg-amber-100 text-amber-900" colSpan={8}>
                    الخارج ({breakdown.out.total})
                  </th>
                </tr>
                <tr className="bg-slate-100 text-slate-800 font-bold border-b border-slate-900">
                  <th className="p-1.5 border-r border-slate-900">الإجمالي</th>
                  {/* Present columns */}
                  <th className="p-1.5 border-r border-slate-900">إجمالي الموجود</th>
                  <th className="p-1.5 border-r border-slate-900">داخل الوحدة</th>
                  <th className="p-1.5 border-r border-slate-900">مأمورية يومية</th>
                  <th className="p-1.5 border-r border-slate-900">عيادة</th>
                  {/* Out columns */}
                  <th className="p-1.5 border-r border-slate-900">إجمالي الخارج</th>
                  <th className="p-1.5 border-r border-slate-900">إجازة</th>
                  <th className="p-1.5 border-r border-slate-900">غياب</th>
                  <th className="p-1.5 border-r border-slate-900">فرقة</th>
                  <th className="p-1.5 border-r border-slate-900">راحة</th>
                  <th className="p-1.5 border-r border-slate-900">مأمورية خارجية</th>
                  <th className="p-1.5 border-r border-slate-900">ملحق</th>
                  <th className="p-1.5 border-r border-slate-900">مستشفى</th>
                </tr>
              </thead>
              <tbody>
                <tr className="font-black text-slate-900 text-sm">
                  <td className="p-2 border-r border-slate-900 bg-slate-50">{breakdown.totalOfficers}</td>
                  {/* Present */}
                  <td className="p-2 border-r border-slate-900 bg-emerald-50 text-emerald-800">{breakdown.present.total}</td>
                  <td className="p-2 border-r border-slate-900">{breakdown.present.insideUnit}</td>
                  <td className="p-2 border-r border-slate-900">{breakdown.present.dailyMission}</td>
                  <td className="p-2 border-r border-slate-900">{breakdown.present.clinic}</td>
                  {/* Out */}
                  <td className="p-2 border-r border-slate-900 bg-amber-50 text-amber-800">{breakdown.out.total}</td>
                  <td className="p-2 border-r border-slate-900">{breakdown.out.leave}</td>
                  <td className="p-2 border-r border-slate-900">{breakdown.out.absence}</td>
                  <td className="p-2 border-r border-slate-900">{breakdown.out.course}</td>
                  <td className="p-2 border-r border-slate-900">{breakdown.out.rest}</td>
                  <td className="p-2 border-r border-slate-900">{breakdown.out.externalMission}</td>
                  <td className="p-2 border-r border-slate-900">{breakdown.out.attached}</td>
                  <td className="p-2 border-r border-slate-900">{breakdown.out.hospital}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
