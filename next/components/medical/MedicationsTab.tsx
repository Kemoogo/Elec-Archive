"use client";

import { Pill } from "lucide-react";
import type { Medication } from "@/lib/medical/types";

interface MedicationsTabProps {
  medications: Medication[];
}

export function MedicationsTab({ medications }: MedicationsTabProps) {
  if (medications.length === 0) {
    return (
      <div className="empty-section py-12">
        <Pill className="w-12 h-12 text-(--app-muted-foreground)/40" />
        <p className="text-sm font-bold text-(--app-muted-foreground)">لا توجد أدوية سابقة</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-(--app-border)">
            <th className="text-right py-2 px-3 text-xs font-bold text-(--app-muted-foreground)">الدواء</th>
            <th className="text-right py-2 px-3 text-xs font-bold text-(--app-muted-foreground)">آخر صرف</th>
          </tr>
        </thead>
        <tbody>
          {medications.map((med) => (
            <tr key={med.medicineId} className="border-b border-(--app-border)/50">
              <td className="py-2 px-3 font-bold text-(--app-foreground)">
                {med.totalQuantity}{med.unit ? ` ${med.unit}` : ""} {med.medicineName}{med.concentration ? ` ${med.concentration}` : ""}
              </td>
              <td className="py-2 px-3 text-(--app-muted-foreground)">
                {new Date(med.lastDispenseDate).toLocaleDateString("ar-EG")}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
