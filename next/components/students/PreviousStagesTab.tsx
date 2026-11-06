"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import MainTable, { type TableColumn } from "@/components/ui/Table";
import { Paginator } from "@/components/ui/paginator";
import { CustomSelect, type CustomSelectOption } from "@/components/ui/custom-select";
import { ModalShell } from "@/components/ui/modal-shell";
import { ModalHeaderCard, ModalSection, ModalBadge } from "@/components/ui/modal-shell";
import { ModalActions } from "@/components/ui/modal-actions";
import { MonoBadge } from "@/components/ui/mono-badge";
import { useToast } from "@/components/ui/toast";
import {
  Archive,
  Search,
  Eye,
  CheckSquare,
  Square,
  GraduationCap,
  RefreshCw,
  X,
} from "lucide-react";
import { formatDateDisplay } from "@/lib/utils/date-display";
import { useDebounce } from "@/lib/hooks/useDebounce";
import {
  formatGovernorateDisplay,
  formatBloodTypeDisplay,
  mapGovernorate,
} from "@/lib/students/mappings";
import type { IStudentListItem, IStageInfo, DistributionStatus } from "@/types/student";
import { formatQualificationLabel, formatLocationStatusLabel } from "@/types/student";

const DISTRIBUTION_OPTIONS: CustomSelectOption[] = [
  { value: "stage_remnants", label: "متبقيات المرحلة" },
  { value: "halt_transfer", label: "إيقاف ترحيل" },
  { value: "distributed_to_unit", label: "تم التوزيع على الوحدة" },
  { value: "without_distribution", label: "بدون توزيعة" },
];

const DISTRIBUTION_FILTER_OPTIONS: CustomSelectOption[] = [
  { value: "all", label: "جميع حالات التوزيع" },
  ...DISTRIBUTION_OPTIONS,
];

const DISTRIBUTION_STATUS_LABELS: Record<string, string> = {
  stage_remnants: "متبقيات المرحلة",
  halt_transfer: "إيقاف ترحيل",
  distributed_to_unit: "تم التوزيع على الوحدة",
  without_distribution: "بدون توزيعة",
  unspecified: "غير محدد",
};

interface PreviousStagesTabProps {
  activeStage: { mrhla: string; name: string };
  stages: IStageInfo[];
  canEdit: boolean;
  onRefresh?: () => void;
}

