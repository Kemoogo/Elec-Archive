"use client";

import React, { useCallback, useRef, useState } from "react";
import Link from "next/link";
import { Award, Camera, Edit3, Landmark, Plus } from "lucide-react";
import { PageContainer } from "@/components/layout/PageContainer";
import {
  PageHeader,
  PrimaryHeaderBtn,
  SecondaryHeaderBtn,
} from "@/components/layout/ModernPageHeader";
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
import type { HistoricalTabHandle } from "./useHistoricalTabSync";

interface HistoricalRecordClientProps {
  initialTab: HistoricalRecordTab;
  capabilities: HistoricalRecordCapabilities;
  initialVisits: HistoricalVisitsListResponse;
  initialCommanders: HistoricalCommandersListResponse;
  initialUnitProfile: UnitHistoricalProfileDTO | null;
  initialMilestones: HistoricalMilestonesListResponse;
}

const TAB_META: Record<
  HistoricalRecordTab,
  {
    label: string;
    description: string;
    searchPlaceholder: string;
    addLabel: string;
  }
> = {
  visits: {
    label: "الزيارات الهامة",
    description:
      "توثيق الزيارات الهامة والوفود القيادية للوحدة مع الأرشيف الصوري والخط الزمني التفاعلي",
    searchPlaceholder: "بحث بالعنوان، اسم الزائر، أو التفاصيل...",
    addLabel: "إضافة زيارة هامة",
  },
  commanders: {
    label: "قادة المركز والوحدة",
    description:
      "السجل التاريخي لقادة المركز والوحدة المتعاقبين ببيانات ولقطات مستقلة ومحفوظة",
    searchPlaceholder: "بحث بالاسم، الرقم العسكري، الأقدمية، أو الرتبة...",
    addLabel: "إضافة قائد وحدة",
  },
  "unit-info": {
    label: "معلومات عن الوحدة",
    description:
      "البطاقة التعريفية الرسمية للوحدة والخط الزمني لأبرز المحطات والإنجازات التاريخية",
    searchPlaceholder: "بحث في عنوان المحطة أو تفاصيلها...",
    addLabel: "إضافة محطة تاريخية",
  },
};

