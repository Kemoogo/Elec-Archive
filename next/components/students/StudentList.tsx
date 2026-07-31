"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import MainTable from "@/components/ui/Table";
import { Paginator } from "@/components/ui/paginator";

interface SerializedStudent {
  _id: string;
  studentId: string;
  fullName: string;
  enrollDate: string;
  status: string;
  documents: { name: string; fileUrl: string; uploadedAt: string }[];
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

interface StudentListProps {
  students: SerializedStudent[];
  page: number;
  totalPages: number;
  total: number;
}

const statusLabels: Record<string, string> = {
  active: "نشط",
  graduated: "متخرج",
  inactive: "موقف",
  withdrawn: "منسحب",
};

const statusColors: Record<string, string> = {
  active: "bg-(--app-success)/20 text-(--app-success) border-(--app-success)/30",
  graduated: "bg-(--app-info)/20 text-(--app-info) border-(--app-info)/30",
  inactive: "bg-(--app-border) text-(--app-muted-foreground) border-(--app-border)",
  withdrawn: "bg-(--app-error)/20 text-(--app-error) border-(--app-error)/30",
};

export function StudentList({
  students,
  page,
  totalPages,
  total,
}: StudentListProps) {
  const router = useRouter();
  const [isPending] = useTransition();

  return (
    <div className="space-y-4" dir="rtl">
      {/* Results count */}
      <p className="text-sm text-(--app-muted-foreground)">
        إجمالي {total} طالب
      </p>

      {/* Table */}
      <MainTable
        showSerialNumber
        onRowClick={(row) => router.push(`/students/${row._id}`)}
        emptyTitle="لا توجد نتائج"
        emptyDescription="لم يتم العثور على أي طلبة يطابقون معايير البحث الحالية"
        isLoading={isPending}
        columns={[
          {
            header: "رقم الطالب",
            accessor: "studentId",
            tdClassName: "text-sm font-mono text-(--app-muted-foreground)",
          },
          {
            header: "الاسم الكامل",
            accessor: "fullName",
            tdClassName: "font-medium text-(--color-primary)",
          },
          {
            header: "تاريخ التسجيل",
            accessor: "enrollDate",
            tdClassName: "text-(--app-muted-foreground)",
            render: (val) => new Date(val as string).toLocaleDateString("ar-EG"),
          },
          {
            header: "الحالة",
            accessor: "status",
            render: (val) => (
              <span
                className={`inline-block rounded-full px-3 py-1 text-xs font-medium border ${
                  statusColors[val as string] ?? statusColors.active
                }`}
              >
                {statusLabels[val as string] ?? val}
              </span>
            ),
          },
        ]}
        data={students}
      />

      {/* Pagination */}
      <Paginator page={page} totalPages={totalPages} total={total} />
    </div>
  );
}
