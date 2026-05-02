"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { StudentList } from "@/components/students/StudentList";
import { StudentForm } from "@/components/students/StudentForm";
import { PageContainer } from "@/components/layout/PageContainer";
import { ModernPageHeader as PageHeader } from "@/components/layout/ModernPageHeader";
import { GraduationCap } from "lucide-react";
import type { IStudent } from "@/lib/db/models/Student";

interface StudentsPageClientProps {
  students: any[];
  total: number;
  totalPages: number;
  page: number;
  canEdit: boolean;
  initialFilters: {
    search?: string;
    status?: string;
  };
}

export function StudentsPageClient({
  students,
  total,
  totalPages,
  page,
  canEdit,
  initialFilters,
}: StudentsPageClientProps) {
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

      router.push(`/students?${params.toString()}`);
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
        title="شئون الطلبة"
        description="إدارة سجلات الطلبة وملفاتهم"
        icon={<GraduationCap className="w-6 h-6" />}
        showSearch
        searchQuery={searchQuery}
        onSearchChange={handleSearchChange}
        action={
          <div className="flex items-center gap-2">
            <select
              value={statusFilter}
              onChange={(e) => handleStatusChange(e.target.value)}
              className="px-4 py-2 rounded-xl text-sm font-bold transition-all bg-slate-100 text-(--color-primary) hover:bg-slate-200 focus:outline-none appearance-none cursor-pointer"
            >
              <option value="all">جميع السجلات</option>
              <option value="active">الطلبة الفعليون</option>
              <option value="graduated">الخريجون</option>
              <option value="dismissed">المنتهية خدمتهم</option>
            </select>
            {canEdit && <StudentForm mode="create" />}
          </div>
        }
      />

      <StudentList
        students={students}
        page={page}
        totalPages={totalPages}
        total={total}
      />
    </PageContainer>
  );
}
