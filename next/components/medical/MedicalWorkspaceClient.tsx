"use client";

import React, { useTransition } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { LayoutDashboard, Activity, Pill, Users } from "lucide-react";
import { FolderTabs, type TabItem } from "@/components/ui/folder-tabs";
import { MedicalPageHeader } from "./MedicalPageHeader";
import { MedicalDashboardTab } from "./MedicalDashboardTab";
import type {
  MedicalDashboardStats,
  MedicalDashboardVisitItem,
  MedicalDashboardMedicineItem,
  MedicalDashboardPatientItem,
} from "@/lib/medical/types";

interface MedicalWorkspaceClientProps {
  activeTab?: string;
  searchQuery: string;
  stats: MedicalDashboardStats;
  visits: MedicalDashboardVisitItem[];
  medicines: MedicalDashboardMedicineItem[];
  patients: MedicalDashboardPatientItem[];
  permissions: "none" | "view" | "edit";
  visitsContent: React.ReactNode;
  medicinesContent: React.ReactNode;
  patientsContent: React.ReactNode;
}

export function MedicalWorkspaceClient({
  activeTab,
  searchQuery,
  stats,
  visits,
  medicines,
  patients,
  permissions,
  visitsContent,
  medicinesContent,
  patientsContent,
}: MedicalWorkspaceClientProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();

  const currentTab = searchParams.get("tab") || activeTab || "dashboard";

  const handleSelectTab = (tabId: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (tabId === "dashboard") {
      params.delete("tab");
    } else {
      params.set("tab", tabId);
    }
    params.delete("search");
    const qs = params.toString();
    startTransition(() => {
      router.push(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    });
  };

  const tabs: TabItem[] = [
    {
      id: "dashboard",
      label: "لوحة القيادة",
      icon: <LayoutDashboard className="w-4 h-4" />,
      content: (
        <MedicalDashboardTab
          stats={stats}
          visits={visits}
          medicines={medicines}
          patients={patients}
          permissions={permissions}
          onNavigateTab={handleSelectTab}
        />
      ),
    },
    {
      id: "visits",
      label: "سجل الزيارات",
      icon: <Activity className="w-4 h-4" />,
      badge: visits.length,
      content: visitsContent,
    },
    {
      id: "medicines",
      label: "مخزون الأدوية",
      icon: <Pill className="w-4 h-4" />,
      badge: stats.totalMedicines,
      content: medicinesContent,
    },
    {
      id: "patients",
      label: "شئون المرضى",
      icon: <Users className="w-4 h-4" />,
      badge: patients.length,
      content: patientsContent,
    },
  ];

  return (
    <div className="space-y-6">
      <MedicalPageHeader
        tab={currentTab === "dashboard" ? undefined : currentTab}
        searchQuery={searchQuery}
      />

      <div className="mt-8">
        <FolderTabs
          tabs={tabs}
          value={currentTab}
          onValueChange={handleSelectTab}
          initialTab="dashboard"
        />
      </div>
    </div>
  );
}
