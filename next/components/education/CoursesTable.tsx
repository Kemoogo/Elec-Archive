"use client";

import Link from "next/link";
import MainTable, { type TableColumn } from "@/components/ui/Table";
import { Paginator } from "@/components/ui/paginator";
import { BookOpen } from "lucide-react";

interface CourseRow {
  _id: string;
  title: string;
  startDate: string;
  endDate: string;
  status: string;
  participantModel: string;
  participantCount: number;
}

interface CoursesTableProps {
  courses: CourseRow[];
  page: number;
  totalPages: number;
  total: number;
}

const statusLabels: Record<string, string> = {
  upcoming: "قادمة",
  ongoing: "جارية",
  completed: "منتهية",
};

const statusColors: Record<string, string> = {
  upcoming: "bg-(--app-info)/20 text-(--app-info) border-(--app-info)/30",
  ongoing: "bg-(--app-success)/20 text-(--app-success) border-(--app-success)/30",
  completed: "bg-(--app-border) text-(--app-muted-foreground) border-(--app-border)",
};

const modelLabels: Record<string, string> = {
  Officer: "ضباط",
  Student: "طلبة",
};

export function CoursesTable({ courses, page, totalPages, total }: CoursesTableProps) {
  const columns: TableColumn<CourseRow>[] = [
    {
      header: "عنوان الدورة",
      accessor: "title",
      render: (val, row) => (
        <Link href={`/education/${row._id}`} className="hover:underline hover:text-(--app-info) cursor-pointer font-medium text-(--color-primary)">
          {val as string}
        </Link>
      ),
    },
    {
      header: "تاريخ البداية",
      accessor: "startDate",
      render: (val) => <span className="font-mono">{new Date(val as string).toLocaleDateString("ar-EG")}</span>,
    },
    {
      header: "تاريخ الانتهاء",
      accessor: "endDate",
      render: (val) => <span className="font-mono">{new Date(val as string).toLocaleDateString("ar-EG")}</span>,
    },
    {
      header: "الحالة",
      accessor: "status",
      render: (val) => (
        <span
          className={`inline-block rounded-full border px-3 py-1 text-xs font-medium ${
            statusColors[val as string] ?? statusColors.upcoming
          }`}
        >
          {statusLabels[val as string] ?? val}
        </span>
      ),
    },
    {
      header: "نوع المشاركين",
      accessor: "participantModel",
      minWidth: true,
      render: (val) => modelLabels[val as string] ?? val,
    },
    {
      header: "عدد المشاركين",
      accessor: "participantCount",
      isNumeric: true,
      minWidth: true,
    },
  ];

  return (
    <div className="space-y-4">
      <MainTable
        columns={columns}
        data={courses}
        showSerialNumber
        emptyTitle="لا توجد دورات"
        emptyDescription="لم يتم العثور على أي دورات تدريبية تطابق معايير البحث"
        emptyIcon={BookOpen}
      />

      <Paginator page={page} totalPages={totalPages} total={total} />
    </div>
  );
}
