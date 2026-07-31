"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { OfficersTable, getMissingFields } from "@/components/officers/OfficersTable";
import { PageContainer } from "@/components/layout/PageContainer";
import { ModernPageHeader as PageHeader, SecondaryHeaderBtn } from "@/components/layout/ModernPageHeader";
import { Shield, AlertTriangle, Filter } from "lucide-react";
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
  const [statusFilter] = useState(initialStatus);
  const [showAll, setShowAll] = useState(initialShowAll);

  const incompleteCount = officers.filter((o) => getMissingFields(o).length > 0).length;

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
            {incompleteCount > 0 && (
              <span className="px-3 py-1.5 rounded-xl text-xs font-black bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 flex items-center gap-1.5 shrink-0" title="عدد السجلات ذات البيانات غير المكتملة بهذه الصفحة">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-500 animate-pulse" />
                <span>{incompleteCount} غير مكتمل</span>
              </span>
            )}
            <SecondaryHeaderBtn
              label={showAll ? "كل الضباط" : "الضباط بالوحدة"}
              icon={<Filter className="w-4 h-4" />}
              onClick={toggleShowAll}
            />
            {canEdit && <OfficerForm mode="create" />}
          </div>
        }
      />

      <OfficersTable officers={officers} page={page} totalPages={totalPages} total={total} canEdit={canEdit} />
    </PageContainer>
  );
}
