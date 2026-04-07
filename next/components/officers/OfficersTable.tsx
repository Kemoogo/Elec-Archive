"use client";

import Link from "next/link";
import { compareSeniority } from "@/lib/officers/seniority";
import MainTable, { TableColumn } from "@/components/ui/Table";

interface OfficerListItem {
  id: string;
  militaryId: string;
  seniorityNumber: string;
  fullName: string;
  rank: string;
  rankLabel: string;
  batch: string;
  type: string;
  typeLabel: string;
  weapon: string;
  weaponLabel: string;
  phone: string;
}

interface OfficersTableProps {
  officers: OfficerListItem[];
  page: number;
  totalPages: number;
  total: number;
  canEdit: boolean;
}

export function OfficersTable({ officers, page, totalPages, total, canEdit }: OfficersTableProps) {
  // ترتيب الضباط وفق المنطق العسكري المتقدم
  const sortedOfficers = [...officers].sort((a, b) => compareSeniority(a.seniorityNumber, b.seniorityNumber));

  if (sortedOfficers.length === 0) {
    return (
      <div className="rounded-lg bg-(--app-surface) p-8 text-center text-(--app-muted-foreground)">
        لا توجد ضباط
      </div>
    );
  }

  const columns: TableColumn<OfficerListItem>[] = [
    {
      header: "أقدمية",
      accessor: "seniorityNumber",
      isNumeric: true
    },
    {
      header: "الرتبة",
      accessor: "rankLabel",
    },
    {
      header: "الأسم",
      accessor: "fullName",
      render: (val, row) => (
        <Link href={`/officers/${row.id}`} className="hover:underline hover:text-blue-600 cursor-pointer">
          {val as string}
        </Link>
      ),
    },
    {
      header: "الرقم العسكري",
      accessor: "militaryId",
      isNumeric: true
    },
    {
      header: "الدفعة",
      accessor: "batch",
      emptyValue: "---",
      isNumeric: true
    },
    {
      header: "رقم الموبايل",
      accessor: "phone",
      emptyValue: "---",
      isNumeric: true
    },
    {
      header: "التصنيف",
      accessor: "typeLabel",
      emptyValue: "---",
    },
    {
      header: "السلاح",
      accessor: "weaponLabel",
      emptyValue: "---",
    },
    {
      header: "الإجراءات",
      accessor: "id",
      cellAlign: "center",
      headerAlign: "center",
      minWidth: true,
      render: (_, row) => (
        <div className="flex items-center justify-center gap-2">
          <Link
            href={`/officers/${row.id}`}
            className="rounded-lg border border-(--app-border) px-3 py-1.5 text-xs font-bold text-(--color-primary) transition hover:bg-(--app-surface-container)"
          >
            {canEdit ? "عرض وتعديل" : "عرض"}
          </Link>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <MainTable
        columns={columns}
        data={sortedOfficers}
      // showSerialNumber 
      />


      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <span className="text-sm text-(--app-muted-foreground)">إجمالي: {total}</span>
          <div className="flex items-center gap-2" dir="ltr">
            <Link
              href={page > 1 ? `/officers?page=${page - 1}` : "#"}
              className={`rounded-md bg-(--app-surface) px-3 py-2 text-sm text-(--app-white) hover:bg-white/10 ${page <= 1 ? "opacity-30 pointer-events-none" : ""}`}
            >
              السابق
            </Link>
            <span className="text-sm text-(--app-muted-foreground)">صفحة {page} من {totalPages}</span>
            <Link
              href={page < totalPages ? `/officers?page=${page + 1}` : "#"}
              className={`rounded-md bg-(--app-surface) px-3 py-2 text-sm text-(--app-white) hover:bg-white/10 ${page >= totalPages ? "opacity-30 pointer-events-none" : ""}`}
            >
              التالي
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