export function HistoricalRecordClient({
  initialTab,
  capabilities,
  initialVisits,
  initialCommanders,
  initialUnitProfile,
  initialMilestones,
}: HistoricalRecordClientProps) {
  const [activeTab, setActiveTab] = useState<HistoricalRecordTab>(initialTab);
  const [hasUnitProfile, setHasUnitProfile] = useState(
    Boolean(initialUnitProfile),
  );
  const [tabCounts, setTabCounts] = useState<
    Record<HistoricalRecordTab, number>
  >({
    visits: initialVisits.items.length,
    commanders: initialCommanders.items.length,
    "unit-info": initialMilestones.items.length,
  });
  const [searchQueries, setSearchQueries] = useState<
    Record<HistoricalRecordTab, string>
  >({
    visits: "",
    commanders: "",
    "unit-info": "",
  });

  const visitsTabRef = useRef<HistoricalTabHandle>(null);
  const commandersTabRef = useRef<HistoricalTabHandle>(null);
  const unitInfoTabRef = useRef<HistoricalTabHandle>(null);

  const handleSearchChange = useCallback(
    (query: string) => {
      setSearchQueries((prev) => ({ ...prev, [activeTab]: query }));
    },
    [activeTab],
  );

  const handlePrimaryAction = useCallback(() => {
    if (activeTab === "visits") {
      visitsTabRef.current?.openCreateModal();
    } else if (activeTab === "commanders") {
      commandersTabRef.current?.openCreateModal();
    } else {
      unitInfoTabRef.current?.openCreateModal();
    }
  }, [activeTab]);

  const handleOpenUnitProfile = useCallback(() => {
    unitInfoTabRef.current?.openProfileModal?.();
  }, []);

  const handleVisitsCountChange = useCallback((count: number) => {
    setTabCounts((prev) => (prev.visits === count ? prev : { ...prev, visits: count }));
  }, []);

  const handleCommandersCountChange = useCallback((count: number) => {
    setTabCounts((prev) =>
      prev.commanders === count ? prev : { ...prev, commanders: count },
    );
  }, []);

  const handleMilestonesCountChange = useCallback((count: number) => {
    setTabCounts((prev) =>
      prev["unit-info"] === count ? prev : { ...prev, "unit-info": count },
    );
  }, []);

  const activeMeta = TAB_META[activeTab];

  const renderHeaderActions = () => {
    if (!capabilities.canAdd && !(activeTab === "unit-info" && capabilities.isAdmin)) {
      return null;
    }

    return (
      <div className="flex items-center gap-2 flex-wrap">
        {activeTab === "unit-info" && capabilities.isAdmin && (
          <SecondaryHeaderBtn
            label={hasUnitProfile ? "تعديل بطاقة الوحدة" : "تأسيس بطاقة الوحدة"}
            icon={<Edit3 className="w-4 h-4" />}
            onClick={handleOpenUnitProfile}
          />
        )}
        {capabilities.canAdd && (
          <PrimaryHeaderBtn
            label={activeMeta.addLabel}
            icon={<Plus className="w-4 h-4" />}
            onClick={handlePrimaryAction}
          />
        )}
      </div>
    );
  };

  const tabs: TabItem[] = [
    {
      id: "visits",
      label: TAB_META.visits.label,
      icon: <Camera className="w-4 h-4" />,
      badge: tabCounts.visits,
      content: (
        <HistoricalVisitsTab
          ref={visitsTabRef}
          initialItems={initialVisits.items}
          initialYears={initialVisits.availableYears}
          searchQuery={searchQueries.visits}
          canAdd={capabilities.canAdd}
          isAdmin={capabilities.isAdmin}
          onCountChange={handleVisitsCountChange}
        />
      ),
    },
    {
      id: "commanders",
      label: TAB_META.commanders.label,
      icon: <Award className="w-4 h-4" />,
      badge: tabCounts.commanders,
      content: (
        <HistoricalCommandersTab
          ref={commandersTabRef}
          initialItems={initialCommanders.items}
          initialCurrentCommander={initialCommanders.currentCommander}
          initialYears={initialCommanders.availableYears}
          searchQuery={searchQueries.commanders}
          canAdd={capabilities.canAdd}
          isAdmin={capabilities.isAdmin}
          onCountChange={handleCommandersCountChange}
        />
      ),
    },
    {
      id: "unit-info",
      label: TAB_META["unit-info"].label,
      icon: <Landmark className="w-4 h-4" />,
      badge: tabCounts["unit-info"],
      content: (
        <HistoricalUnitInfoTab
          ref={unitInfoTabRef}
          initialProfile={initialUnitProfile}
          initialMilestones={initialMilestones.items}
          initialYears={initialMilestones.availableYears}
          searchQuery={searchQueries["unit-info"]}
          canAdd={capabilities.canAdd}
          isAdmin={capabilities.isAdmin}
          onCountChange={handleMilestonesCountChange}
          onProfilePresenceChange={setHasUnitProfile}
        />
      ),
    },
  ];

  return (
    <PageContainer>
      <PageHeader
        icon={<Landmark className="w-6 h-6" />}
        title={
          <span className="flex items-center gap-2 flex-wrap">
            <Link
              href="/historical-record"
              className="text-(--color-primary) hover:underline hover:text-blue-600 transition-colors"
            >
              السجل التاريخي للوحدة
            </Link>
            <span className="text-(--app-muted-foreground)/50 font-semibold">
              -
            </span>
            <span className="text-(--color-primary)">{activeMeta.label}</span>
          </span>
        }
        description={activeMeta.description}
        showSearch
        searchQuery={searchQueries[activeTab]}
        onSearchChange={handleSearchChange}
        searchPlaceholder={activeMeta.searchPlaceholder}
        action={renderHeaderActions()}
      />

      <div className="mt-8">
        <FolderTabs
          tabs={tabs}
          value={activeTab}
          onValueChange={(val) => setActiveTab(val as HistoricalRecordTab)}
          initialTab={initialTab}
          syncWithUrl
        />
      </div>
    </PageContainer>
  );
}
