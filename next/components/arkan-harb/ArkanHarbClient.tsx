"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { FolderTabs, type TabItem } from "@/components/ui/folder-tabs";
import { ClipboardList, ScrollText, FileText, Shield, LayoutDashboard, Plus, ChevronDown, Briefcase, History, Filter } from "lucide-react";
import { PageHeader, PrimaryHeaderBtn, SecondaryHeaderBtn } from "@/components/layout/ModernPageHeader";
import { PageContainer } from "@/components/layout/PageContainer";
import { LeaveRequestModal } from "@/components/officers/LeaveRequestModal";
import { MissionForm } from "./MissionForm";

interface OfficerOption {
  id: string;
  name: string;
  fullName: string;
  militaryId: string;
  rank: string;
  officerLabel?: string;
  defaultLeaveSystem?: string;
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
  positions: "الوظائف",
};

const TAB_DESCRIPTIONS: Record<string, string> = {
  dashboard: "لوحة التحكم الرئيسية وإحصائيات القوة، الإجازات، المأموريات والنشاطات الأخيرة",
  rollcall: "سجل كشف التمام اليومي الرسمي للضباط وإقرار الحضور والغياب",
  leaves: "سجل متابعة وإدارة إجازات وانقطاعات القوة بالوحدة",
  missions: "سجل وتتبع المأموريات الخارجية والمهام الرسمية المكلف بها الضباط",
  positions: "التنظيم الإداري وتسكين الضباط على الهيكل الوظيفي ومتابعة السجل التاريخي والشواغر",
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

  const [isMissionModalOpen, setIsMissionModalOpen] = useState(false);
  const [isLeaveModalOpen, setIsLeaveModalOpen] = useState(false);

  const updateParams = React.useCallback(
    (newParams: Record<string, string>) => {
      const params = new URLSearchParams(searchParams.toString());
      Object.entries(newParams).forEach(([key, value]) => {
        if (value) {
          params.set(key, value);
        } else {
          params.delete(key);
        }
      });
      router.push(`${pathname}?${params.toString()}`, { scroll: false });
    },
    [router, pathname, searchParams],
  );

  const updateParamsRef = React.useRef(updateParams);
  useEffect(() => {
    updateParamsRef.current = updateParams;
  }, [updateParams]);

  const currentTabName = TAB_NAMES[activeTab] || TAB_NAMES.dashboard;
  const currentDescription = TAB_DESCRIPTIONS[activeTab] || TAB_DESCRIPTIONS.dashboard;

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
      icon: <Briefcase className="w-4 h-4" />,
      content: positionsContent,
    },
  ];

  // Render header action controls per active tab using Sapphire Archive design system buttons
  const renderHeaderActions = () => {
    if (activeTab === "leaves") {
      const showRequestsOnly = searchParams.get("requestsOnly") === "true";
      return (
        <div className="flex items-center gap-2">
          <SecondaryHeaderBtn
            label={showRequestsOnly ? "عرض كافة الضباط" : "عرض الطلبات فقط"}
            icon={<Filter className="w-4 h-4" />}
            onClick={() =>
              updateParams({
                requestsOnly: showRequestsOnly ? "" : "true",
              })
            }
          />
          {canEdit && (
            <PrimaryHeaderBtn
              label="تقديم طلب إجازة"
              icon={<Plus className="w-4 h-4" />}
              onClick={() => setIsLeaveModalOpen(true)}
            />
          )}
        </div>
      );
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
              <option value="postponed">مؤجلة</option>
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
      const positionsView = searchParams.get("view") || "by-position";
      return (
        <div className="flex items-center gap-2">
          {/* 1. الأرشيف (أيقونة فقط مطابق للبحث) */}
          <button
            type="button"
            onClick={() => window.dispatchEvent(new CustomEvent("open-archive-modal"))}
            className="p-2 rounded-xl text-sm font-bold transition-all active:scale-95 focus:outline-none cursor-pointer bg-(--app-surface-container-low) text-(--color-primary) hover:bg-(--app-surface-container)"
            title="تقرير الأرشيف والتاريخ"
          >
            <History className="w-5 h-5" />
          </button>

          {/* 2. مفتاح النمط toggle مثل مفتاح ضباط الوحدة وكل الضباط */}
          <SecondaryHeaderBtn
            label={positionsView === "by-officer" ? "عرض حسب الضابط" : "عرض حسب الوظيفة"}
            icon={<Filter className="w-4 h-4" />}
            onClick={() =>
              updateParams({
                view: positionsView === "by-officer" ? "by-position" : "by-officer",
              })
            }
          />

          {/* 3. مفتاح الإضافة */}
          {canEdit && (
            <PrimaryHeaderBtn
              label="إضافة وظيفة"
              icon={<Plus className="w-4 h-4" />}
              onClick={() => window.dispatchEvent(new CustomEvent("open-create-position-modal"))}
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
        if (activeTab === "leaves" || activeTab === "positions") {
          updateParamsRef.current({ search: localSearch });
        } else {
          updateParamsRef.current({ officerId: localSearch, page: "1" });
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
        searchPlaceholder={
          activeTab === "leaves"
            ? "بحث باسم الضابط أو السبب..."
            : activeTab === "positions"
            ? "بحث في الوظائف أو الفروع أو أسماء ورتب الضباط..."
            : "بحث بمعرف الضابط..."
        }
        action={renderHeaderActions()}
      />
      
      <div className="mt-8">
        <FolderTabs
          tabs={tabs}
          value={activeTab}
          onValueChange={(tab) => updateParams({ tab })}
          initialTab="dashboard"
        />
      </div>

      {canEdit && (
        <>
          <LeaveRequestModal
            officers={officers}
            isOpen={isLeaveModalOpen}
            onClose={() => setIsLeaveModalOpen(false)}
          />

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
        </>
      )}
    </PageContainer>
  );
}
