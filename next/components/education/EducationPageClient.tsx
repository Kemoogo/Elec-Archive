"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { CourseGrid } from "@/components/education/CourseGrid";
import { CourseForm } from "@/components/education/CourseForm";
import { PageContainer } from "@/components/layout/PageContainer";
import { ModernPageHeader as PageHeader } from "@/components/layout/ModernPageHeader";
import { BookOpen } from "lucide-react";
import type { ICourse } from "@/lib/db/models/Course";

interface EducationPageClientProps {
  courses: any[];
  total: number;
  totalPages: number;
  page: number;
  canEdit: boolean;
  initialFilters: {
    search?: string;
    status?: string;
  };
}

export function EducationPageClient({
  courses,
  total,
  totalPages,
  page,
  canEdit,
  initialFilters,
}: EducationPageClientProps) {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState(initialFilters.search || "");
  const [statusFilter, setStatusFilter] = useState(initialFilters.status || "");

  const applyFilters = useCallback(
    (updates: Record<string, string>) => {
      const params = new URLSearchParams();
      const current = {
        search: searchQuery,
        status: statusFilter,
        ...updates,
      };

      if (current.search) params.set("search", current.search);
      if (current.status) params.set("status", current.status);
      params.set("page", "1");

      router.push(`/education?${params.toString()}`);
    },
    [router, searchQuery, statusFilter]
  );

  const handleSearchChange = (query: string) => {
    setSearchQuery(query);
    applyFilters({ search: query });
  };

  const handleStatusChange = (status: string) => {
    setStatusFilter(status);
    applyFilters({ status });
  };

  return (
    <PageContainer className="max-w-[1600px] mx-auto pb-12">
      <PageHeader
        title="التعليم والدورات"
        description="إدارة الدورات والتدريبات"
        icon={<BookOpen className="w-6 h-6" />}
        showSearch
        searchQuery={searchQuery}
        onSearchChange={handleSearchChange}
        action={
          <div className="flex items-center gap-2">
            <select
              value={statusFilter}
              onChange={(e) => handleStatusChange(e.target.value)}
              className="px-4 py-2 rounded-xl text-sm font-bold transition-all bg-slate-100 text-(--color-primary) hover:bg-slate-200 focus:outline-none   appearance-none cursor-pointer"
            >
              <option value="all">جميع الحالات</option>
              <option value="upcoming">قادمة</option>
              <option value="ongoing">جارية</option>
              <option value="completed">مكتملة</option>
            </select>
            {canEdit && <CourseForm mode="create" />}
          </div>
        }
      />
      <CourseGrid
        courses={courses}
        page={page}
        totalPages={totalPages}
        total={total}
      />
    </PageContainer>
  );
}
