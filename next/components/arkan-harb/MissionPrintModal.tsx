"use client";

import { ModalShell } from "@/components/ui/modal-shell";
import { ModalActions } from "@/components/ui/modal-actions";
import { Shield, FileText } from "lucide-react";
import { type Mission } from "./MissionsTable";

interface MissionPrintModalProps {
  mission: Mission | null;
  isOpen: boolean;
  onClose: () => void;
}

function formatDateDisplay(date: Date | string | null | undefined): string {
  if (!date) return "حتى تاريخه";
  const d = typeof date === "string" ? new Date(date) : date;
  if (isNaN(d.getTime())) return "";
  return `${d.getDate().toString().padStart(2, "0")}/${(d.getMonth() + 1).toString().padStart(2, "0")}/${d.getFullYear()}`;
}

export function MissionPrintModal({ mission, isOpen, onClose }: MissionPrintModalProps) {
  if (!isOpen || !mission) return null;

  const handlePrint = () => {
    window.print();
  };

  const footer = (
    <ModalActions
      submitText="طباعة الأمر"
      onSubmit={handlePrint}
      cancelText="إلغاء"
      onCancel={onClose}
    />
  );

  const displayOfficer = mission.officerLabel || (mission.officerRankLabel ? `${mission.officerRankLabel} / ${mission.officerName}` : mission.officerName || "---");

  return (
    <ModalShell
      title="عرض أمر التكليف بالمأمورية الرسمية"
      icon={<FileText className="w-4 h-4" />}
      onClose={onClose}
      footer={footer}
      panelClassName="max-w-[700px]"
    >
      <div className="space-y-6 text-right">
        {/* Printable Document Container */}
        <div className="p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs space-y-6 printable-mission-doc">
          {/* Header */}
          <div className="flex justify-between items-start border-b border-slate-200 dark:border-slate-800 pb-4">
            <div className="text-right space-y-1">
              <p className="text-xs font-black text-slate-800 dark:text-slate-200">القيادة العامة للقوات المسلحة</p>
              <p className="text-xs font-bold text-slate-600 dark:text-slate-400">فرع أركان الحرب والعمليات</p>
              <p className="text-[11px] font-mono text-slate-500">رقم الأمر: M-{mission.id.slice(-6).toUpperCase()}</p>
            </div>
            <div className="flex flex-col items-center">
              <Shield className="w-10 h-10 text-(--color-primary) mb-1" />
              <span className="text-[10px] font-black tracking-widest text-slate-400">أمر تكليف رسمي</span>
            </div>
            <div className="text-left space-y-1">
              <p className="text-xs font-bold text-slate-600 dark:text-slate-400">التاريخ: {formatDateDisplay(new Date())}</p>
              <p className="text-xs font-bold text-slate-600 dark:text-slate-400">سري وشخصي</p>
            </div>
          </div>

          {/* Title */}
          <div className="text-center py-2 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800">
            <h2 className="text-lg font-black text-(--color-primary)">أمر مأمورية رسمية</h2>
            <p className="text-xs font-bold text-slate-500 mt-0.5">تكليف مباشر بالتحرك والقيام بالمهمة</p>
          </div>

          {/* Content Details */}
          <div className="space-y-4 text-sm leading-relaxed">
            <p className="font-bold text-slate-700 dark:text-slate-300">
              يُكلف السيد الضابط المذكور بياناته أدناه بالتحرك والقيام بالمأمورية المبينة تفاصيلها بالشروط المحددة:
            </p>

            <div className="grid grid-cols-2 gap-4 bg-slate-50/50 dark:bg-slate-800/30 p-4 rounded-xl border border-slate-200/60 dark:border-slate-800">
              <div>
                <span className="text-xs font-bold text-slate-400 block mb-1">بيانات الضابط المعني:</span>
                <p className="text-sm font-black text-slate-800 dark:text-slate-100">{displayOfficer}</p>
                {mission.officerMilitaryId && (
                  <p className="text-xs font-mono text-slate-500 mt-0.5">الرقم العسكري: #{mission.officerMilitaryId}</p>
                )}
              </div>
              <div>
                <span className="text-xs font-bold text-slate-400 block mb-1">الجهة المقصودة:</span>
                <p className="text-sm font-black text-slate-800 dark:text-slate-100">{mission.destination || "غير محددة"}</p>
              </div>
            </div>

            <div className="space-y-2">
              <span className="text-xs font-bold text-slate-400 block">موضوع/عنوان المأمورية:</span>
              <p className="text-base font-black text-(--color-primary) bg-blue-50/50 dark:bg-blue-950/30 p-3 rounded-xl border border-blue-100 dark:border-blue-900/40">
                {mission.title}
              </p>
            </div>

            {mission.description && (
              <div className="space-y-1">
                <span className="text-xs font-bold text-slate-400 block">تفاصيل وتتعليمات المأمورية:</span>
                <p className="text-xs font-semibold text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/40 p-3 rounded-xl">
                  {mission.description}
                </p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4 bg-slate-50/50 dark:bg-slate-800/30 p-3 rounded-xl border border-slate-200/60 dark:border-slate-800 text-xs">
              <div>
                <span className="font-bold text-slate-400">تاريخ البدء: </span>
                <span className="font-black text-slate-700 dark:text-slate-200">{formatDateDisplay(mission.startDate)}</span>
              </div>
              <div>
                <span className="font-bold text-slate-400">تاريخ العودة المتوقع: </span>
                <span className="font-black text-slate-700 dark:text-slate-200">{formatDateDisplay(mission.endDate)}</span>
              </div>
            </div>
          </div>

          {/* Signatures Area */}
          <div className="pt-8 border-t border-slate-200 dark:border-slate-800 grid grid-cols-2 gap-8 text-center text-xs">
            <div className="space-y-8">
              <p className="font-black text-slate-700 dark:text-slate-300">رئيس فرع أركان الحرب</p>
              <div className="h-10 border-b border-dashed border-slate-300 dark:border-slate-700 w-3/4 mx-auto" />
              <p className="text-[10px] text-slate-400">التوقيع والخاتم الرسمي</p>
            </div>
            <div className="space-y-8">
              <p className="font-black text-slate-700 dark:text-slate-300">يعتمد،، قائد الوحدة</p>
              <div className="h-10 border-b border-dashed border-slate-300 dark:border-slate-700 w-3/4 mx-auto" />
              <p className="text-[10px] text-slate-400">التوقيع والخاتم الرسمي</p>
            </div>
          </div>
        </div>
      </div>
    </ModalShell>
  );
}
