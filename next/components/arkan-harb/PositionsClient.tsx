"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PositionAssignmentTable, type Position } from "./PositionAssignmentTable";
import { PositionAssignmentForm } from "./PositionAssignmentForm";
import { Plus, Shield, ChevronDown } from "lucide-react";
import { PageHeader, PrimaryHeaderBtn } from "@/components/layout/ModernPageHeader";

interface OfficerOption {
  id: string;
  name: string;
  rank: string;
  militaryId: string;
}

interface PositionsClientProps {
  initialPositions: Position[];
  officers: OfficerOption[];
  total: number;
  page: number;
  limit: number;
  officerFilter: string;
  statusFilter: string;
  canEdit: boolean;
  hideHeader?: boolean;
}

export function PositionsClient({
  initialPositions,
  officers,
  total,
  page,
  limit,
  officerFilter,
  statusFilter,
  canEdit,
  hideHeader = false,
}: PositionsClientProps) {
  const router = useRouter();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedPosition, setSelectedPosition] = useState<Position | null>(null);

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
    setSelectedPosition(null);
    setIsModalOpen(true);
  };

  const handleEdit = (position: Position) => {
    setSelectedPosition(position);
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
          title="التنظيم الإداري والوظائف"
          icon={<Shield className="w-6 h-6" />}
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
                  <option value="active">نشطة</option>
                  <option value="historical">سابقة</option>
                </select>
                <ChevronDown className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-(--app-muted-foreground) pointer-events-none" />
              </div>
              {canEdit && (
                <PrimaryHeaderBtn
                  label="إضافة تعيين"
                  icon={<Plus className="w-4 h-4" />}
                  onClick={handleCreate}
                />
              )}
            </div>
          }
        />
      )}

      <PositionAssignmentTable
        positions={initialPositions}
        officers={officers}
        total={total}
        page={page}
        limit={limit}
        officerFilter={officerFilter}
        statusFilter={statusFilter}
        onPageChange={(p) => updateFilters({ page: p })}
        onLimitChange={(l) => updateFilters({ limit: l, page: 1 })}
        onOfficerFilterChange={(o) => updateFilters({ officerId: o, page: 1 })}
        onStatusFilterChange={(s) => updateFilters({ status: s, page: 1 })}
        onEditPosition={handleEdit}
      />

      <PositionAssignmentForm
        position={selectedPosition}
        officers={officers}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSave}
      />
    </div>
  );
}