export function PreviousStagesTab({
  activeStage,
  stages,
  canEdit,
  onRefresh,
}: PreviousStagesTabProps) {
  const { showToast } = useToast();

  // Previous stages (all stages except the active one)
  const previousStages = useMemo(() => {
    return stages.filter((s) => s.mrhla !== activeStage.mrhla);
  }, [stages, activeStage.mrhla]);

  const [selectedStage, setSelectedStage] = useState<string>("all");
  // View mode: "remnants" (default: متبقيات المراحل) vs "full_batch" (استعراض كامل المرحلة)
  const [viewMode, setViewMode] = useState<"remnants" | "full_batch">("remnants");
  const [distributionFilter, setDistributionFilter] = useState("all");
  const [inputSearch, setInputSearch] = useState("");
  const [committedSearch, setCommittedSearch] = useState("");
  const debouncedSearch = useDebounce(inputSearch, 500);
  const [page, setPage] = useState(1);

  // Sync debounced search to committed search (ignoring single character inputs)
  const [prevDebouncedSearch, setPrevDebouncedSearch] = useState(debouncedSearch);
  if (debouncedSearch !== prevDebouncedSearch) {
    setPrevDebouncedSearch(debouncedSearch);
    const trimmed = debouncedSearch.trim();
    if (trimmed.length !== 1) {
      setCommittedSearch(trimmed);
      setPage(1);
    }
  }

  const [loading, setLoading] = useState(false);
  const [students, setStudents] = useState<IStudentListItem[]>([]);
  const [total, setTotal] = useState(0);
  const limit = 20;

  // Selected students for bulk distribution update
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkDistributionStatus, setBulkDistributionStatus] =
    useState<DistributionStatus>("stage_remnants");
  const [updatingBulk, setUpdatingBulk] = useState(false);
  const [updatingSingleId, setUpdatingSingleId] = useState<string | null>(null);

  // Detail Modal
  const [selectedStudent, setSelectedStudent] = useState<IStudentListItem | null>(null);

  // Fetch students from API
  const fetchArchiveStudents = useCallback(async (signal?: AbortSignal) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("page", String(page));
      params.set("limit", String(limit));

      if (selectedStage !== "all") {
        params.set("mrhla", selectedStage);
      }

      if (committedSearch.trim()) {
        params.set("search", committedSearch.trim());
      }

      if (viewMode === "remnants") {
        // In remnants mode, if user explicitly picked a distribution filter, use it;
        // otherwise query remnants (stage_remnants)
        if (distributionFilter !== "all") {
          params.set("distributionStatus", distributionFilter);
        } else {
          params.set("distributionStatus", "stage_remnants");
        }
      } else {
        // Full batch mode
        if (distributionFilter !== "all") {
          params.set("distributionStatus", distributionFilter);
        }
      }

      const res = await fetch(`/api/students?${params.toString()}`, { signal });
      const data = await res.json();
      if (signal?.aborted) return;
      if (!res.ok || !data.success) {
        showToast(data.error || "فشل استرجاع بيانات الأرشيف", "error");
        return;
      }

      // Filter out active stage students if "all" stages selected
      const items: IStudentListItem[] = (data.data.items || []).filter(
        (s: IStudentListItem) => !activeStage.mrhla || s.mrhla !== activeStage.mrhla
      );

      setStudents(items);
      setTotal(data.data.total || 0);
      setSelectedIds(new Set());
    } catch {
      if (signal?.aborted) return;
      showToast("خطأ أثناء الاتصال بالخادم", "error");
    } finally {
      if (!signal?.aborted) {
        setLoading(false);
      }
    }
  }, [page, limit, selectedStage, committedSearch, viewMode, distributionFilter, activeStage.mrhla, showToast]);

  useEffect(() => {
    const controller = new AbortController();
    fetchArchiveStudents(controller.signal);
    return () => controller.abort();
  }, [fetchArchiveStudents]);

  // Bulk status update
  const handleBulkUpdate = async () => {
    if (selectedIds.size === 0 || !canEdit || updatingBulk) return;

    setUpdatingBulk(true);
    try {
      const res = await fetch("/api/students/distribution-status", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentIds: Array.from(selectedIds),
          distributionStatus: bulkDistributionStatus,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        showToast(data.error || "فشل تحديث حالة التوزيع", "error");
        return;
      }

      showToast(data.message || "تم تحديث حالة التوزيع بنجاح", "success");
      setSelectedIds(new Set());
      await fetchArchiveStudents();
    } catch {
      showToast("خطأ أثناء الاتصال بالخادم", "error");
    } finally {
      setUpdatingBulk(false);
    }
  };

  // Single row status change
  const handleSingleStatusChange = async (studentId: string, newStatus: DistributionStatus) => {
    if (!canEdit || updatingSingleId) return;

    setUpdatingSingleId(studentId);
    try {
      const res = await fetch("/api/students/distribution-status", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentIds: [studentId],
          distributionStatus: newStatus,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        showToast(data.error || "فشل تحديث حالة التوزيع", "error");
        return;
      }

      showToast("تم تحديث حالة التوزيع بنجاح", "success");
      setStudents((prev) =>
        prev.map((s) => (s._id === studentId ? { ...s, distributionStatus: newStatus } : s))
      );
    } catch {
      showToast("خطأ أثناء الاتصال بالخادم", "error");
    } finally {
      setUpdatingSingleId(null);
    }
  };

  // Selection handlers
  const toggleSelectAll = () => {
    if (selectedIds.size === students.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(students.map((s) => s._id)));
    }
  };

  const toggleSelectRow = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const stageOptions: CustomSelectOption[] = [
    { value: "all", label: "جميع المراحل السابقة" },
    ...previousStages.map((s) => ({
      value: s.mrhla,
      label: s.name,
      badge: `${s.count} طالب`,
    })),
  ];

  const totalPages = Math.max(1, Math.ceil(total / limit));

  const columns: TableColumn<IStudentListItem>[] = [
    {
      header: (
        <button
          type="button"
          onClick={toggleSelectAll}
          disabled={!canEdit}
          className="cursor-pointer p-1 text-white hover:text-(--app-info) transition-colors"
          title="تحديد الكل"
        >
          {selectedIds.size > 0 && selectedIds.size === students.length ? (
            <CheckSquare className="w-4 h-4" />
          ) : (
            <Square className="w-4 h-4" />
          )}
        </button>
      ),
      accessor: "select",
      cellAlign: "center",
      headerAlign: "center",
      render: (_, row) => (
        <input
          type="checkbox"
          checked={selectedIds.has(row._id)}
          onChange={() => toggleSelectRow(row._id)}
          disabled={!canEdit}
          className="rounded border-(--app-border) text-(--color-primary) focus:ring-blue-500 cursor-pointer"
        />
      ),
    },
    {
      header: "الرقم العسكري",
      accessor: "militaryNo",
      cellAlign: "center",
      headerAlign: "center",
      render: (_, row) => (
        <span className="font-mono text-xs font-bold text-(--app-muted-foreground)">
          {row.militaryNo || row.studentId}
        </span>
      ),
    },
    {
      header: "الاسم والمرحلة الأساسية",
      accessor: "fullName",
      cellAlign: "right",
      headerAlign: "right",
      render: (_, row) => (
        <div className="flex flex-col max-w-[240px] sm:max-w-[320px]">
          <button
            type="button"
            onClick={() => setSelectedStudent(row)}
            title={row.fullName}
            className="text-right text-xs font-black text-(--color-primary) hover:underline hover:text-(--app-info) transition-colors cursor-pointer truncate block"
          >
            {row.fullName}
          </button>
          <span className="text-[10px] text-(--app-muted-foreground) font-bold">
            {row.mrhlaName || row.mrhla || "—"}
          </span>
        </div>
      ),
    },
    {
      header: "التصنيف التخصصي",
      accessor: "classificationName",
      cellAlign: "center",
      headerAlign: "center",
      render: (_, row) => (
        <span className="text-xs font-bold text-(--app-muted-foreground)">
          {row.classificationName || "صف إشارة"}
        </span>
      ),
    },
    {
      header: "المؤهل الدراسي",
      accessor: "qualificationName",
      cellAlign: "right",
      headerAlign: "right",
      render: (_, row) => (
        <span className="text-xs font-bold text-(--app-muted-foreground)">
          {row.qualificationName || formatQualificationLabel(row.qualification, "—")}
        </span>
      ),
    },
    {
      header: "المحافظة",
      accessor: "governorate",
      cellAlign: "center",
      headerAlign: "center",
      render: (_, row) => {
        const govDisplay = formatGovernorateDisplay(row.governorate);
        const area = row.recruitmentArea || mapGovernorate(row.governorate).recruitmentArea;
        return (
          <div className="flex flex-col items-center">
            <span className="text-xs font-bold text-(--app-muted-foreground)">
              {govDisplay}
            </span>
            {area && (
              <span className="text-[10px] text-(--app-muted-foreground)/75">
                {area}
              </span>
            )}
          </div>
        );
      },
    },
    {
      header: "فصيلة الدم",
      accessor: "bloodType",
      cellAlign: "center",
      headerAlign: "center",
      render: (_, row) => (
        <span className="font-mono text-xs font-bold text-(--app-muted-foreground)">
          {formatBloodTypeDisplay(row.bloodType)}
        </span>
      ),
    },
    {
      header: "الموقف بالوحدة",
      accessor: "locationStatus",
      cellAlign: "center",
      headerAlign: "center",
      render: (_, row) => {
        const locStatus = row.locationStatus || "in_unit";
        if (locStatus === "relocated") {
          return (
            <div className="flex flex-col items-center gap-0.5">
              <MonoBadge
                size="sm"
                variant="muted"
                value={formatLocationStatusLabel("relocated")}
                className="!bg-(--app-surface-container) !text-(--app-muted-foreground) !border-(--app-border)"
              />
              {row.relocationDetails?.destination && (
                <span className="text-[10px] font-bold text-(--app-muted-foreground) truncate max-w-[110px]">
                  إلى: {row.relocationDetails.destination}
                </span>
              )}
            </div>
          );
        }
        if (locStatus === "transferred_to_unit_personnel" || row.isStriken) {
          return (
            <MonoBadge
              size="sm"
              variant="outline"
              value={formatLocationStatusLabel("transferred_to_unit_personnel")}
              className="!bg-(--app-info)/10 !text-(--app-info) !border-(--app-info)/20"
            />
          );
        }
        return (
          <MonoBadge
            size="sm"
            variant="primary"
            value={formatLocationStatusLabel("in_unit")}
            className="!bg-(--color-primary)/10 !text-(--color-primary) !border-(--color-primary)/20"
          />
        );
      },
    },
    {
      header: "حالة التوزيع (يدوي)",
      accessor: "distributionStatus",
      cellAlign: "right",
      headerAlign: "right",
      render: (_, row) => {
        if (!canEdit) {
          return (
            <span className="text-xs font-bold text-(--app-foreground)">
              {DISTRIBUTION_STATUS_LABELS[row.distributionStatus] || row.distributionStatus}
            </span>
          );
        }

        return (
          <div className="w-48">
            <CustomSelect
              value={row.distributionStatus || "stage_remnants"}
              onChange={(val) => handleSingleStatusChange(row._id, val as DistributionStatus)}
              options={DISTRIBUTION_OPTIONS}
              disabled={updatingSingleId === row._id}
              className="!py-1 !text-xs font-bold"
            />
          </div>
        );
      },
    },
    {
      header: "عامود الإجراءات",
      cellAlign: "center",
      headerAlign: "center",
      render: (_, row) => (
        <div className="flex items-center justify-center">
          <button
            type="button"
            onClick={() => setSelectedStudent(row)}
            className="p-1.5 rounded-lg text-(--color-primary) hover:text-(--app-info) hover:bg-(--color-primary)/10 transition-colors cursor-pointer"
            title="عرض التفاصيل"
          >
            <Eye className="w-3.5 h-3.5" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      {/* Top View Mode & Filter Controls */}
      <div className="bg-(--app-surface) p-4 rounded-2xl border border-(--app-border) shadow-depth-sm space-y-3">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
          {/* View Mode Toggle (Remnants vs Full Batch) */}
          <div className="inline-flex bg-(--app-surface-container) p-1 rounded-xl border border-(--app-border) shrink-0">
            <button
              type="button"
              onClick={() => {
                setViewMode("remnants");
                setPage(1);
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                viewMode === "remnants"
                  ? "bg-(--color-primary) text-white shadow-xs"
                  : "text-(--app-muted-foreground) hover:text-(--color-primary)"
              }`}
            >
              متبقيات المراحل السابقة
            </button>
            <button
              type="button"
              onClick={() => {
                setViewMode("full_batch");
                setPage(1);
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                viewMode === "full_batch"
                  ? "bg-(--color-primary) text-white shadow-xs"
                  : "text-(--app-muted-foreground) hover:text-(--color-primary)"
              }`}
            >
              استعراض كامل المرحلة
            </button>
          </div>

          {/* Stage Selector */}
          <div className="w-60">
            <CustomSelect
              value={selectedStage}
              onChange={(val) => {
                setSelectedStage(val);
                setPage(1);
              }}
              options={stageOptions}
              placeholder="اختر الدفعة السابقة..."
              className="!py-1.5 !text-xs font-bold"
            />
          </div>

          {/* Distribution Filter */}
          <div className="w-48">
            <CustomSelect
              value={distributionFilter}
              onChange={(val) => {
                setDistributionFilter(val);
                setPage(1);
              }}
              options={DISTRIBUTION_FILTER_OPTIONS}
              placeholder="فلتر التوزيع..."
              className="!py-1.5 !text-xs font-bold"
            />
          </div>

          {/* Search Box */}
          <div className="relative flex-1 min-w-[200px]">
            <button
              type="button"
              onClick={() => {
                const trimmed = inputSearch.trim();
                if (trimmed.length !== 1) {
                  setCommittedSearch(trimmed);
                  setPage(1);
                }
              }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-(--app-muted-foreground) hover:text-(--color-primary) transition-colors cursor-pointer"
              title="بحث (Enter)"
            >
              <Search className="w-4 h-4" />
            </button>
            <input
              type="text"
              placeholder="بحث بالاسم أو الرقم العسكري..."
              value={inputSearch}
              onChange={(e) => {
                setInputSearch(e.target.value);
                if (!e.target.value.trim()) {
                  setCommittedSearch("");
                  setPage(1);
                }
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  const trimmed = inputSearch.trim();
                  if (trimmed.length !== 1) {
                    setCommittedSearch(trimmed);
                    setPage(1);
                  }
                }
              }}
              className="w-full pr-9 pl-8 py-1.5 bg-(--app-surface-container) border border-(--app-border) rounded-xl text-xs font-bold text-(--app-foreground) placeholder:text-(--app-muted-foreground)/60 focus:outline-none focus:ring-blue-500/20 focus:border-blue-500 transition-all text-right"
            />
            {inputSearch && (
              <button
                type="button"
                onClick={() => {
                  setInputSearch("");
                  setCommittedSearch("");
                  setPage(1);
                }}
                className="absolute left-2.5 top-1/2 -translate-y-1/2 p-0.5 hover:bg-(--app-border) rounded-md text-(--app-muted-foreground) hover:text-(--color-primary) transition-colors cursor-pointer"
                title="مسح النص"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Refresh */}
          <button
            type="button"
            onClick={() => {
              fetchArchiveStudents();
              onRefresh?.();
            }}
            disabled={loading}
            title="تحديث البيانات"
            className="p-2 rounded-xl border border-(--app-border) hover:bg-(--app-surface-container) text-(--color-primary) hover:text-(--app-info) transition-colors cursor-pointer shrink-0"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>

        {/* Bulk Action Strip (when canEdit) */}
        {canEdit && (
          <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-(--app-border)/60">
            <div className="flex items-center gap-2 text-xs font-bold text-(--app-muted-foreground)">
              <span>الطلاب المحددين:</span>
              <span className="font-mono text-(--color-primary) font-black">{selectedIds.size}</span>
            </div>

            <div className="flex items-center gap-2">
              <div className="w-52">
                <CustomSelect
                  value={bulkDistributionStatus}
                  onChange={(val) => setBulkDistributionStatus(val as DistributionStatus)}
                  options={DISTRIBUTION_OPTIONS}
                  placeholder="حالة التوزيع..."
                  className="!py-1 !text-xs font-bold"
                />
              </div>

              <button
                type="button"
                onClick={handleBulkUpdate}
                disabled={selectedIds.size === 0 || updatingBulk}
                className="btn-primary py-1.5 px-3 text-xs font-bold cursor-pointer disabled:opacity-50"
              >
                تحديث حالة التوزيع
              </button>
            </div>
          </div>
        )}
      </div>

      {/* MainTable */}
      <MainTable
        columns={columns}
        data={students}
        showSerialNumber={true}
        isLoading={loading}
        emptyTitle="لا توجد سجلات في هذا الأرشيف"
        emptyDescription={
          viewMode === "remnants"
            ? "لم يتم العثور على متبقيات مراحل تطابق معايير البحث."
            : "لم يتم العثور على طلاب في المرحلة المحددة."
        }
      />

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center pt-2">
          <Paginator
            page={page}
            totalPages={totalPages}
            total={total}
            onPageChange={setPage}
          />
        </div>
      )}

      {/* Student Details Modal */}
      {selectedStudent && (
        <ModalShell
          title="بيانات الطالب بأرشيف المراحل"
          icon={<Archive className="w-4 h-4" />}
          onClose={() => setSelectedStudent(null)}
          overlayClassName="bg-black/40"
          panelClassName="max-w-xl border-(--app-border) shadow-depth-xl"
          bodyClassName="p-5 space-y-4 no-scrollbar"
          footer={
            <ModalActions
              mode="view"
              cancelText="إغلاق"
              onCancel={() => setSelectedStudent(null)}
            />
          }
        >
          <ModalHeaderCard
            icon={<GraduationCap className="w-6 h-6" />}
            title={selectedStudent.fullName}
            subtitle={`الرقم العسكري: ${selectedStudent.militaryNo || selectedStudent.studentId} | ${selectedStudent.mrhlaName || selectedStudent.mrhla}`}
            badge={
              <ModalBadge>
                {DISTRIBUTION_STATUS_LABELS[selectedStudent.distributionStatus] || selectedStudent.distributionStatus}
              </ModalBadge>
            }
          />

          <ModalSection title="البيانات الأساسية">
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <span className="font-bold text-(--app-muted-foreground) block">الرقم القومي:</span>
                <span className="font-mono font-bold text-(--app-foreground)">{selectedStudent.nationalNo || "—"}</span>
              </div>
              <div>
                <span className="font-bold text-(--app-muted-foreground) block">الرقم الثلاثي:</span>
                <span className="font-mono font-bold text-(--app-foreground)">{selectedStudent.solasyNo || "—"}</span>
              </div>
              <div>
                <span className="font-bold text-(--app-muted-foreground) block">التصنيف التخصصي:</span>
                <span className="font-bold text-(--color-primary)">
                  {selectedStudent.classificationName || "صف إشارة"}
                </span>
              </div>
              <div>
                <span className="font-bold text-(--app-muted-foreground) block">الموقف بالوحدة:</span>
                <span className="font-bold text-(--color-primary)">
                  {formatLocationStatusLabel(selectedStudent.locationStatus || "in_unit")}
                </span>
              </div>
              <div>
                <span className="font-bold text-(--app-muted-foreground) block">المؤهل:</span>
                <span className="font-bold text-(--app-foreground)">
                  {selectedStudent.qualificationName || formatQualificationLabel(selectedStudent.qualification, "—")}
                </span>
              </div>
              <div>
                <span className="font-bold text-(--app-muted-foreground) block">المحافظة:</span>
                <span className="font-bold text-(--app-foreground)">
                  {formatGovernorateDisplay(selectedStudent.governorate)}
                </span>
              </div>
              <div>
                <span className="font-bold text-(--app-muted-foreground) block">منطقة التجنيد التابعة:</span>
                <span className="font-bold text-(--app-foreground)">
                  {selectedStudent.recruitmentArea || mapGovernorate(selectedStudent.governorate).recruitmentArea || "—"}
                </span>
              </div>
              <div>
                <span className="font-bold text-(--app-muted-foreground) block">فصيلة الدم:</span>
                <span className="font-mono font-bold text-(--app-foreground)">
                  {formatBloodTypeDisplay(selectedStudent.bloodType)}
                </span>
              </div>
              <div>
                <span className="font-bold text-(--app-muted-foreground) block">تاريخ التسريح:</span>
                <span className="font-mono font-bold text-(--app-foreground)">
                  {selectedStudent.tasrehDate ? formatDateDisplay(selectedStudent.tasrehDate) : "—"}
                </span>
              </div>
              <div>
                <span className="font-bold text-(--app-muted-foreground) block">حالة التوزيع:</span>
                <span className="font-bold text-(--color-primary)">
                  {DISTRIBUTION_STATUS_LABELS[selectedStudent.distributionStatus] || selectedStudent.distributionStatus}
                </span>
              </div>
            </div>
          </ModalSection>
        </ModalShell>
      )}
    </div>
  );
}
