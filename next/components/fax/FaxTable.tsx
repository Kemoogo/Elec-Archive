"use client";

import MainTable, { TableColumn } from "@/components/ui/Table";
import Link from "next/link";

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
  pending: "bg-(--app-warning)/20 text-(--app-warning)",
  forwarded: "bg-(--app-info)/20 text-(--app-info)",
  closed: "bg-(--app-success)/20 text-(--app-success)",
};

export function FaxTable({ faxes }: FaxTableProps) {
  const columns: TableColumn<FaxItem>[] = [
    {
      header: "رقم الفاكس",
      accessor: "faxNumber",
      className: "font-medium text-(--color-primary)",
      render: (val, row) => (
        <Link href={`/fax/${row._id}`} className="hover:underline">
          {val as string}
        </Link>
      ),
    },
    {
      header: "التاريخ",
      accessor: "date",
      render: (val) => <span className="font-mono">{new Date(val as string).toLocaleDateString("ar-EG")}</span>,
    },
    {
      header: "الجهة المرسِلة",
      accessor: "fromEntity",
    },
    {
      header: "الموضوع",
      accessor: "subject",

    },
    {
      header: "الحالة",
      accessor: "status",
      render: (val) => (
        <span
          className={`inline-block rounded-full px-3 py-1 text-xs font-medium ${statusColors[val as string]}`}
        >
          {statusLabels[val as string]}
        </span>
      ),
    },
    {
      header: "رفعه",
      accessor: "uploadedBy.fullName",
      render: (_, row) => row.uploadedBy.fullName,
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
