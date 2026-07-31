"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { FolderTabs, type TabItem } from "@/components/ui/folder-tabs";
import { ClipboardList, ScrollText, FileText, Shield, LayoutDashboard, Plus, ChevronDown } from "lucide-react";
import { PageHeader, PrimaryHeaderBtn } from "@/components/layout/ModernPageHeader";
import { PageContainer } from "@/components/layout/PageContainer";
import { LeaveAddModal } from "@/components/officers/LeaveAddModal";
import { MissionForm } from "./MissionForm";
import { PositionAssignmentForm } from "./PositionAssignmentForm";

interface OfficerOption {
  id: string;
  name: string;
  fullName: string;
  militaryId: string;
  rank: string;
}

interface ArkanHarbClientProps {
  dashboardContent: React.ReactNode;
  rollcallContent: React.ReactNode;
  leavesContent: React.ReactNode;
  missionsContent: React.ReactNode;
  positionsContent: React.ReactNode;
  officers: OfficerOption[];
  canEdit: boolean;
}

const TAB_NAMES: Record<string, string> = {
  dashboard: "لوحة القيادة",
  rollcall: "التمام اليومي",
  leaves: "سجل الإجازات",
  missions: "المأموريات",
  positions: "التنظيم الإداري والوظائف",
};

const TAB_DESCRIPTIONS: Record<string, string> = {
  dashboard: "لوحة التحكم الرئيسية وإحصائيات القوة، الإجازات، المأموريات والنشاطات الأخيرة",
  rollcall: "سجل كشف التمام اليومي الرسمي للضباط وإقرار الحضور والغياب",
  leaves: "سجل متابعة وإدارة إجازات وانقطاعات القوة بالوحدة",
  missions: "سجل وتتبع المأموريات الخارجية والمهام الرسمية المكلف بها الضباط",
  positions: "سجل إدارة الهيكل الوظيفي والتعيينات والمسؤوليات القيادية والنيابية",
};

export function ArkanHarbClient({
  dashboardContent,
  rollcallContent,
  leavesContent,
  missionsContent,
  positionsContent,
  officers,
  canEdit,
}: ArkanHarbClientProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const activeTab = searchParams.get("tab") || "dashboard";
  const currentTabName = TAB_NAMES[activeTab] || TAB_NAMES.dashboard;
  const currentDescription = TAB_DESCRIPTIONS[activeTab] || TAB_DESCRIPTIONS.dashboard;

  const [isMissionModalOpen, setIsMissionModalOpen] = useState(false);
  const [isPositionModalOpen, setIsPositionModalOpen] = useState(false);

  const updateParams = (newParams: Record<string, string>) => {
    const params = new URLSearchParams(searchParams.toString());
    Object.entries(newParams).forEach(([k, v]) => {
      if (v) params.set(k, v);
      else params.delete(k);
    });
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  };

  const tabs: TabItem[] = [
    {
      id: "dashboard",
      label: "لوحة القيادة",
      icon: <LayoutDashboard className="w-4 h-4" />,
      content: dashboardContent,
    },
    {
      id: "rollcall",
      label: "التمام اليومي",
      icon: <ClipboardList className="w-4 h-4" />,
      content: rollcallContent,
    },
    {
      id: "leaves",
      label: "سجل الإجازات",
      icon: <ScrollText className="w-4 h-4" />,
      content: leavesContent,
    },
    {
      id: "missions",
      label: "المأموريات",
      icon: <FileText className="w-4 h-4" />,
      content: missionsContent,
    },
    {
      id: "positions",
      label: "الوظائف",
      icon: <Shield className="w-4 h-4" />,
      content: positionsContent,
    },
  ];

  // Render header action controls per active tab using Sapphire Archive design system buttons
  const renderHeaderActions = () => {
    if (activeTab === "leaves" && canEdit) {
      return <LeaveAddModal officers={officers} />;
    }

    if (activeTab === "missions") {
      const status = searchParams.get("status") || "";
      return (
        <div className="flex items-center gap-2">
          <div className="relative">
            <select
              value={status}
              onChange={(e) => updateParams({ status: e.target.value, page: "1" })}
              className="px-3.5 py-2 bg-(--app-surface) border border-(--app-border) rounded-xl text-xs font-bold text-(--app-foreground) focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all appearance-none cursor-pointer pr-3 pl-8 shadow-xs"
            >
              <option value="">كل الحالات</option>
              <option value="scheduled">مجدولة</option>
              <option value="active">نشطة</option>
              <option value="completed">مكتملة</option>
              <option value="cancelled">ملغاة</option>
            </select>
            <ChevronDown className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-(--app-muted-foreground) pointer-events-none" />
          </div>
          {canEdit && (
            <PrimaryHeaderBtn
              label="إضافة مأمورية"
              icon={<Plus className="w-4 h-4" />}
              onClick={() => setIsMissionModalOpen(true)}
            />
          )}
        </div>
      );
    }

    if (activeTab === "positions") {
      const status = searchParams.get("status") || "";
      return (
        <div className="flex items-center gap-2">
          <div className="relative">
            <select
              value={status}
              onChange={(e) => updateParams({ status: e.target.value, page: "1" })}
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
              onClick={() => setIsPositionModalOpen(true)}
            />
          )}
        </div>
      );
    }

    return null;
  };

  const showSearch = ["leaves", "missions", "positions"].includes(activeTab);
  const urlSearchQuery = searchParams.get("officerId") || searchParams.get("search") || "";

  const [localSearch, setLocalSearch] = useState(urlSearchQuery);
  const [prevUrlSearch, setPrevUrlSearch] = useState(urlSearchQuery);

  if (urlSearchQuery !== prevUrlSearch) {
    setPrevUrlSearch(urlSearchQuery);
    setLocalSearch(urlSearchQuery);
  }

  useEffect(() => {
    const timer = setTimeout(() => {
      if (localSearch !== urlSearchQuery) {
        if (activeTab === "leaves") {
          updateParams({ search: localSearch });
        } else {
          updateParams({ officerId: localSearch, page: "1" });
        }
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [localSearch, activeTab, urlSearchQuery]);

  return (
    <PageContainer>
      <PageHeader
        icon={<Shield className="w-6 h-6" />}
        title={
          <span className="flex items-center gap-2 flex-wrap">
            <Link
              href="/arkan-harb"
              className="text-(--color-primary) hover:underline hover:text-blue-600 transition-colors"
            >
              فرع أركان الحرب
            </Link>
            <span className="text-(--app-muted-foreground)/50 font-semibold">-</span>
            <span>{currentTabName}</span>
          </span>
        }
        description={currentDescription}
        showSearch={showSearch}
        searchQuery={localSearch}
        onSearchChange={setLocalSearch}
        searchPlaceholder={activeTab === "leaves" ? "بحث باسم الضابط أو السبب..." : "بحث بمعرف الضابط..."}
        action={renderHeaderActions()}
      />
      
      <div className="mt-8">
        <FolderTabs tabs={tabs} initialTab="dashboard" />
      </div>

      {canEdit && (
        <>
          <MissionForm
            mission={null}
            officers={officers}
            isOpen={isMissionModalOpen}
            onClose={() => setIsMissionModalOpen(false)}
            onSave={() => {
              setIsMissionModalOpen(false);
              router.refresh();
            }}
          />
          <PositionAssignmentForm
            position={null}
            officers={officers}
            isOpen={isPositionModalOpen}
            onClose={() => setIsPositionModalOpen(false)}
            onSave={() => {
              setIsPositionModalOpen(false);
              router.refresh();
            }}
          />
        </>
      )}
    </PageContainer>
  );
}
