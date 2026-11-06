"use client";

import React, { useState, useMemo } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { format } from "date-fns";
import { ar } from "date-fns/locale";
import {
  Users,
  ShieldCheck,
  Compass,
  ScrollText,
  Briefcase,
  Search,
  RefreshCw,
  ExternalLink,
  Clock,
  Activity,
  X,
} from "lucide-react";
import MainTable, { type TableColumn } from "@/components/ui/Table";
import { CustomSelect, type CustomSelectOption } from "@/components/ui/custom-select";
import { ActionButton } from "@/components/officers/OfficersTable";
import {
  OperateKpiStrip,
  OperateTelemetryChart,
  OperateDistributionPanel,
  type OperateKpiMetric,
  type TelemetryDataPoint,
  type DistributionSegment,
} from "@/components/ui/operate-kpi-strip";
import type { AuditLogPopulated } from "@/lib/arkan-harb/server-queries";
import type { RollcallOfficerData } from "@/components/arkan-harb/RollcallView";
import type { PositionRowData } from "@/components/arkan-harb/PositionAssignmentTable";
import {
  ROLLCALL_STATUS_LABELS,
  isRollcallPresent,
} from "@/lib/db/models/DailyRollcall.shared";
import { cn } from "@/lib/utils";

interface ArkanHarbDashboardTabProps {
  userRole: string;
  totalOfficers: number;
  attendeesCount: number;
  activeLeavesCount: number;
  activeMissionsCount: number;
  absentCount: number;
  rollcallSubmitted: boolean;
  recentActivities: AuditLogPopulated[];
  weeklyTrend?: TelemetryDataPoint[];
  officersData?: RollcallOfficerData[];
  positionsData?: PositionRowData[];
  pendingLeavesCount?: number;
}

const STATUS_FILTER_OPTIONS: CustomSelectOption[] = [
  { value: "all", label: "كافة الحالات العملياتية" },
  { value: "present", label: "حاضر بالوحدة" },
  { value: "mission", label: "مأمورية / فرقة خارجية" },
  { value: "leave", label: "إجازة / راحة طبية" },
  { value: "other", label: "خارج التمام / أخرى" },
];

const ACTION_LABELS: Record<string, string> = {
  CREATE: "إضافة سجل",
  UPDATE: "تحديث بيانات",
  DELETE: "حذف سجل",
  STATUS_CHANGE: "تغيير حالة",
  REORDER: "إعادة ترتيب",
};

