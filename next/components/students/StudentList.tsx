"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import MainTable from "@/components/ui/Table";
import { Paginator } from "@/components/ui/paginator";
import { formatDateDisplay } from "@/lib/utils/date-display";

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
  active: "bg-(--app-surface-container) text-(--app-muted-foreground) border border-(--app-border)",
  graduated: "bg-(--app-surface-container) text-(--app-muted-foreground) border border-(--app-border)",
  inactive: "bg-(--app-surface-container) text-(--app-muted-foreground) border border-(--app-border)",
  withdrawn: "bg-(--app-surface-container) text-(--app-muted-foreground) border border-(--app-border)",
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
      <p className="text-sm font-bold text-(--app-muted-foreground)">
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
            tdClassName: "text-xs font-mono text-(--app-muted-foreground)",
          },
          {
            header: "الاسم الكامل",
            accessor: "fullName",
            tdClassName: "font-black text-xs text-(--color-primary) hover:underline hover:text-(--app-info)",
          },
          {
            header: "تاريخ التسجيل",
            accessor: "enrollDate",
            tdClassName: "text-xs font-mono text-(--app-muted-foreground)",
            render: (val) => formatDateDisplay(val as string),
          },
          {
            header: "الحالة",
            accessor: "status",
            render: (val) => (
              <span
                className={`inline-block rounded-full px-3 py-1 text-xs font-bold border ${
                  statusColors[val as string] ?? "bg-(--app-surface-container) text-(--app-muted-foreground) border-(--app-border)"
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
