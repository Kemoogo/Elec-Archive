"use client";

import React, { useState, useEffect, useTransition } from "react";
import Link from "next/link";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { FolderTabs, type TabItem } from "@/components/ui/folder-tabs";
import { ClipboardList, ScrollText, FileText, Shield, LayoutDashboard, Plus, Briefcase, History, Filter, Bell, Printer, Unlock, CheckCircle2, Save, ArrowRight, CalendarPlus, Calendar, ShieldCheck, RefreshCw } from "lucide-react";
import { PageHeader, PrimaryHeaderBtn, SecondaryHeaderBtn } from "@/components/layout/ModernPageHeader";
import { PageContainer } from "@/components/layout/PageContainer";
import { LeaveRequestModal } from "@/components/officers/LeaveRequestModal";
import { MissionForm } from "./MissionForm";
import type { OfficerOption } from "@/lib/db/models/Officer.shared";
import { format } from "date-fns";
import { getSmartWeekRangeInfo, type SmartWeekRangeInfo } from "@/lib/arkan-harb/roster-engine";
import { RosterWeekDisplay } from "@/components/arkan-harb/RosterWeekDisplay";

interface ArkanHarbClientProps {
  dashboardContent: React.ReactNode;
  rollcallContent: React.ReactNode;
  leavesContent: React.ReactNode;
  missionsContent: React.ReactNode;
  positionsContent: React.ReactNode;
  rosterContent?: React.ReactNode;
  notificationsContent?: React.ReactNode;
  officers: OfficerOption[];
  canEdit: boolean;
  isAdmin?: boolean;
  isCommander?: boolean;
  rollcallDate?: string;
  rollcallDateDisplay?: string;
  isRollcallSubmitted?: boolean;
}

const TAB_NAMES: Record<string, string> = {
  dashboard: "لوحة القيادة",
  rollcall: "التمام اليومي",
  leaves: "سجل الإجازات",
  missions: "المأموريات",
  positions: "الوظائف",
  roster: "جدول النوبتجيات",
  decisions: "قرارات القائد والتنبيهات",
};

const TAB_DESCRIPTIONS: Record<string, string> = {
  dashboard: "لوحة التحكم الرئيسية وإحصائيات القوة، الإجازات، المأموريات والنشاطات الأخيرة",
  rollcall: "سجل كشف التمام اليومي الرسمي للضباط وإقرار الحضور والغياب",
  leaves: "سجل متابعة وإدارة إجازات وانقطاعات القوة بالوحدة",
  missions: "سجل وتتبع المأموريات الخارجية والمهام الرسمية المكلف بها الضباط",
  positions: "التنظيم الإداري وتسكين الضباط على الهيكل الوظيفي ومتابعة السجل التاريخي والشواغر",
  roster: "إدارة وتوزيع جدول النوبتجيات والخدمات الأسبوعية للضباط وحساب عدالة التوزيع",
  decisions: "سجل متابعة قرارات وتوجيهات السيد القائد بخصوص طلبات الإجازات وتحديثات التمام",
};

