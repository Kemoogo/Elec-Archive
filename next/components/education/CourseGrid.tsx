"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";
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
  const [search, setSearch] = useState(searchParams.get("search") ?? "");
  const [status, setStatus] = useState(searchParams.get("status") ?? "");

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    const params = new URLSearchParams(searchParams.toString());
    params.set("search", search);
    params.set("page", "1");
    startTransition(() => {
      router.push(`/education?${params.toString()}`);
    });
  }

  function handleStatusChange(newStatus: string) {
    setStatus(newStatus);
    const params = new URLSearchParams(searchParams.toString());
    if (newStatus) {
      params.set("status", newStatus);
    } else {
      params.delete("status");
    }
    params.set("page", "1");
    startTransition(() => {
      router.push(`/education?${params.toString()}`);
    });
  }

  function handlePageChange(newPage: number) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", String(newPage));
    startTransition(() => {
      router.push(`/education?${params.toString()}`);
    });
  }

  return (
    <div className="space-y-4" dir="rtl">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <form onSubmit={handleSearch} className="flex gap-2">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="بحث بالعنوان..."
            className="w-64 rounded-md border border-(--app-border) bg-(--app-surface) px-3 py-2 text-sm text-(--app-white) placeholder:text-(--app-muted-foreground) focus:border-blue-500 focus:outline-none"
          />
          <button
            type="submit"
            className="rounded-md bg-(--app-accent) px-4 py-2 text-sm text-(--app-accent-foreground) font-medium hover:bg-(--app-accent)/90"
          >
            بحث
          </button>
        </form>
        <select
          value={status}
          onChange={(e) => handleStatusChange(e.target.value)}
          className="rounded-md border border-(--app-border) bg-(--app-surface) px-3 py-2 text-sm text-(--app-white)"
        >
          <option value="">القادمة والجارية</option>
          <option value="all">الكل</option>
          <option value="upcoming">قادمة</option>
          <option value="ongoing">جارية</option>
          <option value="completed">منتهية</option>
        </select>
      </div>

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
