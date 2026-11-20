"use client";

import React from "react";
import { Award, Camera, Landmark, ShieldCheck } from "lucide-react";
import { ModernPageHeader as PageHeader } from "@/components/layout/ModernPageHeader";
import { FolderTabs, type TabItem } from "@/components/ui/folder-tabs";
import type {
  HistoricalCommandersListResponse,
  HistoricalMilestonesListResponse,
  HistoricalRecordCapabilities,
  HistoricalRecordTab,
  HistoricalVisitsListResponse,
  UnitHistoricalProfileDTO,
} from "@/types/historical-record";
import { HistoricalVisitsTab } from "./HistoricalVisitsTab";
import { HistoricalCommandersTab } from "./HistoricalCommandersTab";
import { HistoricalUnitInfoTab } from "./HistoricalUnitInfoTab";

interface HistoricalRecordClientProps {
  initialTab: HistoricalRecordTab;
  capabilities: HistoricalRecordCapabilities;
  initialVisits: HistoricalVisitsListResponse;
  initialCommanders: HistoricalCommandersListResponse;
  initialUnitProfile: UnitHistoricalProfileDTO | null;
  initialMilestones: HistoricalMilestonesListResponse;
}

export function HistoricalRecordClient({
  initialTab,
  capabilities,
  initialVisits,
  initialCommanders,
  initialUnitProfile,
  initialMilestones,
}: HistoricalRecordClientProps) {
  const accessBadgeLabel = capabilities.isAdmin
    ? "صلاحية كاملة + الحوكمة (مدير النظام)"
    : capabilities.canAdd
      ? "صلاحية الإضافة والتوثيق فقط"
      : "عرض فقط";

  const tabs: TabItem[] = [
    {
      id: "visits",
      label: "الزيارات الهامة",
      icon: <Camera className="w-4 h-4" />,
      badge: initialVisits.items.length,
      content: (
        <HistoricalVisitsTab
          initialItems={initialVisits.items}
          initialYears={initialVisits.availableYears}
          canAdd={capabilities.canAdd}
          isAdmin={capabilities.isAdmin}
        />
      ),
    },
    {
      id: "commanders",
      label: "قادة المركز والوحدة",
      icon: <Award className="w-4 h-4" />,
      badge: initialCommanders.items.length,
      content: (
        <HistoricalCommandersTab
          initialItems={initialCommanders.items}
          initialCurrentCommander={initialCommanders.currentCommander}
          initialYears={initialCommanders.availableYears}
          canAdd={capabilities.canAdd}
          isAdmin={capabilities.isAdmin}
        />
      ),
    },
    {
      id: "unit-info",
      label: "معلومات عن الوحدة",
      icon: <Landmark className="w-4 h-4" />,
      badge: initialMilestones.items.length,
      content: (
        <HistoricalUnitInfoTab
          initialProfile={initialUnitProfile}
          initialMilestones={initialMilestones.items}
          initialYears={initialMilestones.availableYears}
          canAdd={capabilities.canAdd}
          isAdmin={capabilities.isAdmin}
        />
      ),
    },
  ];

  return (
    <div className="max-w-[1600px] mx-auto space-y-6" dir="rtl">
      <PageHeader
        icon={<Landmark className="w-6 h-6" />}
        title="السجل التاريخي للوحدة"
        subtitle="الذاكرة المؤسسية للوحدة: الزيارات الهامة، سجل القادة المتعاقبين، وتاريخ الوحدة ومحطاتها الموثقة."
        actions={
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-(--color-primary)/5 border border-(--color-primary)/20 text-xs font-black text-(--color-primary)">
            <ShieldCheck className="w-4 h-4 shrink-0" />
            <span>{accessBadgeLabel}</span>
          </div>
        }
      />

      <FolderTabs
        tabs={tabs}
        initialTab={initialTab}
        syncWithUrl
        variant="folder"
      />
    </div>
  );
}