export function ArkanHarbClient({
  dashboardContent,
  rollcallContent,
  leavesContent,
  missionsContent,
  positionsContent,
  rosterContent,
  notificationsContent,
  officers,
  canEdit,
  isAdmin = false,
  isCommander = false,
  rollcallDate = "",
  rollcallDateDisplay = "",
  isRollcallSubmitted = false,
}: ArkanHarbClientProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();
  const activeTab = searchParams.get("tab") || "dashboard";

  const [isMissionModalOpen, setIsMissionModalOpen] = useState(false);
  const [isLeaveModalOpen, setIsLeaveModalOpen] = useState(false);
  const [rosterStatus, setRosterStatus] = useState<"draft" | "approved">("draft");
  const [isRosterSaving, setIsRosterSaving] = useState(false);
  const [rosterSavingAction, setRosterSavingAction] = useState<"draft" | "approve" | "reopen" | null>(null);

  useEffect(() => {
    const handleStatus = (e: Event) => {
      const customEvent = e as CustomEvent<{ status: "draft" | "approved" }>;
      if (customEvent.detail?.status) {
        setRosterStatus(customEvent.detail.status);
      }
    };
    const handleSaving = (e: Event) => {
      const customEvent = e as CustomEvent<{ isSaving: boolean; action?: "draft" | "approve" | "reopen" | null }>;
      if (typeof customEvent.detail?.isSaving === "boolean") {
        setIsRosterSaving(customEvent.detail.isSaving);
        setRosterSavingAction(customEvent.detail.action ?? (customEvent.detail.isSaving ? "draft" : null));
      }
    };

    window.addEventListener("roster-status-changed", handleStatus);
    window.addEventListener("roster-saving-state", handleSaving);
    return () => {
      window.removeEventListener("roster-status-changed", handleStatus);
      window.removeEventListener("roster-saving-state", handleSaving);
    };
  }, []);

  // Time & Date Computations for Rollcall workflow
  const now = new Date();
  const todayStr = format(now, "yyyy-MM-dd");
  const tomorrowDate = new Date(now);
  tomorrowDate.setDate(tomorrowDate.getDate() + 1);
  const tomorrowStr = format(tomorrowDate, "yyyy-MM-dd");

  const isAfter6PM = now.getHours() >= 18;
  const currentRollcallDate = rollcallDate || todayStr;
  const isViewingTomorrowRollcall = currentRollcallDate === tomorrowStr;
  const canSaveOrSubmitRollcall = currentRollcallDate === todayStr || currentRollcallDate === tomorrowStr;

  // Time & Date Computations for Roster workflow
  const rosterDateParam = searchParams.get("date");
  const rosterDate = rosterDateParam && !isNaN(Date.parse(rosterDateParam)) ? new Date(rosterDateParam) : now;
  const rosterSmartWeekInfo: SmartWeekRangeInfo = getSmartWeekRangeInfo(rosterDate, now);

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
      startTransition(() => {
        router.push(`${pathname}?${params.toString()}`, { scroll: false });
      });
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
      badge: officers.length,
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
    ...(rosterContent ? [{
      id: "roster",
      label: "جدول النوبتجيات",
      icon: <Calendar className="w-4 h-4" />,
      content: rosterContent,
    }] : []),
    ...(notificationsContent ? [{
      id: "decisions",
      label: "قرارات القائد والتنبيهات",
      icon: <Bell className="w-4 h-4" />,
      content: notificationsContent,
    }] : []),
  ];

  // Render header action controls per active tab using Sapphire Archive design system buttons
  const renderHeaderActions = () => {
    if (activeTab === "rollcall") {
      return (
        <div className="flex items-center gap-2 flex-wrap">
          {/* 1. History Button */}
          <button
            type="button"
            onClick={() => window.dispatchEvent(new CustomEvent("rollcall-open-history"))}
            className="p-2 rounded-xl text-sm font-bold transition-all active:scale-95 focus:outline-none cursor-pointer bg-(--app-surface-container-low) text-(--color-primary) hover:bg-(--app-surface-container)"
            title="سجل التمامات السابقة"
          >
            <History className="w-5 h-5" />
          </button>

          {/* 2. Print Button (Icon-only) */}
          <button
            type="button"
            onClick={() => window.dispatchEvent(new CustomEvent("rollcall-print"))}
            className="p-2 rounded-xl text-sm font-bold transition-all active:scale-95 focus:outline-none cursor-pointer bg-(--app-surface-container-low) text-(--color-primary) hover:bg-(--app-surface-container)"
            title="طباعة التمام"
          >
            <Printer className="w-5 h-5" />
          </button>

          {/* 3. Save Draft Button (Icon-only) */}
          {!isRollcallSubmitted && canEdit && canSaveOrSubmitRollcall && (
            <button
              type="button"
              onClick={() => window.dispatchEvent(new CustomEvent("rollcall-save-draft"))}
              className="p-2 rounded-xl text-sm font-bold transition-all active:scale-95 focus:outline-none cursor-pointer bg-(--app-surface-container-low) text-(--color-primary) hover:bg-(--app-surface-container)"
              title="حفظ مسودة مؤقتة"
            >
              <Save className="w-5 h-5" />
            </button>
          )}

          {/* 4. Add Custom Table Button (SecondaryHeaderBtn) */}
          {!isRollcallSubmitted && canEdit && canSaveOrSubmitRollcall && (
            <SecondaryHeaderBtn
              label="إضافة جدول مخصص"
              icon={<Plus className="w-4 h-4" />}
              onClick={() => window.dispatchEvent(new CustomEvent("rollcall-add-custom-table"))}
            />
          )}

          {/* 5. Prepare Tomorrow Rollcall Button (after 6 PM, if not already viewing tomorrow) */}
          {isAfter6PM && !isViewingTomorrowRollcall && canEdit && (
            <SecondaryHeaderBtn
              label="تجهيز تمام باكر"
              icon={<CalendarPlus className="w-4 h-4" />}
              onClick={() => router.push(`/arkan-harb?tab=rollcall&date=${tomorrowStr}`)}
            />
          )}

          {/* 6. Return to Today Button (SecondaryHeaderBtn to guarantee single primary button) */}
          {currentRollcallDate !== todayStr && (
            <SecondaryHeaderBtn
              label="العودة لتمام اليوم"
              icon={<ArrowRight className="w-4 h-4" />}
              onClick={() => router.push(`/arkan-harb?tab=rollcall&date=${todayStr}`)}
            />
          )}

          {/* 7. Reopen Button (Admin only, when submitted - Sole Primary Button in submitted state) */}
          {isRollcallSubmitted && isAdmin && (
            <PrimaryHeaderBtn
              label="إعادة فتح التمام"
              icon={<Unlock className="w-4 h-4" />}
              title="إعادة فتح التمام للتعديل بعد اعتماده"
              onClick={() => window.dispatchEvent(new CustomEvent("rollcall-reopen"))}
            />
          )}

          {/* 8. Final Submit Button (Sole Primary Button in active editing state) */}
          {!isRollcallSubmitted && canEdit && canSaveOrSubmitRollcall && (
            <PrimaryHeaderBtn
              label="تسليم التمام"
              icon={<CheckCircle2 className="w-4 h-4" />}
              title="اعتماد التمام اليومي رسمياً وإغلاق التعديل وإرسال الإخطارات للقيادة"
              onClick={() => window.dispatchEvent(new CustomEvent("rollcall-submit-final"))}
            />
          )}
        </div>
      );
    }
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
      return (
        <div className="flex items-center gap-2">
          {/* 1. مفتاح سجل المأموريات (مطابق لمفتاح أرشيف الوظائف) */}
          <button
            type="button"
            onClick={() => window.dispatchEvent(new CustomEvent("open-missions-archive"))}
            className="p-2 rounded-xl text-sm font-bold transition-all active:scale-95 focus:outline-none cursor-pointer bg-(--app-surface-container-low) text-(--color-primary) hover:bg-(--app-surface-container)"
            title="سجل وأرشيف المأموريات"
          >
            <History className="w-5 h-5" />
          </button>

          {/* 2. مفتاح طباعة كشف المأموريات */}
          <button
            type="button"
            onClick={() => window.dispatchEvent(new CustomEvent("print-missions-report"))}
            className="p-2 rounded-xl text-sm font-bold transition-all active:scale-95 focus:outline-none cursor-pointer bg-(--app-surface-container-low) text-(--color-primary) hover:bg-(--app-surface-container)"
            title="طباعة كشف مأموريات القوة"
          >
            <Printer className="w-5 h-5" />
          </button>

          {/* 3. إضافة مأمورية / فرقة / سفرية */}
          {canEdit && (
            <PrimaryHeaderBtn
              label="إضافة مأمورية / فرقة / سفرية"
              icon={<Plus className="w-4 h-4" />}
              onClick={() => window.dispatchEvent(new CustomEvent("open-create-mission"))}
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

    if (activeTab === "roster") {
      return (
        <div className="flex items-center gap-2 flex-wrap">
          {/* 1. مفتاح History لعرض جدول النوبتجيات الأسبوعي لتاريخ ما (رمز) */}
          <button
            type="button"
            onClick={() => window.dispatchEvent(new CustomEvent("roster-open-history"))}
            className="p-2 rounded-xl text-sm font-bold transition-all active:scale-95 focus:outline-none cursor-pointer bg-(--app-surface-container-low) text-(--color-primary) hover:bg-(--app-surface-container)"
            title="سجل النوبتجيات الأسبوعية لتاريخ محدد"
          >
            <History className="w-5 h-5" />
          </button>

          {/* 2. مفتاح الطباعة (رمز) */}
          <button
            type="button"
            onClick={() => window.dispatchEvent(new CustomEvent("roster-print"))}
            className="p-2 rounded-xl text-sm font-bold transition-all active:scale-95 focus:outline-none cursor-pointer bg-(--app-surface-container-low) text-(--color-primary) hover:bg-(--app-surface-container)"
            title="طباعة جدول الأسبوع"
          >
            <Printer className="w-5 h-5" />
          </button>

          {/* 3. مفتاح حفظ كمسودة / حفظ التعديلات (رمز فقط) */}
          {canEdit && (
            <button
              type="button"
              disabled={isRosterSaving}
              onClick={() =>
                window.dispatchEvent(
                  new CustomEvent(rosterStatus === "approved" ? "roster-save" : "roster-save-draft")
                )
              }
              className="p-2 rounded-xl text-sm font-bold transition-all active:scale-95 focus:outline-none cursor-pointer bg-(--app-surface-container-low) text-(--color-primary) hover:bg-(--app-surface-container) disabled:opacity-50"
              title={rosterStatus === "approved" ? "حفظ التعديلات" : "حفظ مسودة مؤقتة"}
            >
              {isRosterSaving && rosterSavingAction === "draft" ? (
                <RefreshCw className="w-5 h-5 animate-spin" />
              ) : (
                <Save className="w-5 h-5" />
              )}
            </button>
          )}

          {/* 4. مفتاح اعتماد الجدول (في وضع المسودة فقط) */}
          {canEdit && rosterStatus !== "approved" && (
            <PrimaryHeaderBtn
              label={isRosterSaving && rosterSavingAction === "approve" ? "جاري الاعتماد..." : "اعتماد الجدول"}
              icon={isRosterSaving && rosterSavingAction === "approve" ? <RefreshCw className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
              title="اعتماد جدول النوبتجيات وقفل التعديل المباشر"
              disabled={isRosterSaving}
              onClick={() => window.dispatchEvent(new CustomEvent("roster-approve"))}
            />
          )}

          {/* 5. Approved Mode: Revert to Draft (Commander or Admin only) */}
          {rosterStatus === "approved" && (isAdmin || isCommander) && (
            <PrimaryHeaderBtn
              label={isRosterSaving && rosterSavingAction === "reopen" ? "جاري إلغاء الاعتماد..." : "إلغاء الاعتماد"}
              icon={isRosterSaving && rosterSavingAction === "reopen" ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Unlock className="w-4 h-4" />}
              title="إلغاء الاعتماد وإعادة فتح الجدول كمسودة للتعديل"
              disabled={isRosterSaving}
              onClick={() => window.dispatchEvent(new CustomEvent("roster-reopen"))}
            />
          )}
        </div>
      );
    }

    return null;
  };

  const showSearch = true; // البحث مفعل في جميع تبويبات أركان حرب
  const urlSearchQuery = searchParams.get("search") || "";

  const [localSearch, setLocalSearch] = useState(urlSearchQuery);
  const [prevUrlSearch, setPrevUrlSearch] = useState(urlSearchQuery);

  if (urlSearchQuery !== prevUrlSearch) {
    setPrevUrlSearch(urlSearchQuery);
    setLocalSearch(urlSearchQuery);
  }

  useEffect(() => {
    const trimmed = localSearch.trim();
    if (trimmed.length === 1) return; // Ignore single-character searches to reduce server load
    if (trimmed !== urlSearchQuery) {
      const params = new URLSearchParams(searchParams.toString());
      params.delete("officerId"); // إزالة أي بارامتر قديم لمنع التعارض
      if (trimmed) {
        params.set("search", trimmed);
      } else {
        params.delete("search");
      }
      router.push(`${pathname}?${params.toString()}`, { scroll: false });
    }
  }, [localSearch, urlSearchQuery, pathname, router, searchParams]);

  const getSearchPlaceholder = () => {
    switch (activeTab) {
      case "rollcall":
        return "بحث بالاسم، الرتبة، أو الرقم العسكري في التمام...";
      case "leaves":
        return "بحث باسم الضابط، الرتبة، أو الرقم العسكري...";
      case "missions":
        return "بحث باسم الضابط، عنوان المأمورية، أو الجهة...";
      case "positions":
        return "بحث في الوظائف أو الفروع أو أسماء ورتب الضباط...";
      case "roster":
        return "بحث في جدول النوبتجيات بالاسم، الرتبة أو الخدمة...";
      case "decisions":
        return "بحث في قرارات وتوجيهات السيد القائد...";
      case "dashboard":
      default:
        return "بحث عام بالاسم، الرتبة، أو الرقم العسكري...";
    }
  };

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
            <span className="text-(--color-primary)">{currentTabName}</span>
            {activeTab === "rollcall" && rollcallDateDisplay && (
              <>
                <span className="text-(--app-muted-foreground)/50 font-semibold">-</span>
                <span>تمام يوم {rollcallDateDisplay}</span>
              </>
            )}
            {activeTab === "roster" && (
              <>
                <span className="text-(--app-muted-foreground)/50 font-semibold">-</span>
                <RosterWeekDisplay info={rosterSmartWeekInfo} showPresetLabel={true} />
              </>
            )}
          </span>
        }
        description={currentDescription}
        showSearch={showSearch}
        searchQuery={localSearch}
        onSearchChange={setLocalSearch}
        searchPlaceholder={getSearchPlaceholder()}
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