export function ArkanHarbDashboardTab({
  totalOfficers,
  attendeesCount,
  activeLeavesCount,
  activeMissionsCount,
  absentCount,
  rollcallSubmitted,
  recentActivities,
  weeklyTrend = [],
  officersData = [],
  positionsData = [],
  pendingLeavesCount = 0,
}: ArkanHarbDashboardTabProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [tableView, setTableView] = useState<"officers" | "activities">("officers");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [tableSearch, setTableSearch] = useState<string>("");
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  const navigateToTab = (tabId: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", tabId);
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  };

  const handleRefresh = () => {
    setIsRefreshing(true);
    router.refresh();
    setTimeout(() => setIsRefreshing(false), 450);
  };

  // Compute live operational breakdown from officersData when available
  const computedStats = useMemo(() => {
    if (officersData.length === 0) {
      const effectivePresent = rollcallSubmitted
        ? attendeesCount
        : Math.max(0, totalOfficers - activeLeavesCount - activeMissionsCount);
      return {
        present: effectivePresent,
        missions: activeMissionsCount,
        leaves: activeLeavesCount,
        other: Math.max(0, totalOfficers - effectivePresent - activeLeavesCount - activeMissionsCount),
      };
    }

    let present = 0;
    let missions = 0;
    let leaves = 0;
    let other = 0;

    for (const o of officersData) {
      if (isRollcallPresent(o.status)) {
        present++;
      } else if (
        o.status === "mission" ||
        o.status === "external_mission" ||
        o.status === "course" ||
        o.status === "travel_abroad"
      ) {
        missions++;
      } else if (
        o.status === "leave" ||
        o.status === "medical" ||
        o.status === "rest" ||
        o.status === "hospital"
      ) {
        leaves++;
      } else {
        other++;
      }
    }

    return { present, missions, leaves, other };
  }, [officersData, rollcallSubmitted, attendeesCount, totalOfficers, activeLeavesCount, activeMissionsCount]);

  // Positions occupancy metrics
  const totalPositions = positionsData.length;
  const occupiedPositions = useMemo(
    () => positionsData.filter((p) => Boolean(p.primaryOfficer)).length,
    [positionsData]
  );
  const occupancyPct =
    totalPositions > 0 ? Math.round((occupiedPositions / totalPositions) * 100) : 100;

  const attendancePct =
    totalOfficers > 0 ? Math.round((computedStats.present / totalOfficers) * 100) : 0;
  const activeReadyCount = computedStats.present + computedStats.missions;
  const readinessPct =
    totalOfficers > 0 ? Math.round((activeReadyCount / totalOfficers) * 100) : 0;

  // 1. Top KPI Metric Strip (Linear / Stripe Operate Style)
  const kpiMetrics: OperateKpiMetric[] = [
    {
      id: "total-force",
      label: "القوة الفاعلة بالوحدة",
      value: totalOfficers,
      unit: "ضابط",
      subtitle: "إجمالي الضباط على قوة الوحدة",
      icon: <Users className="w-4 h-4" />,
      trend: {
        value: `${readinessPct}%`,
        direction: readinessPct >= 75 ? "up" : "neutral",
        label: "نسبة الجاهزية",
      },
      progress: readinessPct,
      onClick: () => navigateToTab("rollcall"),
    },
    {
      id: "present-today",
      label: "تمام الحضور الفعلي",
      value: computedStats.present,
      unit: "ضابط",
      subtitle: rollcallSubmitted ? "تم اعتماد التمام اليومي رسمياً" : "قراءة التمام اللحظية (مسودة)",
      icon: <ShieldCheck className="w-4 h-4" />,
      trend: {
        value: `${attendancePct}%`,
        direction: attendancePct >= 65 ? "up" : "neutral",
        label: rollcallSubmitted ? "معتمد" : "قيد التسليم",
      },
      progress: attendancePct,
      onClick: () => navigateToTab("rollcall"),
    },
    {
      id: "active-missions",
      label: "مأموريات وفرق خارجية",
      value: computedStats.missions,
      unit: "ضابط",
      subtitle: "مكلفين بمأموريات وفرق رسمية",
      icon: <Compass className="w-4 h-4" />,
      trend: {
        value:
          totalOfficers > 0
            ? `${Math.round((computedStats.missions / totalOfficers) * 100)}%`
            : "0%",
        direction: computedStats.missions > 0 ? "up" : "neutral",
        label: "من إجمالي القوة",
      },
      progress:
        totalOfficers > 0 ? Math.round((computedStats.missions / totalOfficers) * 100) : 0,
      onClick: () => navigateToTab("missions"),
    },
    {
      id: "active-leaves",
      label: "إجازات وراحات سارية",
      value: computedStats.leaves,
      unit: "ضابط",
      subtitle:
        pendingLeavesCount > 0
          ? `${pendingLeavesCount} طلب إجازة بانتظار التصديق`
          : "جميع طلبات الإجازات مصدقة",
      icon: <ScrollText className="w-4 h-4" />,
      trend: {
        value:
          totalOfficers > 0
            ? `${Math.round((computedStats.leaves / totalOfficers) * 100)}%`
            : "0%",
        direction: "neutral",
        label: "نسبة الإجازات",
      },
      progress:
        totalOfficers > 0 ? Math.round((computedStats.leaves / totalOfficers) * 100) : 0,
      onClick: () => navigateToTab("leaves"),
    },
    {
      id: "positions-occupancy",
      label: "إشغال الهيكل التنظيمي",
      value: totalPositions > 0 ? `${occupiedPositions}/${totalPositions}` : totalOfficers,
      unit: totalPositions > 0 ? "وظيفة" : "ضابط",
      subtitle:
        totalPositions - occupiedPositions > 0
          ? `${totalPositions - occupiedPositions} وظيفة شاغرة بالهيكل`
          : "كافة الوظائف القيادية مسكنة",
      icon: <Briefcase className="w-4 h-4" />,
      trend: {
        value: `${occupancyPct}%`,
        direction: occupancyPct >= 80 ? "up" : "neutral",
        label: "نسبة التسكين",
      },
      progress: occupancyPct,
      onClick: () => navigateToTab("positions"),
    },
  ];

  // 2. Distribution Segments for Force Readiness
  const distributionSegments: DistributionSegment[] = [
    {
      id: "present",
      label: "حاضر بالوحدة (قوة فعلية)",
      subtext: "متواجدون بالوحدة والنوبتجيات الداخلية",
      count: computedStats.present,
      total: totalOfficers,
      tone: "primary",
      onClick: () => {
        setTableView("officers");
        setStatusFilter("present");
      },
    },
    {
      id: "mission",
      label: "مأموريات وفرق تعليمية وسفريات",
      subtext: "مكلفون بمهام خارجية أو فرق دراسية",
      count: computedStats.missions,
      total: totalOfficers,
      tone: "info",
      onClick: () => {
        setTableView("officers");
        setStatusFilter("mission");
      },
    },
    {
      id: "leave",
      label: "إجازات ميدانية وسنوية وراحات طبية",
      subtext: "إجازات معتمدة ومستشفى وراحات طبية",
      count: computedStats.leaves,
      total: totalOfficers,
      tone: "muted",
      onClick: () => {
        setTableView("officers");
        setStatusFilter("leave");
      },
    },
    {
      id: "other",
      label: "خارج التمام / حالات أخرى",
      subtext: "حالات خاصة أو انتظار تحديث التمام",
      count: computedStats.other || absentCount,
      total: totalOfficers,
      tone: "subtle",
      onClick: () => {
        setTableView("officers");
        setStatusFilter("other");
      },
    },
  ];

  // 3. Filtered Officers Data for the Table
  const filteredOfficers = useMemo(() => {
    const q = tableSearch.trim().toLowerCase();
    return officersData.filter((row) => {
      if (statusFilter === "present" && !isRollcallPresent(row.status)) return false;
      if (
        statusFilter === "mission" &&
        row.status !== "mission" &&
        row.status !== "external_mission" &&
        row.status !== "course" &&
        row.status !== "travel_abroad"
      ) {
        return false;
      }
      if (
        statusFilter === "leave" &&
        row.status !== "leave" &&
        row.status !== "medical" &&
        row.status !== "rest" &&
        row.status !== "hospital"
      ) {
        return false;
      }
      if (
        statusFilter === "other" &&
        (isRollcallPresent(row.status) ||
          row.status === "mission" ||
          row.status === "external_mission" ||
          row.status === "course" ||
          row.status === "travel_abroad" ||
          row.status === "leave" ||
          row.status === "medical" ||
          row.status === "rest" ||
          row.status === "hospital")
      ) {
        return false;
      }

      if (!q) return true;
      return (
        row.fullName.toLowerCase().includes(q) ||
        row.rankLabel.toLowerCase().includes(q) ||
        row.militaryId.toLowerCase().includes(q) ||
        (row.primaryPositionTitle || "").toLowerCase().includes(q) ||
        (ROLLCALL_STATUS_LABELS[row.status] || "").toLowerCase().includes(q)
      );
    });
  }, [officersData, statusFilter, tableSearch]);

  // 4. Filtered Activities Data for the Table
  const filteredActivities = useMemo(() => {
    const q = tableSearch.trim().toLowerCase();
    if (!q) return recentActivities;
    return recentActivities.filter((log) => {
      const actor = (log.userId?.fullName || log.userId?.username || log.userName || "").toLowerCase();
      return (
        actor.includes(q) ||
        (log.description || "").toLowerCase().includes(q) ||
        (log.action || "").toLowerCase().includes(q)
      );
    });
  }, [recentActivities, tableSearch]);

  // Table Columns — Officers Operational Status (Strictly adhering to Sapphire Archive Mandate)
  const officerColumns: TableColumn<RollcallOfficerData>[] = [
    {
      header: "الرتبة",
      accessor: "rankLabel",
      minWidth: true,
      render: (val) => (
        <span className="text-xs font-bold text-(--app-muted-foreground)">{String(val)}</span>
      ),
    },
    {
      header: "الاسم والبيانات العسكرية",
      accessor: "fullName",
      minWidth: true,
      render: (_, row) => (
        <div className="flex flex-col">
          <button
            type="button"
            onClick={() => navigateToTab("rollcall")}
            className="text-right text-xs font-black text-(--color-primary) hover:underline hover:text-(--app-info) transition-colors cursor-pointer"
          >
            {row.fullName}
          </button>
          <span className="text-[10px] font-bold text-(--app-muted-foreground) tabular-nums">
            الرقم العسكري: {row.militaryId} · الأقدمية: {row.seniorityNumber}
          </span>
        </div>
      ),
    },
    {
      header: "الوظيفة المسكن عليها",
      accessor: "primaryPositionTitle",
      render: (_, row) => (
        <div className="flex flex-col">
          <span className="text-xs font-bold text-(--app-muted-foreground)">
            {row.primaryPositionTitle || "غير مسكن"}
          </span>
          {row.substitutePositionTitle && row.substitutePositionTitle !== "-" && (
            <span className="text-[10px] font-bold text-(--app-muted-foreground)/75">
              بديل: {row.substitutePositionTitle}
            </span>
          )}
        </div>
      ),
    },
    {
      header: "الموقف العملياتي اليوم",
      accessor: "status",
      headerAlign: "center",
      cellAlign: "center",
      render: (_, row) => {
        const label = ROLLCALL_STATUS_LABELS[row.status] || row.status;
        const details =
          row.missionTitle || row.leaveTypeLabel || row.dutyTitle || row.lockReason || "";
        return (
          <div className="inline-flex flex-col items-center">
            <span className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-(--app-surface-container-low) text-(--app-muted-foreground) border border-(--app-border)">
              {label}
            </span>
            {details && (
              <span className="text-[10px] font-bold text-(--app-muted-foreground)/80 mt-0.5 max-w-[180px] truncate">
                {details}
              </span>
            )}
          </div>
        );
      },
    },
    {
      header: "آخر عودة / مدة التواجد",
      accessor: "presenceDurationDays",
      headerAlign: "center",
      cellAlign: "center",
      render: (_, row) => (
        <div className="flex flex-col items-center tabular-nums">
          <span className="text-xs font-bold text-(--app-muted-foreground)">
            {row.presenceDurationDays > 0 ? `${row.presenceDurationDays} يوم بالوحدة` : "-"}
          </span>
          {row.lastReturnDateOnly && row.lastReturnDateOnly !== "-" && (
            <span className="text-[10px] font-bold text-(--app-muted-foreground)/75">
              عودة: {row.lastReturnDateOnly}
            </span>
          )}
        </div>
      ),
    },
    {
      header: "الإجراءات",
      headerAlign: "center",
      cellAlign: "center",
      className: "w-24",
      render: () => (
        <div className="flex items-center justify-center gap-1">
          <ActionButton
            icon={<ExternalLink className="w-4 h-4" />}
            color="btn-action-primary"
            title="فتح في التمام اليومي"
            onClick={() => navigateToTab("rollcall")}
          />
        </div>
      ),
    },
  ];

  // Table Columns — Recent Audit Activities
  const activityColumns: TableColumn<AuditLogPopulated>[] = [
    {
      header: "المنفذ / المسؤول",
      accessor: "userName",
      render: (_, log) => (
        <span className="text-xs font-black text-(--color-primary)">
          {log.userId?.fullName || log.userId?.username || log.userName || "النظام"}
        </span>
      ),
    },
    {
      header: "نوع الإجراء",
      accessor: "action",
      headerAlign: "center",
      cellAlign: "center",
      render: (val) => (
        <span className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-(--app-surface-container-low) text-(--app-muted-foreground) border border-(--app-border)">
          {ACTION_LABELS[String(val || "")] || String(val || "عملية نظام")}
        </span>
      ),
    },
    {
      header: "تفاصيل العملية",
      accessor: "description",
      render: (val) => (
        <span className="text-xs font-bold text-(--app-muted-foreground) whitespace-normal line-clamp-1 max-w-xl">
          {String(val || "-")}
        </span>
      ),
    },
    {
      header: "التوقيت",
      accessor: "createdAt",
      headerAlign: "center",
      cellAlign: "center",
      render: (val) => {
        const dateObj = val ? new Date(String(val)) : null;
        const formatted =
          dateObj && !isNaN(dateObj.getTime())
            ? format(dateObj, "dd-MM-yyyy · hh:mm a", { locale: ar })
            : "-";
        return (
          <span className="inline-flex items-center gap-1.5 text-xs font-bold text-(--app-muted-foreground) tabular-nums">
            <Clock className="w-3.5 h-3.5" />
            {formatted}
          </span>
        );
      },
    },
    {
      header: "الإجراءات",
      headerAlign: "center",
      cellAlign: "center",
      className: "w-20",
      render: () => (
        <div className="flex items-center justify-center">
          <ActionButton
            icon={<Activity className="w-4 h-4" />}
            color="btn-action-primary"
            title="عرض سجل القرارات والتنبيهات"
            onClick={() => navigateToTab("decisions")}
          />
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-5">
      {/* 1. Top KPI Metric Strip */}
      <OperateKpiStrip metrics={kpiMetrics} columns={5} isLoading={isRefreshing} />

      {/* 2. Telemetry Charts Section */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5">
        <div className="xl:col-span-7">
          <OperateTelemetryChart
            title="مؤشر التمام والجاهزية خلال 7 أيام"
            subtitle="مقارنة أعداد الضباط الحاضرين بالوحدة مقابل المأموريات والإجازات اليومية"
            primaryLabel="حاضر بالوحدة"
            secondaryLabel="خارج الوحدة (إجازة / مأمورية)"
            data={weeklyTrend}
            totalPrimaryLabel="متوسط الحضور اليومي"
            totalPrimaryValue={
              weeklyTrend.length > 0
                ? `${Math.round(
                    weeklyTrend.reduce((acc, d) => acc + d.primaryValue, 0) /
                      Math.max(1, weeklyTrend.filter((d) => d.primaryValue > 0).length)
                  )} ضابط`
                : `${computedStats.present} ضابط`
            }
            isLoading={isRefreshing}
          />
        </div>

        <div className="xl:col-span-5">
          <OperateDistributionPanel
            title="توزيع الموقف العملياتي للقوة الفاعلة"
            subtitle="انقر على أي فئة لفلترة جدول القوة أدناه مباشرة"
            totalLabel="إجمالي القوة"
            totalValue={`${totalOfficers} ضابط`}
            segments={distributionSegments}
            footerNote={
              rollcallSubmitted
                ? "تم اعتماد وإغلاق كشف التمام اليومي رسمياً"
                : "بيانات التمام اليومي في وضع المسودة وقابلة للتحديث"
            }
            isLoading={isRefreshing}
          />
        </div>
      </div>

      {/* 3. Advanced Data Table Control Bar + Self-Contained MainTable */}
      <div className="space-y-3">
        <div className="bg-(--app-surface) border border-(--app-border) rounded-2xl p-3.5 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Left/Right View Switcher Pills */}
          <div className="flex items-center gap-1.5 bg-(--app-surface-container-low) p-1 rounded-xl border border-(--app-border)/60 self-start">
            <button
              type="button"
              onClick={() => setTableView("officers")}
              className={cn(
                "px-3.5 py-1.5 rounded-lg text-xs font-extrabold transition-colors cursor-pointer flex items-center gap-2",
                tableView === "officers"
                  ? "bg-(--color-primary) text-white"
                  : "text-(--app-muted-foreground) hover:text-(--color-primary)"
              )}
            >
              <span>الموقف العملياتي للضباط</span>
              <span
                className={cn(
                  "px-1.5 py-0.5 rounded text-[10px] font-black tabular-nums",
                  tableView === "officers"
                    ? "bg-white/20 text-white"
                    : "bg-(--app-surface-container) text-(--app-muted-foreground)"
                )}
              >
                {filteredOfficers.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setTableView("activities")}
              className={cn(
                "px-3.5 py-1.5 rounded-lg text-xs font-extrabold transition-colors cursor-pointer flex items-center gap-2",
                tableView === "activities"
                  ? "bg-(--color-primary) text-white"
                  : "text-(--app-muted-foreground) hover:text-(--color-primary)"
              )}
            >
              <span>سجل التحركات والعمليات الأخيرة</span>
              <span
                className={cn(
                  "px-1.5 py-0.5 rounded text-[10px] font-black tabular-nums",
                  tableView === "activities"
                    ? "bg-white/20 text-white"
                    : "bg-(--app-surface-container) text-(--app-muted-foreground)"
                )}
              >
                {filteredActivities.length}
              </span>
            </button>
          </div>

          {/* Inline Filters & Search Controls */}
          <div className="flex flex-wrap items-center gap-2.5 flex-1 md:justify-end">
            {/* Search Input */}
            <div className="relative flex-1 sm:flex-initial sm:w-64">
              <Search className="w-4 h-4 text-(--app-muted-foreground) absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={tableSearch}
                onChange={(e) => setTableSearch(e.target.value)}
                placeholder={
                  tableView === "officers"
                    ? "فلترة بالاسم، الرتبة، الوظيفة..."
                    : "فلترة في سجل العمليات..."
                }
                className="w-full pr-9 pl-8 py-2 bg-(--app-surface-container-low) border border-(--app-border) rounded-xl text-xs font-bold text-(--app-foreground) placeholder:text-(--app-muted-foreground) focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-right"
              />
              {tableSearch && (
                <button
                  type="button"
                  onClick={() => setTableSearch("")}
                  className="absolute left-2.5 top-1/2 -translate-y-1/2 text-(--app-muted-foreground) hover:text-(--color-primary) cursor-pointer"
                  title="مسح البحث"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* CustomSelect Status Filter (for Officers View) */}
            {tableView === "officers" && (
              <div className="w-full sm:w-52">
                <CustomSelect
                  id="dashboard-officer-status-filter"
                  value={statusFilter}
                  onChange={setStatusFilter}
                  options={STATUS_FILTER_OPTIONS}
                  placeholder="تصفية حسب الحالة..."
                />
              </div>
            )}

            {/* Refresh / Skeleton State Trigger */}
            <button
              type="button"
              onClick={handleRefresh}
              disabled={isRefreshing}
              title="تحديث البيانات الفورية"
              className="p-2 rounded-xl bg-(--app-surface-container-low) border border-(--app-border) text-(--color-primary) hover:bg-(--app-surface-container) transition-colors cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={cn("w-4 h-4", isRefreshing && "animate-spin")} />
            </button>
          </div>
        </div>

        {/* Self-Contained MainTable (Never wrapped in outer SectionWrapper per AGENTS.md) */}
        {tableView === "officers" ? (
          <MainTable
            columns={officerColumns}
            data={filteredOfficers}
            showSerialNumber
            isLoading={isRefreshing}
            loadingText="جاري تحديث الموقف العملياتي للضباط..."
            emptyTitle="لا توجد سجلات مطابقة للفلتر الحالي"
            emptyDescription="جرب تغيير فلتر الحالة العملياتية أو مسح نص البحث لعرض كافة ضباط القوة الفاعلة"
            emptyIcon={Users}
          />
        ) : (
          <MainTable
            columns={activityColumns}
            data={filteredActivities}
            showSerialNumber
            isLoading={isRefreshing}
            loadingText="جاري تحميل سجل التحركات الأخيرة..."
            emptyTitle="لا توجد عمليات مسجلة"
            emptyDescription="لم يتم العثور على تحركات مطابقة في سجل عمليات فرع أركان الحرب"
            emptyIcon={Activity}
          />
        )}
      </div>
    </div>
  );
}
