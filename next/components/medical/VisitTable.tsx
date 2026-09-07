"use client";

import { useState } from "react";
import MainTable, { TableColumn } from "@/components/ui/Table";
import { Activity } from "lucide-react";
import { EditVisitModal } from "./EditVisitModal";
import { ViewVisitModal } from "./ViewVisitModal";

interface DispensedMedicine {
  medicineId: string;
  medicineName?: string;
  quantity: number;
}

interface VisitSummary {
  _id: string;
  id?: string;
  className?: string;
  patientId: string;
  patientName: string;
  visitDate: string;
  diagnosis: string;
  dispensedMedicines: DispensedMedicine[];
  restType?: string;
  restDays?: number;
  fitnessCategory?: string;
}

interface VisitTableProps {
  visits: VisitSummary[];
  emptyTitle?: string;
  emptyDescription?: string;
  permissions?: "none" | "view" | "edit";
}

export function VisitTable({ visits, emptyTitle, emptyDescription, permissions }: VisitTableProps) {
  const [selectedVisitId, setSelectedVisitId] = useState<string | null>(null);
  const [viewVisitId, setViewVisitId] = useState<string | null>(null);

  const hasLongDiagnosis = visits.some(
    (v) => v.diagnosis && (v.diagnosis.trim().split(/\s+/).length > 4 || v.diagnosis.trim().length > 25)
  );

  const columns: TableColumn<VisitSummary>[] = [
    {
      header: "رقم المريض",
      accessor: "patientId",
      isNumeric: true,
      minWidth: hasLongDiagnosis,
    },
    {
      header: "اسم المريض",
      accessor: "patientName",
      minWidth: hasLongDiagnosis,
      render: (val, row) => (
        <button
          type="button"
          onClick={() => setViewVisitId(row._id)}
          className="hover:underline hover:text-(--app-info) cursor-pointer border-none bg-transparent text-inherit"
        >
          {val as string}
        </button>
      ),
    },
    {
      header: "تاريخ الزيارة",
      accessor: "visitDate",
      minWidth: hasLongDiagnosis,
      render: (val) => <span className="font-mono">{new Date(val as string).toLocaleDateString("ar-EG")}</span>,
    },
    {
      header: "التشخيص",
      accessor: "diagnosis",
      minWidth: hasLongDiagnosis,
      render: (val) => {
        const text = val as string;
        if (!text) return "-";
        const words = text.trim().split(/\s+/);
        if (words.length > 4) {
          const truncated = words.slice(0, 4).join(" ") + "...";
          return (
            <span title={text} className="cursor-help hover:text-(--app-info) transition-colors">
              {truncated}
            </span>
          );
        }
        return text;
      },
    },
    {
      header: "الراحة الطبية",
      minWidth: hasLongDiagnosis,
      render: (_, row) => {
        const type = row.restType || "none";
        const days = row.restDays || 0;
        if (type === "none" || days === 0) return "لا يوجد";

        const labels: Record<string, string> = {
          ward: "راحة عنبر",
          home: "راحة منزلية",
          exemption: "إعفاء مجهود",
        };

        const restLabel = days === 1
          ? "يوم واحد"
          : days === 2
            ? "يومين"
            : days >= 3 && days <= 10
              ? `${days} أيام`
              : `${days} يوم`;

        return (
          <span title={labels[type] || "راحة طبية"} className="cursor-help hover:text-(--app-info) font-bold">
            {restLabel}
          </span>
        );
      },
    },
    {
      header: "الأدوية المصروفة",
      accessor: "dispensedMedicines",
      minWidth: hasLongDiagnosis,
      render: (val) => {
        const dispensed = val as DispensedMedicine[];
        if (dispensed.length === 0) return "لا يوجد";

        const label = dispensed.length === 1
          ? "دواء واحد"
          : dispensed.length === 2
            ? "دواءين"
            : `${dispensed.length} أدوية`;

        const tooltipText = dispensed
          .map((m) => `${m.medicineName || "دواء غير معروف"} (الكمية: ${m.quantity})`)
          .join("\n");

        return (
          <span title={tooltipText} className="cursor-help hover:text-(--app-info) font-bold">
            {label}
          </span>
        );
      },
    },
    ...(permissions === "edit" ? [{
      header: "الإجراءات",
      minWidth: hasLongDiagnosis,
      render: (_: unknown, row: VisitSummary) => (
        <button
          type="button"
          onClick={() => setSelectedVisitId(row._id)}
          className="text-xs font-bold text-(--app-info) hover:underline cursor-pointer border-none bg-transparent"
        >
          تعديل
        </button>
      )
    }] : [])
  ];

  return (
    <>
      <MainTable
        columns={columns}
        data={visits}
        showSerialNumber
        emptyTitle={emptyTitle}
        emptyDescription={emptyDescription}
        emptyIcon={Activity}
      />
      {selectedVisitId && (
        <EditVisitModal
          visitId={selectedVisitId}
          onClose={() => setSelectedVisitId(null)}
        />
      )}
      {viewVisitId && (
        <ViewVisitModal
          visitId={viewVisitId}
          onClose={() => setViewVisitId(null)}
        />
      )}
    </>
  );
}
