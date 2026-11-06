"use client";

import React from "react";
import { format } from "date-fns";
import { ar } from "date-fns/locale";
import { Shield } from "lucide-react";
import { formatDateDisplay } from "@/lib/utils/date-display";
import type { Mission } from "./MissionsTable";

interface TravelOrderSheetProps {
  mission: Mission;
  unitName?: string;
  commanderTitle?: string;
}

export function TravelOrderSheet({
  mission,
  unitName = "قيادة الوحدة العسكرية",
  commanderTitle = "قائد الوحدة",
}: TravelOrderSheetProps) {
  const today = new Date();
  const todayFormatted = format(today, "d MMMM yyyy", { locale: ar });

  const isMultiDay = Boolean(
    mission.endDate &&
      formatDateDisplay(mission.startDate) !== formatDateDisplay(mission.endDate)
  );

  return (
    <div
      id={`travel-order-${mission.id}`}
      className="p-8 font-sans text-black bg-white printable-travel-order-sheet max-w-[210mm] mx-auto border-2 border-black"
      dir="rtl"
    >
      {/* Outer Military Double Border Frame */}
      <div className="border border-black p-6 space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between border-b-2 border-black pb-4">
          <div className="text-right text-xs leading-relaxed font-bold">
            <p>جمهورية مصر العربية</p>
            <p>وزارة الدفاع</p>
            <p className="font-black text-sm">{unitName}</p>
            <p>فرع أركان حرب والعمليات</p>
          </div>

          <div className="text-center space-y-1">
            <Shield className="w-10 h-10 mx-auto text-black" />
            <h1 className="text-xl font-black tracking-wider underline underline-offset-8 decoration-2">
              أمر تحرك وخط سير عسكري
            </h1>
            <p className="text-xs font-mono font-bold mt-1">
              رقم القيد العملياتي: {mission.travelOrderNumber || `ت ح / ${today.getFullYear()} / ${mission.id.slice(-4)}`}
            </p>
          </div>

          <div className="text-left text-xs leading-relaxed font-bold text-slate-700">
            <p>التاريخ: {todayFormatted}</p>
            <p>درجة السرية: سري ومكتوم</p>
            {mission.linkedFaxId && (
              <p className="font-mono mt-1 text-[11px]">فاكس مرجعي: {mission.linkedFaxId}</p>
            )}
          </div>
        </div>

        {/* Officer Military Profile Card */}
        <div className="border border-black p-4 space-y-3 bg-slate-50/50">
          <h3 className="text-xs font-black border-b border-black pb-1">أولاً: بيانات الضابط القائم بالمأمورية</h3>
          <div className="grid grid-cols-2 gap-y-2 text-xs">
            <div>
              <span className="font-bold">الرتبة والاسم: </span>
              <span className="font-black text-sm">
                {mission.officerRankLabel ? `${mission.officerRankLabel} / ` : ""}
                {mission.officerName || mission.officerLabel || "ضابط غير معروف"}
              </span>
            </div>
            <div>
              <span className="font-bold">الرقم العسكري: </span>
              <span className="font-mono font-black">{mission.officerMilitaryId || "ـ"}</span>
            </div>
            <div>
              <span className="font-bold">الوحدة الأصلية: </span>
              <span className="font-bold">{unitName}</span>
            </div>
            <div>
              <span className="font-bold">التصنيف: </span>
              <span className="font-bold">
                {mission.missionType === "internal_daily" ? "مأمورية يومية داخلية" : "مأمورية خارجية رسمية"}
              </span>
            </div>
          </div>
        </div>

        {/* Mission Details & Route */}
        <div className="border border-black p-4 space-y-3">
          <h3 className="text-xs font-black border-b border-black pb-1">ثانياً: خط السير وبيان التكليف العملياتي</h3>
          <div className="grid grid-cols-2 gap-y-3 text-xs">
            <div className="col-span-2">
              <span className="font-bold">موضوع المهمة والتكليف: </span>
              <span className="font-black">{mission.title}</span>
            </div>
            <div className="col-span-2">
              <span className="font-bold">الجهة المقصودة (خط السير): </span>
              <span className="font-black text-sm">{mission.destination || "وفقاً للتعليمات الصادرة"}</span>
            </div>
            <div>
              <span className="font-bold">تاريخ بدء التحرك: </span>
              <span className="font-black">{formatDateDisplay(mission.startDate)}</span>
            </div>
            <div>
              <span className="font-bold">تاريخ العودة المتوقع: </span>
              <span className="font-black">
                {isMultiDay && mission.endDate
                  ? formatDateDisplay(mission.endDate)
                  : formatDateDisplay(mission.startDate)}
              </span>
            </div>
            <div>
              <span className="font-bold">وسيلة الانتقال المصرح بها: </span>
              <span className="font-bold">{mission.transportationMean || "سيارة تابعة للوحدة"}</span>
            </div>
            <div>
              <span className="font-bold">السلاح والذخيرة المصرح بحملها: </span>
              <span className="font-bold">{mission.authorizedWeapons || "بدون سلاح شخصي"}</span>
            </div>
            {mission.description && (
              <div className="col-span-2 text-[11px] text-slate-700 bg-white p-2 border border-black/40">
                <span className="font-bold block mb-0.5">تعليمات وملاحظات إضافية:</span>
                <p>{mission.description}</p>
              </div>
            )}
          </div>
        </div>

        {/* Official Directives */}
        <div className="border border-black p-3 text-[11px] leading-relaxed space-y-1 bg-slate-50/30">
          <p className="font-black">تعليمات أمنية وانضباطية ملزمة:</p>
          <ol className="list-decimal list-inside space-y-0.5 pr-2 font-medium">
            <li>على كافة السلطات العسكرية والأمنية ونقاط الشرطة العسكرية تسهيل مأمورية السيد الضابط المذكور أعلاه.</li>
            <li>الالتزام بخط السير والمواعيد المحددة بأمر التحرك وحظر الانحراف عنه إلا بأوامر عملياتية طارئة وموثقة.</li>
            <li>إثبات تاريخ وساعة الوصول والانصراف لدى الجهة المقصودة وتقديم إفادة إخلاء الطرف لفرع أركان حرب فور العودة.</li>
          </ol>
        </div>

        {/* Signatures Footer */}
        <div className="pt-6">
          <div className="grid grid-cols-3 text-center text-xs gap-4">
            <div className="space-y-12">
              <p className="font-black">ضابط نوبتجي / عمليات الوحدة</p>
              <div className="border-t border-dotted border-black pt-1">
                <p className="text-[10px] text-slate-500 font-bold">التوقيع والتاريخ</p>
              </div>
            </div>

            <div className="space-y-12">
              <p className="font-black">رئيس فرع أركان حرب والعمليات</p>
              <div className="border-t border-dotted border-black pt-1">
                <p className="text-[10px] text-slate-500 font-bold">التوقيع والتاريخ</p>
              </div>
            </div>

            <div className="space-y-12">
              <div className="space-y-0.5">
                <p className="font-black">يُـعـتـمـد</p>
                <p className="font-black text-sm">{commanderTitle}</p>
              </div>
              <div className="border-t border-dotted border-black pt-1">
                <p className="text-[10px] text-slate-500 font-bold">خاتم شعار الوحدة العسكرية</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
