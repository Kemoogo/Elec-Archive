"use client";

import React, { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  Activity,
  Pill,
  Search,
  RefreshCw,
  Eye,
  Edit,
  Stethoscope,
  PackageCheck,
  AlertCircle,
  Clock,
  FileText,
  ArrowUpLeft,
} from "lucide-react";
import MainTable, { type TableColumn } from "@/components/ui/Table";
import { CustomSelect, type CustomSelectOption } from "@/components/ui/custom-select";
import {
  OperateKpiStrip,
  OperateTelemetryChart,
  OperateDistributionPanel,
  type OperateKpiMetric,
  type TelemetryDataPoint,
  type DistributionSegment,
} from "@/components/ui/operate-kpi-strip";
import { formatDateDisplay } from "@/lib/utils/date-display";
import { ViewVisitModal } from "./ViewVisitModal";
import { EditVisitModal } from "./EditVisitModal";
import { MedicineDetailModal } from "./MedicineDetailModal";
import type {
  MedicalDashboardStats,
  MedicalDashboardVisitItem,
  MedicalDashboardMedicineItem,
  MedicalDashboardPatientItem,
} from "@/lib/medical/types";

interface MedicalDashboardTabProps {
  stats: MedicalDashboardStats;
  visits: MedicalDashboardVisitItem[];
  medicines: MedicalDashboardMedicineItem[];
  patients: MedicalDashboardPatientItem[];
  permissions?: "none" | "view" | "edit";
  onNavigateTab?: (tab: string) => void;
}

const VISIT_FILTER_OPTIONS: CustomSelectOption[] = [
  { value: "all", label: "كافة الزيارات الطبية" },
  { value: "with_rest", label: "حالات ممنوحة راحة طبية" },
  { value: "no_rest", label: "كشف وصرف علاج بدون راحة" },
  { value: "non_fit", label: "حالات اللياقة غير المكتملة" },
];

const MEDICINE_FILTER_OPTIONS: CustomSelectOption[] = [
  { value: "all", label: "كافة أصناف الصيدلية" },
  { value: "valid", label: "مخزون آمن وصالح" },
  { value: "low_stock", label: "تحت الحد الأدنى (نواقص)" },
  { value: "expired", label: "أصناف منتهية الصلاحية" },
];

const REST_TYPE_LABELS: Record<string, string> = {
  none: "بدون راحة",
  ward: "راحة عنبر",
  home: "راحة منزلية",
  hospital: "حجز مستشفى",
  exemption: "إعفاء مجهود",
};

