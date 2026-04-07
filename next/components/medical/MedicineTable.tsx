"use client";

import MainTable, { TableColumn } from "@/components/ui/Table";

interface MedicineSummary {
  _id: string;
  name: string;
  unit: string;
  quantity: number;
  expiryDate: string;
  minThreshold: number;
}

interface MedicineTableProps {
  medicines: MedicineSummary[];
  now: string;
}

export function MedicineTable({ medicines, now }: MedicineTableProps) {
  const currentDate = new Date(now);

  const columns: TableColumn<MedicineSummary>[] = [
    {
      header: "اسم الدواء",
      accessor: "name",
      className: "font-medium text-(--color-primary)",
    },
    {
      header: "الوحدة",
      accessor: "unit",
      tdClassName: "text-(--app-muted-foreground)",
    },
    {
      header: "الكمية",
      accessor: "quantity",
      tdClassName: "text-(--app-muted-foreground)",
    },
    {
      header: "تاريخ الصلاحية",
      accessor: "expiryDate",
      tdClassName: "text-(--app-muted-foreground)",
      render: (val) => new Date(val as string).toLocaleDateString("ar"),
    },
    {
      header: "الحد الأدنى",
      accessor: "minThreshold",
      tdClassName: "text-(--app-muted-foreground)",
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
  ];

  return (
    <MainTable 
      columns={columns} 
      data={medicines} 
      showSerialNumber 
    />
  );
}
