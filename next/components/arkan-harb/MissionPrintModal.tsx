"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
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
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!isOpen || !mission) return null;

  const handlePrint = () => {
    document.body.classList.add("printing-mission-doc");
    const cleanup = () => {
      document.body.classList.remove("printing-mission-doc");
      window.removeEventListener("afterprint", cleanup);
    };
    window.addEventListener("afterprint", cleanup);
    window.print();
    setTimeout(cleanup, 1500);
  };

  const footer = (
    <ModalActions
      submitText="طباعة الأمر"
      onSubmit={handlePrint}
      cancelText="إغلاق"
      onCancel={onClose}
    />
  );

  const displayOfficer =
    mission.officerLabel ||
    (mission.officerRankLabel
      ? `${mission.officerRankLabel} / ${mission.officerName}`
      : mission.officerName || "---");

  const printableContent = (
    <div className="space-y-6 text-black bg-white">
      {/* Header */}
      <div className="flex justify-between items-start border-b-2 border-slate-900 pb-4">
        <div className="text-right space-y-1">
          <p className="text-sm font-black text-slate-900">القيادة العامة للقوات المسلحة</p>
          <p className="text-xs font-bold text-slate-700">فرع أركان الحرب والعمليات</p>
          <p className="text-xs font-mono text-slate-600">رقم الأمر: M-{mission.id.slice(-6).toUpperCase()}</p>
        </div>
        <div className="flex flex-col items-center">
          <Shield className="w-12 h-12 text-slate-900 mb-1" />
          <span className="text-xs font-black tracking-widest text-slate-800">أمر تكليف رسمي</span>
        </div>
        <div className="text-left space-y-1">
          <p className="text-xs font-bold text-slate-700">التاريخ: {formatDateDisplay(new Date())}</p>
          <p className="text-xs font-bold text-slate-800">سري وشخصي</p>
        </div>
      </div>

      {/* Title */}
      <div className="text-center py-2.5 bg-slate-100 rounded-xl border border-slate-300">
        <h2 className="text-lg font-black text-slate-900">أمر مأمورية رسمية</h2>
        <p className="text-xs font-bold text-slate-600 mt-0.5">تكليف مباشر بالتحرك والقيام بالمهمة</p>
      </div>

      {/* Content Details */}
      <div className="space-y-4 text-sm leading-relaxed text-slate-900">
        <p className="font-bold text-slate-800">
          يُكلف السيد الضابط المذكور بياناته أدناه بالتحرك والقيام بالمأمورية المبينة تفاصيلها بالشروط المحددة:
        </p>

        <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-300">
          <div>
            <span className="text-xs font-bold text-slate-500 block mb-1">بيانات الضابط المعني:</span>
            <p className="text-sm font-black text-slate-900">{displayOfficer}</p>
            {mission.officerMilitaryId && (
              <p className="text-xs font-mono text-slate-600 mt-0.5">الرقم العسكري: #{mission.officerMilitaryId}</p>
            )}
          </div>
          <div>
            <span className="text-xs font-bold text-slate-500 block mb-1">الجهة المقصودة:</span>
            <p className="text-sm font-black text-slate-900">{mission.destination || "غير محددة"}</p>
          </div>
        </div>

        <div className="space-y-1.5">
          <span className="text-xs font-bold text-slate-500 block">موضوع/عنوان المأمورية:</span>
          <p className="text-base font-black text-slate-900 bg-slate-100 p-3 rounded-xl border border-slate-300">
            {mission.title}
          </p>
        </div>

        {mission.description && (
          <div className="space-y-1">
            <span className="text-xs font-bold text-slate-500 block">تفاصيل وتعليمات المأمورية:</span>
            <p className="text-xs font-semibold text-slate-800 bg-slate-50 p-3 rounded-xl border border-slate-200">
              {mission.description}
            </p>
          </div>
        )}

        <div className="grid grid-cols-2 gap-4 bg-slate-50 p-3 rounded-xl border border-slate-300 text-xs">
          <div>
            <span className="font-bold text-slate-500">تاريخ البدء: </span>
            <span className="font-black text-slate-900">{formatDateDisplay(mission.startDate)}</span>
          </div>
          <div>
            <span className="font-bold text-slate-500">تاريخ العودة المتوقع: </span>
            <span className="font-black text-slate-900">{formatDateDisplay(mission.endDate)}</span>
          </div>
        </div>
      </div>

      {/* Signatures Area */}
      <div className="pt-8 border-t-2 border-slate-900 grid grid-cols-2 gap-8 text-center text-xs">
        <div className="space-y-8">
          <p className="font-black text-slate-900">رئيس فرع أركان الحرب</p>
          <div className="h-10 border-b border-dashed border-slate-400 w-3/4 mx-auto" />
          <p className="text-[10px] text-slate-500">التوقيع والخاتم الرسمي</p>
        </div>
        <div className="space-y-8">
          <p className="font-black text-slate-900">يعتمد،، قائد الوحدة</p>
          <div className="h-10 border-b border-dashed border-slate-400 w-3/4 mx-auto" />
          <p className="text-[10px] text-slate-500">التوقيع والخاتم الرسمي</p>
        </div>
      </div>
    </div>
  );

  return (
    <>
      <ModalShell
        title="عرض أمر التكليف بالمأمورية الرسمية"
        icon={<FileText className="w-4 h-4" />}
        onClose={onClose}
        footer={footer}
        panelClassName="max-w-[700px]"
      >
        <div className="space-y-6 text-right">
          <div className="p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs space-y-6">
            {printableContent}
          </div>
        </div>
      </ModalShell>

      {/* Dedicated Portal rendered directly to document.body for flawless printing */}
      {mounted &&
        createPortal(
          <div
            className="mission-print-portal fixed inset-0 z-[999999] bg-white text-black p-8 font-sans hidden"
            dir="rtl"
          >
            <style
              dangerouslySetInnerHTML={{
                __html: `
                @media print {
                  body.printing-mission-doc > *:not(.mission-print-portal) {
                    display: none !important;
                  }
                  body.printing-mission-doc .mission-print-portal {
                    display: block !important;
                    position: static !important;
                    background: #ffffff !important;
                    color: #000000 !important;
                    padding: 15mm !important;
                    width: 100% !important;
                  }
                }
              `,
              }}
            />
            {printableContent}
          </div>,
          document.body
        )}
    </>
  );
}
