"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PositionAssignmentTable, type Position } from "./PositionAssignmentTable";
import { PositionAssignmentForm } from "./PositionAssignmentForm";
import { Button } from "@/components/ui/button";
import { Plus, Building } from "lucide-react";
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
        description="إدارة التعيينات الوظيفية الأساسية والبديلة للضباط"
        icon={<Building className="w-6 h-6" />}
        backHref="/arkan-harb"
        backLabel="العودة لأركان الحرب"
      >
        {canEdit && (
          <Button 
            onClick={handleCreate}
            className="h-11 px-6 rounded-xl bg-(--color-primary) text-white font-black shadow-lg shadow-blue-900/10 hover:shadow-blue-900/20 active:scale-95 transition-all flex items-center gap-2"
          >
            <Plus className="h-5 w-5" />
            إضافة تعيين وظيفي
          </Button>
        )}
      </PageHeader>

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
