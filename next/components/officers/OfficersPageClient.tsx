"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { OfficersTable } from "@/components/officers/OfficersTable";
import { PageContainer } from "@/components/layout/PageContainer";
import { ModernPageHeader as PageHeader } from "@/components/layout/ModernPageHeader";
import { Shield } from "lucide-react";
import { OfficerForm } from "@/components/officers/OfficerForm";
import type { OfficerListItem } from "@/lib/officers/queries";

interface OfficersPageClientProps {
  initialSearch: string;
  initialStatus: string;
  initialShowAll: boolean;
  officers: OfficerListItem[];
  page: number;
  totalPages: number;
  total: number;
  canEdit: boolean;
}

export function OfficersPageClient({
  initialSearch,
  initialStatus,
  initialShowAll,
  officers,
  page,
  totalPages,
  total,
  canEdit,
}: OfficersPageClientProps) {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState(initialSearch);
  const [statusFilter, setStatusFilter] = useState(initialStatus);
  const [showAll, setShowAll] = useState(initialShowAll);

  const applyFilters = useCallback(
    (search: string, status: string, all: boolean) => {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (status) params.set("status", status);
      if (all) params.set("all", "true");
      router.push(`/officers?${params.toString()}`);
    },
    [router],
  );

  const handleSearchChange = useCallback(
    (query: string) => {
      setSearchQuery(query);
      applyFilters(query, statusFilter, showAll);
    },
    [applyFilters, statusFilter, showAll],
  );

  const handleStatusChange = useCallback(
    (status: string) => {
      setStatusFilter(status);
      applyFilters(searchQuery, status, showAll);
    },
    [applyFilters, searchQuery, showAll],
  );

  const toggleShowAll = useCallback(() => {
    const nextShowAll = !showAll;
    setShowAll(nextShowAll);
    applyFilters(searchQuery, statusFilter, nextShowAll);
  }, [applyFilters, searchQuery, statusFilter, showAll]);

  return (
    <PageContainer className="max-w-[1600px] mx-auto pb-12">
      <PageHeader
        title="شئون الضباط"
        description="سجل الضباط، الترقيات، والتنقلات"
        icon={<Shield className="w-6 h-6" />}
        showSearch
        searchQuery={searchQuery}
        onSearchChange={handleSearchChange}
        action={
          <div className="flex items-center gap-2">
            <button
              onClick={toggleShowAll}
              className="px-4 py-2 rounded-xl text-sm font-bold transition-all bg-slate-100 text-(--color-primary) hover:bg-slate-200 focus:outline-none cursor-pointer text-center"
            >
              {showAll ? "كل الضباط" : "الضباط بالوحدة"}
            </button>
            {canEdit && <OfficerForm mode="create" />}
          </div>
        }
      />

      <OfficersTable officers={officers} page={page} totalPages={totalPages} total={total} canEdit={canEdit} />
    </PageContainer>
  );
}
