"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { MissionsTable, type Mission } from "./MissionsTable";
import { MissionForm } from "./MissionForm";
import { Button } from "@/components/ui/button";
import { Plus, Shield } from "lucide-react";
import { PageHeader } from "@/components/layout/ModernPageHeader";

interface MissionsClientProps {
  initialMissions: Mission[];
  total: number;
  page: number;
  limit: number;
  officerFilter: string;
  statusFilter: string;
  canEdit: boolean;
}

export function MissionsClient({
  initialMissions,
  total,
  page,
  limit,
  officerFilter,
  statusFilter,
  canEdit,
}: MissionsClientProps) {
  const router = useRouter();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedMission, setSelectedMission] = useState<Mission | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Reset loading state when new data arrives
  if (isLoading && initialMissions) {
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
      <PageHeader
        title="سجل المأموريات"
        description="إدارة ومتابعة مأموريات الضباط والمهام الخارجية"
        icon={<Shield className="w-6 h-6" />}
        backHref="/arkan-harb"
        backLabel="العودة لأركان الحرب"
      >
        {canEdit && (
          <Button 
            onClick={handleCreate}
            className="h-11 px-6 rounded-xl bg-(--color-primary) text-white font-black shadow-lg shadow-blue-900/10 hover:shadow-blue-900/20 active:scale-95 transition-all flex items-center gap-2"
          >
            <Plus className="h-5 w-5" />
            إضافة مأمورية جديدة
          </Button>
        )}
      </PageHeader>

      <MissionsTable
        missions={initialMissions}
        total={total}
        page={page}
        limit={limit}
        officerFilter={officerFilter}
        statusFilter={statusFilter}
        onPageChange={(p) => updateFilters({ page: p })}
        onLimitChange={(l) => updateFilters({ limit: l, page: 1 })}
        onOfficerFilterChange={(o) => updateFilters({ officerId: o, page: 1 })}
        onStatusFilterChange={(s) => updateFilters({ status: s, page: 1 })}
        onEditMission={handleEdit}
        isLoading={isLoading}
      />

      <MissionForm
        mission={selectedMission}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSave}
      />
    </div>
  );
}
