"use client";

import MainTable, { TableColumn } from "@/components/ui/Table";
import Link from "next/link";
import { formatDateDisplay } from "@/lib/utils/date-display";

interface FaxItem {
  _id: string;
  faxNumber: string;
  date: string;
  fromEntity: string;
  subject: string;
  status: "pending" | "forwarded" | "closed";
  uploadedBy: { _id: string; fullName: string };
  createdAt: string;
}

interface FaxTableProps {
  faxes: FaxItem[];
}

const statusLabels: Record<string, string> = {
  pending: "معلق",
  forwarded: "موجّه",
  closed: "مغلق",
};

const statusColors: Record<string, string> = {
  pending: "bg-(--app-surface-container) text-(--app-muted-foreground) border border-(--app-border)",
  forwarded: "bg-(--app-surface-container) text-(--app-muted-foreground) border border-(--app-border)",
  closed: "bg-(--app-surface-container) text-(--app-muted-foreground) border border-(--app-border)",
};

export function FaxTable({ faxes }: FaxTableProps) {
  const columns: TableColumn<FaxItem>[] = [
    {
      header: "رقم الفاكس",
      accessor: "faxNumber",
      render: (val, row) => (
        <Link href={`/fax/${row._id}`} className="font-mono text-xs font-bold text-(--app-muted-foreground) hover:underline hover:text-(--app-info)">
          {val as string}
        </Link>
      ),
    },
    {
      header: "التاريخ",
      accessor: "date",
      render: (val) => <span className="font-mono text-xs text-(--app-muted-foreground)">{formatDateDisplay(val as string)}</span>,
    },
    {
      header: "الجهة المرسِلة",
      accessor: "fromEntity",
    },
    {
      header: "الموضوع",
      accessor: "subject",
      render: (val, row) => (
        <Link href={`/fax/${row._id}`} className="font-black text-xs text-(--color-primary) hover:underline hover:text-(--app-info) transition-colors">
          {val as string}
        </Link>
      ),
    },
    {
      header: "الحالة",
      accessor: "status",
      render: (val) => (
        <span
          className={`inline-block rounded-full px-3 py-1 text-xs font-bold border ${statusColors[val as string] || "bg-(--app-surface-container) text-(--app-muted-foreground) border-(--app-border)"}`}
        >
          {statusLabels[val as string]}
        </span>
      ),
    },
    {
      header: "رفعه",
      accessor: "uploadedBy.fullName",
      render: (_, row) => <span className="text-xs font-bold text-(--app-muted-foreground)">{row.uploadedBy?.fullName || "ـ"}</span>,
    },
  ];

  return (
    <div className="space-y-4">
      <MainTable
        columns={columns}
        data={faxes}
        showSerialNumber
        emptyTitle="لا توجد فاكسات"
        emptyDescription="لم يتم العثور على أي فاكسات بعد"
      />
    </div>
  );
}