const DAY_NAMES_AR = ["الأحد", "الإثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];

function TableActionBtn({
  icon,
  title,
  onClick,
}: {
  icon: React.ReactNode;
  title: string;
  onClick: () => void;
}) {
  return (
    <div className="relative flex flex-col items-center group">
      <button
        type="button"
        onClick={onClick}
        className="p-1.5 rounded-lg transition-all btn-action-primary text-(--color-primary) hover:text-(--app-info) relative cursor-pointer"
      >
        {icon}
      </button>
      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50 w-max max-w-[200px] whitespace-normal bg-(--app-foreground) text-(--app-surface) text-[10px] font-bold px-2.5 py-1.5 rounded-xl shadow-2xl hidden group-hover:block pointer-events-none border border-(--app-border)/20">
        {title}
        <div className="absolute top-full left-1/2 -translate-x-1/2 border-x-4 border-x-transparent border-t-4 border-t-(--app-foreground)" />
      </div>
    </div>
  );
}

export function MedicalDashboardTab({
  stats,
  visits,
  medicines,
  patients,
  permissions = "view",
  onNavigateTab,
}: MedicalDashboardTabProps) {
  const router = useRouter();
  const [tableView, setTableView] = useState<"visits" | "medicines">("visits");
  const [searchQuery, setSearchQuery] = useState("");
  const [visitFilter, setVisitFilter] = useState("all");
  const [medicineFilter, setMedicineFilter] = useState("all");
  const [isRefreshing, setIsRefreshing] = useState(false);

  const [viewVisitId, setViewVisitId] = useState<string | null>(null);
  const [editVisitId, setEditVisitId] = useState<string | null>(null);
  const [selectedMedicineId, setSelectedMedicineId] = useState<string | null>(null);

  const handleRefresh = () => {
    setIsRefreshing(true);
    router.refresh();
    setTimeout(() => setIsRefreshing(false), 450);
  };

  // Compute inventory metrics
  const validMedicinesCount = useMemo(
    () =>
      medicines.filter((m) => !m.isExpired && m.quantity >= m.minThreshold && m.quantity > 0)
        .length,
    [medicines]
  );

  const stockEfficiencyPct =
    stats.totalMedicines > 0
      ? Math.round((validMedicinesCount / stats.totalMedicines) * 100)
      : 100;

  const restVisitsCount = useMemo(
    () => visits.filter((v) => v.restType && v.restType !== "none" && (v.restDays ?? 0) > 0).length,
    [visits]
  );

  // Compute 7-Day Telemetry Series (Visits & Dispensed Units per day)
  const telemetryData: TelemetryDataPoint[] = useMemo(() => {
    const points: TelemetryDataPoint[] = [];
    const today = new Date();
    today.setHours(23, 59, 59, 999);

    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const dateStr = d.toISOString().slice(0, 10);
      const dayName = DAY_NAMES_AR[d.getDay()] || "";

      const dayVisits = visits.filter((v) => v.visitDate.slice(0, 10) === dateStr);
      const visitCount = dayVisits.length;
      const dispensedUnits = dayVisits.reduce(
        (acc, v) =>
          acc +
          v.dispensedMedicines.reduce((sum, item) => sum + (item.quantity || 0), 0),
        0
      );

      points.push({
        label: dayName,
        sublabel: `${d.getDate()}/${d.getMonth() + 1}`,
        primaryValue: visitCount,
        secondaryValue: dispensedUnits,
      });
    }
    return points;
  }, [visits]);

  const weeklyVisitsTotal = useMemo(
    () => telemetryData.reduce((acc, p) => acc + p.primaryValue, 0),
    [telemetryData]
  );
  const dailyAvgVisits = Math.round((weeklyVisitsTotal / 7) * 10) / 10;
  const visitsDeltaPct =
    dailyAvgVisits > 0
      ? Math.round(((stats.visitsToday - dailyAvgVisits) / dailyAvgVisits) * 100)
      : 0;

  // 1. Top KPI Strip Items
  const kpiItems: OperateKpiMetric[] = [
    {
      id: "visits-today",
      label: "تردد العيادة اليومي",
      value: stats.visitsToday,
      unit: "زيارة",
      subtitle: `المتوسط اليومي: ${dailyAvgVisits} زيارة`,
      icon: <Stethoscope className="w-4 h-4" />,
      trend: {
        value: `${visitsDeltaPct >= 0 ? "+" : ""}${visitsDeltaPct}%`,
        direction: visitsDeltaPct > 0 ? "up" : visitsDeltaPct < 0 ? "down" : "neutral",
      },
      progress: Math.min(100, Math.round((stats.visitsToday / Math.max(10, dailyAvgVisits * 1.5)) * 100)),
      onClick: () => {
        setTableView("visits");
        setVisitFilter("all");
      },
    },
    {
      id: "stock-efficiency",
      label: "كفاءة المخزون الدوائي",
      value: `${validMedicinesCount}/${stats.totalMedicines}`,
      unit: `(${stockEfficiencyPct}%)`,
      subtitle: `${patients.length} ملف طبي نشط بالعيادة`,
      icon: <PackageCheck className="w-4 h-4" />,
      trend: {
        value: `${stockEfficiencyPct}%`,
        direction: stockEfficiencyPct >= 80 ? "up" : "down",
      },
      progress: stockEfficiencyPct,
      onClick: () => {
        setTableView("medicines");
        setMedicineFilter("valid");
      },
    },
    {
      id: "low-stock",
      label: "نواقص تحت الحد الأدنى",
      value: stats.lowStockCount,
      unit: "صنف دوائي",
      subtitle: stats.lowStockCount > 0 ? "يتطلب دعم وإمداد طبي" : "المخزون فوق الحد الآمن",
      icon: <Pill className="w-4 h-4" />,
      trend: {
        value:
          stats.totalMedicines > 0
            ? `${Math.round((stats.lowStockCount / stats.totalMedicines) * 100)}%`
            : "0%",
        direction: stats.lowStockCount > 0 ? "down" : "neutral",
      },
      progress:
        stats.totalMedicines > 0
          ? Math.round((stats.lowStockCount / stats.totalMedicines) * 100)
          : 0,
      onClick: () => {
        setTableView("medicines");
        setMedicineFilter("low_stock");
      },
    },
    {
      id: "expired-stock",
      label: "أصناف منتهية الصلاحية",
      value: stats.expiredCount,
      unit: "صنف",
      subtitle: `${restVisitsCount} حالة راحة طبية مسجلة مؤخراً`,
      icon: <AlertCircle className="w-4 h-4" />,
      trend: {
        value: `${restVisitsCount} راحة`,
        direction: stats.expiredCount > 0 ? "down" : "neutral",
      },
      progress:
        stats.totalMedicines > 0
          ? Math.round((stats.expiredCount / stats.totalMedicines) * 100)
          : 0,
      onClick: () => {
        setTableView("medicines");
        setMedicineFilter("expired");
      },
    },
  ];

  // 2. Distribution Segments
  const distributionSegments: DistributionSegment[] = [
    {
      id: "valid-meds",
      label: "أصناف دوائية آمنة ومتوفرة",
      count: validMedicinesCount,
      total: stats.totalMedicines,
      tone: "primary",
      onClick: () => {
        setTableView("medicines");
        setMedicineFilter("valid");
      },
    },
    {
      id: "low-meds",
      label: "أصناف تحت الحد الأدنى (نواقص)",
      count: stats.lowStockCount,
      total: stats.totalMedicines,
      tone: "info",
      onClick: () => {
        setTableView("medicines");
        setMedicineFilter("low_stock");
      },
    },
    {
      id: "expired-meds",
      label: "أصناف منتهية الصلاحية",
      count: stats.expiredCount,
      total: stats.totalMedicines,
      tone: "muted",
      onClick: () => {
        setTableView("medicines");
        setMedicineFilter("expired");
      },
    },
    {
      id: "rest-visits",
      label: "زيارات ممنوحة راحة طبية",
      count: restVisitsCount,
      total: visits.length,
      tone: "subtle",
      onClick: () => {
        setTableView("visits");
        setVisitFilter("with_rest");
      },
    },
  ];

  // 3. Filtered Table Data
  const filteredVisits = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return visits.filter((v) => {
      if (visitFilter === "with_rest" && (!v.restType || v.restType === "none" || !v.restDays)) {
        return false;
      }
      if (visitFilter === "no_rest" && v.restType && v.restType !== "none" && (v.restDays ?? 0) > 0) {
        return false;
      }
      if (visitFilter === "non_fit" && (!v.fitnessCategory || v.fitnessCategory === "لائق")) {
        return false;
      }
      if (!q) return true;
      return (
        v.patientName.toLowerCase().includes(q) ||
        v.patientId.toLowerCase().includes(q) ||
        (v.diagnosis || "").toLowerCase().includes(q)
      );
    });
  }, [visits, searchQuery, visitFilter]);

  const filteredMedicines = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return medicines.filter((m) => {
      if (medicineFilter === "valid" && (m.isExpired || m.quantity < m.minThreshold || m.quantity <= 0)) {
        return false;
      }
      if (medicineFilter === "low_stock" && m.quantity >= m.minThreshold) {
        return false;
      }
      if (medicineFilter === "expired" && !m.isExpired) {
        return false;
      }
      if (!q) return true;
      return (
        m.name.toLowerCase().includes(q) ||
        (m.concentration || "").toLowerCase().includes(q) ||
        (m.unit || "").toLowerCase().includes(q)
      );
    });
  }, [medicines, searchQuery, medicineFilter]);

  // 4. Table Columns
  const visitColumns: TableColumn<MedicalDashboardVisitItem>[] = [
    {
      header: "الرقم العسكري / الهوية",
      accessor: "patientId",
      isNumeric: true,
      render: (val) => (
        <span className="font-mono text-xs font-bold text-(--app-muted-foreground) tabular-nums">
          {val as string}
        </span>
      ),
    },
    {
      header: "اسم المريض",
      accessor: "patientName",
      render: (val, row) => (
        <button
          type="button"
          onClick={() => setViewVisitId(row._id)}
          className="font-black text-xs text-(--color-primary) hover:underline hover:text-(--app-info) cursor-pointer border-none bg-transparent text-right transition-colors"
        >
          {val as string}
        </button>
      ),
    },
    {
      header: "تاريخ الكشف",
      accessor: "visitDate",
      render: (val) => (
        <span className="font-mono text-xs font-bold text-(--app-muted-foreground) tabular-nums">
          {formatDateDisplay(val as string)}
        </span>
      ),
    },
    {
      header: "التشخيص الطبي",
      accessor: "diagnosis",
      render: (val) => (
        <span className="text-xs font-bold text-(--app-muted-foreground) line-clamp-1 max-w-[260px]">
          {(val as string) || "-"}
        </span>
      ),
    },
    {
      header: "الراحة الممنوحة",
      accessor: "restType",
      cellAlign: "center",
      headerAlign: "center",
      render: (_, row) => {
        if (!row.restType || row.restType === "none" || !row.restDays) {
          return <span className="text-xs font-bold text-(--app-muted-foreground)">-</span>;
        }
        const label = REST_TYPE_LABELS[row.restType] || row.restType;
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-[11px] font-extrabold bg-(--color-primary)/10 text-(--color-primary) border border-(--color-primary)/20 tabular-nums">
            <Clock className="w-3 h-3" />
            {label} ({row.restDays} يوم)
          </span>
        );
      },
    },
    {
      header: "الأدوية المنصرفة",
      accessor: "dispensedMedicines",
      cellAlign: "center",
      headerAlign: "center",
      render: (_, row) => {
        const count = row.dispensedMedicines?.length || 0;
        if (count === 0) {
          return <span className="text-xs font-bold text-(--app-muted-foreground)">بدون صرف</span>;
        }
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-(--app-surface-container) text-(--app-muted-foreground) border border-(--app-border) tabular-nums">
            {count} صنف
          </span>
        );
      },
    },
    {
      header: "الإجراءات",
      accessor: "_id",
      cellAlign: "center",
      headerAlign: "center",
      render: (_, row) => (
        <div className="flex items-center justify-center gap-1">
          <TableActionBtn
            icon={<Eye className="w-4 h-4" />}
            title="عرض تفاصيل الزيارة"
            onClick={() => setViewVisitId(row._id)}
          />
          {permissions === "edit" && (
            <TableActionBtn
              icon={<Edit className="w-4 h-4" />}
              title="تعديل بيانات الزيارة"
              onClick={() => setEditVisitId(row._id)}
            />
          )}
        </div>
      ),
    },
  ];

  const medicineColumns: TableColumn<MedicalDashboardMedicineItem>[] = [
    {
      header: "اسم الدواء",
      accessor: "name",
      render: (val, med) => (
        <button
          type="button"
          onClick={() => setSelectedMedicineId(med._id)}
          className="text-right font-black text-xs text-(--color-primary) hover:underline hover:text-(--app-info) cursor-pointer transition-colors"
        >
          {val as string}
        </button>
      ),
    },
    {
      header: "التركيز / الوحدة",
      accessor: "concentration",
      render: (_, med) => (
        <span className="text-xs font-bold text-(--app-muted-foreground)">
          {med.concentration ? `${med.concentration} • ${med.unit}` : med.unit}
        </span>
      ),
    },
    {
      header: "الرصيد المتاح",
      accessor: "quantity",
      isNumeric: true,
      cellAlign: "center",
      headerAlign: "center",
      render: (val) => (
        <span className="font-mono text-xs font-black text-(--app-muted-foreground) tabular-nums">
          {val as number}
        </span>
      ),
    },
    {
      header: "الحد الأدنى",
      accessor: "minThreshold",
      isNumeric: true,
      cellAlign: "center",
      headerAlign: "center",
      render: (val) => (
        <span className="font-mono text-xs font-bold text-(--app-muted-foreground) tabular-nums">
          {val as number}
        </span>
      ),
    },
    {
      header: "أقرب تاريخ صلاحية",
      accessor: "expiryDate",
      cellAlign: "center",
      headerAlign: "center",
      render: (val) => (
        <span className="font-mono text-xs font-bold text-(--app-muted-foreground) tabular-nums">
          {formatDateDisplay(val as string)}
        </span>
      ),
    },
    {
      header: "حالة الصنف",
      accessor: "isExpired",
      cellAlign: "center",
      headerAlign: "center",
      render: (_, med) => {
        if (med.isExpired) {
          return (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-[11px] font-extrabold bg-(--app-surface-container-high) text-(--app-muted-foreground) border border-(--app-border)">
              منتهي الصلاحية
            </span>
          );
        }
        if (med.quantity < med.minThreshold) {
          return (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-[11px] font-extrabold bg-(--color-primary)/10 text-(--color-primary) border border-(--color-primary)/20">
              تحت الحد الأدنى
            </span>
          );
        }
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-[11px] font-bold bg-(--app-surface-container) text-(--app-muted-foreground) border border-(--app-border)">
            متوفر وآمن
          </span>
        );
      },
    },
    {
      header: "الإجراءات",
      accessor: "_id",
      cellAlign: "center",
      headerAlign: "center",
      render: (_, med) => (
        <div className="flex items-center justify-center gap-1">
          <TableActionBtn
            icon={<FileText className="w-4 h-4" />}
            title="فحص الدفعات وسجل الصرف"
            onClick={() => setSelectedMedicineId(med._id)}
          />
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      {/* 1. Top KPI Metric Strip */}
      <OperateKpiStrip metrics={kpiItems} isLoading={isRefreshing} />

      {/* 2. Telemetry Charts & Inventory Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        <div className="lg:col-span-8">
          <OperateTelemetryChart
            title="المؤشر الزمني لتردد العيادة وصرف الأدوية (آخر 7 أيام)"
            subtitle="مقارنة يومية بين عدد الكشوفات الطبية وإجمالي الوحدات الدوائية المنصرفة"
            data={telemetryData}
            primaryLabel="الكشوفات الطبية"
            secondaryLabel="الوحدات الدوائية المنصرفة"
            totalPrimaryLabel="إجمالي كشوفات الأسبوع"
            totalPrimaryValue={weeklyVisitsTotal}
            isLoading={isRefreshing}
          />
        </div>
        <div className="lg:col-span-4">
          <OperateDistributionPanel
            title="توزيع كفاءة الصيدلية والتوصيات الطبية"
            subtitle="انقر على أي شريحة لفلترة الجدول التشغيلي مباشرة"
            totalLabel="إجمالي الأصناف"
            totalValue={stats.totalMedicines}
            segments={distributionSegments}
            isLoading={isRefreshing}
          />
        </div>
      </div>

      {/* 3. Operate Control Bar + Advanced Data Table */}
      <div className="space-y-3">
        <div className="bg-(--app-surface) border border-(--app-border) rounded-2xl p-3 flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
          {/* View Mode Switcher */}
          <div className="flex items-center gap-1.5 bg-(--app-surface-container-low) p-1 rounded-xl border border-(--app-border)">
            <button
              type="button"
              onClick={() => setTableView("visits")}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer ${
                tableView === "visits"
                  ? "bg-(--color-primary) text-white"
                  : "text-(--app-muted-foreground) hover:text-(--color-primary)"
              }`}
            >
              <Activity className="w-3.5 h-3.5" />
              <span>سجل أحدث الزيارات الطبية</span>
              <span
                className={`px-1.5 py-0.2 rounded text-[10px] font-mono tabular-nums ${
                  tableView === "visits"
                    ? "bg-white/20 text-white"
                    : "bg-(--app-surface-container) text-(--app-muted-foreground)"
                }`}
              >
                {filteredVisits.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setTableView("medicines")}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer ${
                tableView === "medicines"
                  ? "bg-(--color-primary) text-white"
                  : "text-(--app-muted-foreground) hover:text-(--color-primary)"
              }`}
            >
              <Pill className="w-3.5 h-3.5" />
              <span>رقابة مخزون الأدوية والنواقص</span>
              <span
                className={`px-1.5 py-0.2 rounded text-[10px] font-mono tabular-nums ${
                  tableView === "medicines"
                    ? "bg-white/20 text-white"
                    : "bg-(--app-surface-container) text-(--app-muted-foreground)"
                }`}
              >
                {filteredMedicines.length}
              </span>
            </button>
          </div>

          {/* Search, Filter & Quick Actions */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative flex-1 sm:w-64 min-w-[200px]">
              <Search className="w-3.5 h-3.5 text-(--app-muted-foreground) absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={
                  tableView === "visits"
                    ? "بحث باسم المريض، الرقم، أو التشخيص..."
                    : "بحث باسم الدواء أو التركيز..."
                }
                className="w-full pr-8 pl-3 py-1.5 bg-(--app-surface-container-low) border border-(--app-border) rounded-xl text-xs font-bold text-(--app-foreground) placeholder:text-(--app-muted-foreground) focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
              />
            </div>

            <div className="w-52">
              {tableView === "visits" ? (
                <CustomSelect
                  value={visitFilter}
                  onChange={setVisitFilter}
                  options={VISIT_FILTER_OPTIONS}
                  placeholder="تصفية الزيارات..."
                />
              ) : (
                <CustomSelect
                  value={medicineFilter}
                  onChange={setMedicineFilter}
                  options={MEDICINE_FILTER_OPTIONS}
                  placeholder="تصفية الأصناف..."
                />
              )}
            </div>

            {onNavigateTab && (
              <button
                type="button"
                onClick={() => onNavigateTab(tableView === "visits" ? "visits" : "medicines")}
                className="px-3 py-1.5 rounded-xl bg-(--app-surface-container-low) border border-(--app-border) text-xs font-bold text-(--color-primary) hover:text-(--app-info) hover:border-(--color-primary)/30 transition-all flex items-center gap-1.5 cursor-pointer"
                title="فتح السجل الكامل"
              >
                <span>السجل الكامل</span>
                <ArrowUpLeft className="w-3.5 h-3.5" />
              </button>
            )}

            <button
              type="button"
              onClick={handleRefresh}
              className="p-2 rounded-xl bg-(--app-surface-container-low) border border-(--app-border) text-(--color-primary) hover:text-(--app-info) hover:border-(--color-primary)/30 transition-all cursor-pointer"
              title="تحديث البيانات الفوري"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin" : ""}`} />
            </button>
          </div>
        </div>

        {/* MainTable */}
        {tableView === "visits" ? (
          <MainTable
            columns={visitColumns}
            data={filteredVisits}
            showSerialNumber
            isLoading={isRefreshing}
            emptyTitle="لا توجد زيارات طبية مطابقة"
            emptyDescription="جرب تغيير معايير البحث أو الفلترة لعرض السجلات الطبية."
            emptyIcon={Activity}
          />
        ) : (
          <MainTable
            columns={medicineColumns}
            data={filteredMedicines}
            showSerialNumber
            isLoading={isRefreshing}
            emptyTitle="لا توجد أصناف دوائية مطابقة"
            emptyDescription="جميع الأصناف ضمن هذا التصنيف فارغة حالياً."
            emptyIcon={Pill}
          />
        )}
      </div>

      {/* Modals */}
      {viewVisitId && (
        <ViewVisitModal visitId={viewVisitId} onClose={() => setViewVisitId(null)} />
      )}
      {editVisitId && (
        <EditVisitModal visitId={editVisitId} onClose={() => setEditVisitId(null)} />
      )}
      {selectedMedicineId && (
        <MedicineDetailModal
          medicineId={selectedMedicineId}
          onClose={() => setSelectedMedicineId(null)}
        />
      )}
    </div>
  );
}
