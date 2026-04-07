"use client";

import MainTable, { TableColumn } from "@/components/ui/Table";

interface DispensedMedicine {
  medicineId: string;
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
}

interface VisitTableProps {
  visits: VisitSummary[];
}

export function VisitTable({ visits }: VisitTableProps) {
  const columns: TableColumn<VisitSummary>[] = [
    {
      header: "رقم المريض",
      accessor: "patientId",
      tdClassName: "font-mono text-sm text-(--app-muted-foreground)",
    },
    {
      header: "اسم المريض",
      accessor: "patientName",
      className: "font-medium text-(--color-primary)",
    },
    {
      header: "تاريخ الزيارة",
      accessor: "visitDate",
      tdClassName: "text-(--app-muted-foreground)",
      render: (val) => new Date(val as string).toLocaleDateString("ar"),
    },
    {
      header: "التشخيص",
      accessor: "diagnosis",
      tdClassName: "text-(--app-muted-foreground)",
    },
    {
      header: "الأدوية المصروفة",
      accessor: "dispensedMedicines",
      tdClassName: "text-(--app-muted-foreground)",
      render: (val) => {
        const dispensed = val as DispensedMedicine[];
        return dispensed.length === 0 ? "لا يوجد" : `${dispensed.length} دواء`;
      },
    },
  ];

  return (
    <MainTable 
      columns={columns} 
      data={visits} 
      showSerialNumber 
    />
  );
}
