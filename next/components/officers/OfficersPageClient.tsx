"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { OfficersTable } from "@/components/officers/OfficersTable";
import { PageContainer } from "@/components/layout/PageContainer";
import { ModernPageHeader as PageHeader } from "@/components/layout/ModernPageHeader";
import { Users } from "lucide-react";
import { OfficerForm } from "@/components/officers/OfficerForm";

interface OfficersPageClientProps {
  initialSearch: string;
  initialStatus: string;
  officers: Array<{
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
  }>;
  page: number;
  totalPages: number;
  total: number;
  canEdit: boolean;
}

export function OfficersPageClient({
  initialSearch,
  initialStatus,
  officers,
  page,
  totalPages,
  total,
  canEdit,
}: OfficersPageClientProps) {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState(initialSearch);
  const [statusFilter, setStatusFilter] = useState(initialStatus);

  const applyFilters = useCallback(
    (search: string, status: string) => {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (status) params.set("status", status);
      router.push(`/officers?${params.toString()}`);
    },
    [router],
  );

  const handleSearchChange = useCallback(
    (query: string) => {
      setSearchQuery(query);
      applyFilters(query, statusFilter);
    },
    [applyFilters, statusFilter],
  );

  const handleStatusChange = useCallback(
    (status: string) => {
      setStatusFilter(status);
      applyFilters(searchQuery, status);
    },
    [applyFilters, searchQuery],
  );

  return (
    <PageContainer className="max-w-[1600px] mx-auto pb-12">
      <PageHeader
        title="شئون الضباط"
        description="سجل الضباط، الترقيات، والتنقلات"
        icon={<Users className="w-6 h-6" />}
        showSearch
        searchQuery={searchQuery}
        onSearchChange={handleSearchChange}
        action={
          <div className="flex items-center gap-2">
            <select
              value={statusFilter}
              onChange={(e) => handleStatusChange(e.target.value)}
              className="rounded-xl border border-(--app-border) bg-(--app-surface-container) px-3 py-2 text-xs font-bold text-(--color-primary) focus:outline-none focus:ring-2 focus:ring-(--color-primary)/20 transition-all appearance-none cursor-pointer"
            >
              <option value="">جميع السجلات</option>
              <option value="active">القوة النشطة</option>
              <option value="inactive">القوة غير النشطة</option>
              <option value="retired">المحالون للتقاعد</option>
            </select>
            {canEdit && <OfficerForm mode="create" />}
          </div>
        }
      />

      <OfficersTable officers={officers} page={page} totalPages={totalPages} total={total} canEdit={canEdit} />
    </PageContainer>
  );
}
