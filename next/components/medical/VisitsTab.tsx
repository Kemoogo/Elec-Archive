"use client";

import { Activity } from "lucide-react";
import type { Visit } from "@/lib/medical/types";

interface VisitsTabProps {
  visits: Visit[];
}

export function VisitsTab({ visits }: VisitsTabProps) {
  if (visits.length === 0) {
    return (
      <div className="empty-section py-12">
        <Activity className="w-12 h-12 text-(--app-muted-foreground)/40" />
        <p className="text-sm font-bold text-(--app-muted-foreground)">لا توجد زيارات سابقة</p>
      </div>
    );
  }

  return (
    <div className="space-y-3 max-h-[500px] overflow-y-auto no-scrollbar">
      {visits.map((visit) => (
        <div
          key={visit._id}
          className="rounded-xl border border-(--app-border) bg-(--app-surface-container) p-4 space-y-2"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-(--app-muted-foreground)">
              {new Date(visit.visitDate).toLocaleDateString("ar-EG", {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </span>
            <div className="flex items-center gap-1.5">
              {visit.fitnessCategory && visit.fitnessCategory !== "fit" && (
                <span className="text-[10px] font-black bg-(--app-surface-container) text-(--color-primary) px-2 py-0.5 rounded-full border border-(--app-border)">
                  {visit.fitnessCategory === "class_a" && "فئة أ"}
                  {visit.fitnessCategory === "class_b" && "فئة ب"}
                  {visit.fitnessCategory === "class_c" && "فئة ج"}
                  {visit.fitnessCategory === "temporary_unfit" && "غير لائق مؤقتاً"}
                </span>
              )}
              {visit.restType && visit.restType !== "none" && visit.restDays && visit.restDays > 0 && (
                <span className="text-[10px] font-black bg-(--app-warning)/10 text-(--app-warning) px-2 py-0.5 rounded-full border border-(--app-warning)/20">
                  {visit.restType === "ward" && "راحة عنبر"}
                  {visit.restType === "home" && "راحة منزلية"}
                  {visit.restType === "exemption" && "إعفاء مجهود"} ({visit.restDays} يوم)
                </span>
              )}
            </div>
          </div>

          {visit.diagnosis && (
            <div>
              <span className="text-xs font-bold text-(--app-muted-foreground) block mr-1">التشخيص</span>
              <p className="text-sm font-bold text-(--app-foreground)">{visit.diagnosis}</p>
            </div>
          )}

          {visit.treatment && (
            <div>
              <span className="text-xs font-bold text-(--app-muted-foreground) block mr-1">التوصية الطبية</span>
              <p className="text-sm font-bold text-(--app-foreground)">{visit.treatment}</p>
            </div>
          )}

          {visit.dispensedMedicines.length > 0 && (
            <div>
              <span className="text-xs font-bold text-(--app-muted-foreground) block mr-1">الأدوية المصروفة</span>
              <ul className="text-sm font-bold text-(--app-foreground) space-y-1">
                {visit.dispensedMedicines.map((med, idx) => (
                  <li key={idx} className="flex items-center justify-between">
                    <span>{med.medicineName}</span>
                    <span className="text-(--app-muted-foreground)">الكمية: {med.quantity}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
