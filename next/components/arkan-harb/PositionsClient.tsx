"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PositionAssignmentTable, type Position } from "./PositionAssignmentTable";
import { PositionAssignmentForm } from "./PositionAssignmentForm";
import { Button } from "@/components/ui/button";
import { Plus, Shield } from "lucide-react";
import { PageHeader } from "@/components/layout/ModernPageHeader";

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
}: PositionsClientProps) {
  const router = useRouter();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedPosition, setSelectedPosition] = useState<Position | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Reset loading state when new data arrives
  if (isLoading && initialPositions) {
    setIsLoading(false);
  }

  const updateFilters = (newFilters: Record<string, string | number>) => {
    setIsLoading(true);
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
      <PageHeader
        title="التنظيم الإداري والوظائف"
        description={`إدارة التعيينات الوظيفية الأساسية والبديلة للضباط (${total})`}
        icon={<Shield className="w-6 h-6" />}
        backHref="/arkan-harb"
        backLabel="العودة لأركان الحرب"
        showSearch
        searchQuery={officerFilter}
        onSearchChange={(query) => updateFilters({ officerId: query, page: 1 })}
        searchPlaceholder="بحث بمعرف الضابط..."
        action={
          <div className="flex items-center gap-2">
            <select
              value={statusFilter}
              onChange={(e) => updateFilters({ status: e.target.value, page: 1 })}
              className="px-4 py-2 rounded-xl text-sm font-bold transition-all bg-slate-100 text-(--color-primary) hover:bg-slate-200 focus:outline-none   appearance-none cursor-pointer"
            >
              <option value="">كل الحالات</option>
              <option value="active">نشطة</option>
              <option value="historical">سابقة</option>
            </select>
            {canEdit && (
              <Button 
                onClick={handleCreate}
                className="h-9 px-4 rounded-xl bg-(--color-primary) text-white font-black shadow-lg shadow-blue-900/10 hover:shadow-blue-900/20 active:scale-95 transition-all flex items-center gap-2 text-xs"
              >
                <Plus className="h-4 w-4" />
                إضافة تعيين
              </Button>
            )}
          </div>
        }
      />

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
        isLoading={isLoading}
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
