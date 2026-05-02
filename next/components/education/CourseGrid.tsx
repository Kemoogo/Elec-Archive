"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import { CourseCard } from "./CourseCard";

interface CourseGridProps {
  courses: {
    _id: string;
    title: string;
    description?: string;
    startDate: string;
    endDate: string;
    status: string;
    participantModel: string;
    participantCount: number;
  }[];
  page: number;
  totalPages: number;
  total: number;
}

export function CourseGrid({ courses, page, totalPages, total }: CourseGridProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  function handlePageChange(newPage: number) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", String(newPage));
    startTransition(() => {
      router.push(`/education?${params.toString()}`);
    });
  }

  return (
    <div className="space-y-4" dir="rtl">
      <p className="text-sm text-(--app-muted-foreground)">إجمالي {total} دورة</p>

      {courses.length === 0 ? (
        <div className="rounded-lg border border-(--app-border) p-8 text-center text-(--app-muted-foreground)">
          لا توجد دورات
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {courses.map((course) => (
            <CourseCard key={course._id} course={course} />
          ))}
        </div>
      )}

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
