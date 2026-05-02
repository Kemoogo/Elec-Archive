"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import MainTable from "@/components/ui/Table";

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
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  function handlePageChange(newPage: number) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", String(newPage));
    startTransition(() => {
      router.push(`/students?${params.toString()}`);
    });
  }

  return (
    <div className="space-y-4" dir="rtl">
      {/* Results count */}
      <p className="text-sm text-(--app-muted-foreground)">
        إجمالي {total} طالب
      </p>

      {/* Table */}
      {students.length === 0 ? (
        <div className="rounded-lg bg-(--app-surface) p-8 text-center text-(--app-muted-foreground)">
          لا توجد نتائج
        </div>
      ) : (
        <MainTable
          showSerialNumber
          onRowClick={(row) => router.push(`/students/${row._id}`)}
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
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2" dir="ltr">
          {page > 1 && (
            <button
              onClick={() => handlePageChange(page - 1)}
              disabled={isPending}
              className="rounded-md bg-(--app-surface) px-3 py-2 text-sm text-(--app-white) hover:bg-white/10 disabled:opacity-50"
            >
              السابق
            </button>
          )}
          <span className="text-sm text-(--app-muted-foreground)">
            صفحة {page} من {totalPages}
          </span>
          {page < totalPages && (
            <button
              onClick={() => handlePageChange(page + 1)}
              disabled={isPending}
              className="rounded-md bg-(--app-surface) px-3 py-2 text-sm text-(--app-white) hover:bg-white/10 disabled:opacity-50"
            >
              التالي
            </button>
          )}
        </div>
      )}
    </div>
  );
}
