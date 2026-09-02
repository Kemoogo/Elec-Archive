"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { MissionsTable, type Mission } from "./MissionsTable";
import { MissionForm } from "./MissionForm";
import { Plus, FileText, ChevronDown } from "lucide-react";
import { PageHeader, PrimaryHeaderBtn } from "@/components/layout/ModernPageHeader";

interface OfficerOption {
  id: string;
  fullName: string;
  militaryId: string;
  rank?: string;
  officerLabel?: string;
}

interface MissionsClientProps {
  initialMissions: Mission[];
  total: number;
  page: number;
  limit: number;
  officerFilter: string;
  statusFilter: string;
  canEdit: boolean;
  isAdmin?: boolean;
  hideHeader?: boolean;
  officers?: OfficerOption[];
}

export function MissionsClient({
  initialMissions,
  total,
  page,
  limit,
  officerFilter,
  statusFilter,
  canEdit,
  isAdmin = false,
  hideHeader = false,
  officers,
}: MissionsClientProps) {
  const router = useRouter();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedMission, setSelectedMission] = useState<Mission | null>(null);
  const updateFilters = (newFilters: Record<string, string | number>) => {
    const params = new URLSearchParams(window.location.search);
    
    Object.entries(newFilters).forEach(([key, value]) => {
      if (value) params.set(key, value.toString());
      else params.delete(key);
    });

    if (!newFilters.page) params.set("page", "1"); // Reset to page 1 on filter change
    
    router.push(`?${params.toString()}`);
  };

  const handleCreate = () => {
    setSelectedMission(null);
    setIsModalOpen(true);
  };

  const handleEdit = (mission: Mission) => {
    setSelectedMission(mission);
    setIsModalOpen(true);
  };

  const handleSave = () => {
    setIsModalOpen(false);
    router.refresh();
  };

  return (
    <div className="space-y-6">
      {!hideHeader && (
        <PageHeader
          title="سجل المأموريات"
          icon={<FileText className="w-6 h-6" />}
          backHref="/arkan-harb"
          backLabel="أركان الحرب"
          showSearch
          searchQuery={officerFilter}
          onSearchChange={(query) => updateFilters({ officerId: query, page: 1 })}
          searchPlaceholder="بحث بمعرف الضابط..."
          action={
            <div className="flex items-center gap-2">
              <div className="relative">
                <select
                  value={statusFilter}
                  onChange={(e) => updateFilters({ status: e.target.value, page: 1 })}
                  className="px-3.5 py-2 bg-(--app-surface) border border-(--app-border) rounded-xl text-xs font-bold text-(--app-foreground) focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all appearance-none cursor-pointer pr-3 pl-8 shadow-xs"
                >
                  <option value="">كل الحالات</option>
                  <option value="scheduled">مجدولة</option>
                  <option value="active">نشطة</option>
                  <option value="completed">مكتملة</option>
                  <option value="postponed">مؤجلة</option>
                  <option value="cancelled">ملغاة</option>
                </select>
                <ChevronDown className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-(--app-muted-foreground) pointer-events-none" />
              </div>
              {canEdit && (
                <PrimaryHeaderBtn
                  label="إضافة مأمورية"
                  icon={<Plus className="w-4 h-4" />}
                  onClick={handleCreate}
                />
              )}
            </div>
          }
        />
      )}

      <MissionsTable
        missions={initialMissions}
        total={total}
        page={page}
        limit={limit}
        isAdmin={isAdmin}
        officerFilter={officerFilter}
        statusFilter={statusFilter}
        onPageChange={(p) => updateFilters({ page: p })}
        onLimitChange={(l) => updateFilters({ limit: l, page: 1 })}
        onOfficerFilterChange={(o) => updateFilters({ officerId: o, page: 1 })}
        onStatusFilterChange={(s) => updateFilters({ status: s, page: 1 })}
        onEditMission={handleEdit}
      />

      <MissionForm
        mission={selectedMission}
        officers={officers}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSave}
      />
    </div>
  );
}
