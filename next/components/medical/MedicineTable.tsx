"use client";

import { useState } from "react";
import MainTable, { TableColumn } from "@/components/ui/Table";
import { RestockButton } from "@/components/medical/RestockButton";
import { EditMedicineButton } from "@/components/medical/EditMedicineButton";
import { MedicineDetailModal } from "@/components/medical/MedicineDetailModal";

interface MedicineSummary {
  _id: string;
  name: string;
  unit: string;
  concentration: string;
  quantity: number;
  expiryDate: string;
  minThreshold: number;
}

interface MedicineTableProps {
  medicines: MedicineSummary[];
  now: string;
  emptyTitle?: string;
  emptyDescription?: string;
}

import { Pill } from "lucide-react";

export function MedicineTable({ medicines, now, emptyTitle, emptyDescription }: MedicineTableProps) {
  const currentDate = new Date(now);
  const [selectedMedicineId, setSelectedMedicineId] = useState<string | null>(null);

  const columns: TableColumn<MedicineSummary>[] = [
    {
      header: "اسم الدواء",
      accessor: "name",
      className: "text-(--color-primary)",
      render: (val, med) => (
        <button
          onClick={() => setSelectedMedicineId(med._id)}
          className="text-right font-bold text-(--color-primary) hover:underline hover:text-(--app-info) cursor-pointer transition-all"
        >
          {val as string}
        </button>
      ),
    },
    {
      header: "التركيز",
      minWidth: true,
      accessor: "concentration",
      render: (val) => (val as string) || "-",
    },
    {
      header: "الوحدة",
      minWidth: true,
      accessor: "unit",
    },
    {
      header: "الكمية المتوفرة",
      accessor: "quantity",
      isNumeric: true,
      minWidth: true,
      headerAlign: "center",
      cellAlign: "center",
    },
    {
      header: "تاريخ الانتهاء",
      accessor: "expiryDate",
      isNumeric: true,
      cellAlign: "center",
      render: (val) => new Date(val as string).toLocaleDateString("ar-EG"),
    },
    {
      header: "الحد الأدنى",
      accessor: "minThreshold",
      headerAlign: "center",
      isNumeric: true,
      minWidth: true,

    },
    {
      header: "الحالة",
      render: (_, med) => {
        const isLowStock = med.quantity < med.minThreshold;
        const isExpired = new Date(med.expiryDate) < currentDate;
        return (
          <div className="flex gap-1">
            {isExpired && (
              <span className="bg-(--app-error)/20 text-(--app-error) px-2 py-1 rounded text-xs">
                منتهي الصلاحية
              </span>
            )}
            {isLowStock && !isExpired && (
              <span className="bg-(--app-warning)/20 text-(--app-warning) px-2 py-1 rounded text-xs">
                مخزون منخفض
              </span>
            )}
            {!isLowStock && !isExpired && (
              <span className="bg-(--app-success)/20 text-(--app-success) px-2 py-1 rounded text-xs">
                متوفر
              </span>
            )}
          </div>
        );
      },
    },
    {
      header: "الإجراءات",
      className: "w-24 text-center",
      tdClassName: "text-center",
      render: (_, med) => (
        <div className="flex items-center justify-center gap-2">
          <RestockButton medicineId={med._id} medicineName={med.name} />
          <EditMedicineButton medicine={med} />
        </div>
      ),
    },
  ];

  return (
    <>
      <MainTable
        columns={columns}
        data={medicines}
        showSerialNumber
        emptyTitle={emptyTitle}
        emptyDescription={emptyDescription}
        emptyIcon={Pill}
      />

      {selectedMedicineId && (
        <MedicineDetailModal
          medicineId={selectedMedicineId}
          onClose={() => setSelectedMedicineId(null)}
        />
      )}
    </>
  );
}
