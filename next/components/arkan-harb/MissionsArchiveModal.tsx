"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { ModalShell } from "@/components/ui/modal-shell";
import { ModalActions } from "@/components/ui/modal-actions";
import MainTable, { type TableColumn } from "@/components/ui/Table";
import { Paginator } from "@/components/ui/paginator";
import { DateField } from "@/components/ui/date-field";
import { CustomSelect, type CustomSelectOption } from "@/components/ui/custom-select";
import { Badge } from "@/components/ui/badge";
import { ActionButton } from "@/components/officers/OfficersTable";
import { useToast } from "@/components/ui/toast";
import { formatDateDisplay } from "@/lib/utils/date-display";
import { getMissionStatusLabel } from "@/lib/utils/status-badge";
import {
  History,
  Search,
  RotateCcw,
  Eye,
  CheckCircle2,
  Clock,
  XCircle,
  Edit,
  X,
} from "lucide-react";
import { MissionCompleteModal } from "./MissionCompleteModal";
import { MissionDetailModal } from "./MissionDetailModal";
import { MissionActionModal } from "./MissionActionModal";
import { MissionForm } from "./MissionForm";
import type { Mission, MissionStatus } from "./MissionsTable";
import type { OfficerOption } from "@/types";

const STATUS_OPTIONS: CustomSelectOption[] = [
  { value: "", label: "كل الحالات" },
  { value: "scheduled", label: "مجدولة" },
  { value: "active", label: "نشطة" },
  { value: "completed", label: "مكتملة" },
  { value: "postponed", label: "مؤجلة" },
  { value: "cancelled", label: "ملغاة" },
];

interface MissionsArchiveModalProps {
  isOpen: boolean;
  onClose: () => void;
  canEdit: boolean;
  isAdmin?: boolean;
  officers?: OfficerOption[];
}

export function MissionsArchiveModal({
  isOpen,
  onClose,
  canEdit,
  isAdmin = false,
  officers = [],
}: MissionsArchiveModalProps) {
  const { showToast } = useToast();
  const router = useRouter();

  // Search & Filter State
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [status, setStatus] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);

  useEffect(() => {
    const trimmed = search.trim();
    if (!trimmed) {
      setDebouncedSearch("");
      setPage(1);
      return;
    }
    if (trimmed.length < 2) return;

    const timer = setTimeout(() => {
      setDebouncedSearch(trimmed);
      setPage(1);
    }, 500);
    return () => clearTimeout(timer);
  }, [search]);

  // Data State
  const [missions, setMissions] = useState<Mission[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);

  // Action Modals State
  const [detailMission, setDetailMission] = useState<Mission | null>(null);
  const [completeMission, setCompleteMission] = useState<Mission | null>(null);
  const [actionTarget, setActionTarget] = useState<{ mission: Mission; type: "postpone" | "cancel" } | null>(null);
  const [editingMission, setEditingMission] = useState<Mission | null>(null);

  const fetchMissions = useCallback(async (signal?: AbortSignal) => {
    if (!isOpen) return;
    try {
      setLoading(true);
      const params = new URLSearchParams();
      params.set("page", page.toString());
      params.set("limit", limit.toString());
      if (debouncedSearch.trim()) params.set("search", debouncedSearch.trim());
      if (status) params.set("status", status);
      if (startDate) params.set("startDate", startDate);
      if (endDate) params.set("endDate", endDate);

      const res = await fetch(`/api/arkan-harb/missions?${params.toString()}`, { signal });
      const json = await res.json();
      if (signal?.aborted) return;
      if (json.success && json.data) {
        setMissions(json.data.items || []);
        setTotal(json.data.total || 0);
      } else {
        showToast("فشل في تحميل سجل المأموريات", "error");
      }
    } catch {
      if (signal?.aborted) return;
      showToast("خطأ في الاتصال بالخادم", "error");
    } finally {
      if (!signal?.aborted) {
        setLoading(false);
      }
    }
  }, [isOpen, page, limit, debouncedSearch, status, startDate, endDate, showToast]);

  useEffect(() => {
    if (isOpen) {
      const controller = new AbortController();
      fetchMissions(controller.signal);
      return () => controller.abort();
    }
  }, [isOpen, fetchMissions]);

  const handleResetFilters = () => {
    setSearch("");
    setStatus("");
    setStartDate("");
    setEndDate("");
    setPage(1);
  };

  const columns: TableColumn<Mission>[] = [
    {
      header: "عنوان المأمورية",
      accessor: "title",
      cellAlign: "right",
      headerAlign: "right",
      render: (value: unknown, row: Mission) => (
        <button
          type="button"
          onClick={() => setDetailMission(row)}
          className="font-black text-xs text-(--color-primary) hover:underline hover:text-(--app-info) text-right cursor-pointer transition-colors"
        >
          {value as string}
        </button>
      ),
    },
    {
      header: "الرتبة",
      accessor: "officerRankLabel",
      cellAlign: "center",
      headerAlign: "center",
      render: (_: unknown, row: Mission) => (
        <span className="font-bold text-xs text-(--app-muted-foreground)">
          {row.officerRankLabel || "ـ"}
        </span>
      ),
    },
    {
      header: "الاسم",
      accessor: "officerName",
      cellAlign: "right",
      headerAlign: "right",
      render: (_: unknown, row: Mission) => (
        <span className="text-xs font-bold text-(--app-muted-foreground)">
          {row.officerName || row.officerLabel || "ضابط غير معروف"}
        </span>
      ),
    },
    {
      header: "الجهة المقصودة",
      accessor: "destination",
      cellAlign: "center",
      headerAlign: "center",
      render: (value: unknown) => (
        <span className="text-xs font-bold text-(--app-muted-foreground)">
          {(value as string) || "ـ"}
        </span>
      ),
    },
    {
      header: "الفترة والتاريخ",
      accessor: "startDate",
      cellAlign: "center",
      headerAlign: "center",
      render: (_: unknown, row: Mission) => (
        <div className="flex flex-col items-center text-xs font-bold text-(--app-muted-foreground)">
          <span>{formatDateDisplay(row.startDate)}</span>
          {row.endDate && (
            <span className="text-[10px] text-(--app-muted-foreground)/80 mt-0.5">
              حتى {formatDateDisplay(row.endDate)}
            </span>
          )}
        </div>
      ),
    },
    {
      header: "الحالة",
      accessor: "status",
      cellAlign: "center",
      headerAlign: "center",
      render: (value: unknown, row: Mission) => (
        <div className="flex flex-col items-center gap-1">
          <Badge
            variant="secondary"
            className="bg-(--app-surface-container) text-(--app-muted-foreground) border border-(--app-border) text-[10px] font-bold px-2 py-0.5 rounded-lg"
          >
            {getMissionStatusLabel(value as MissionStatus)}
          </Badge>
          {row.statusReason && (
            <span className="text-[10px] text-(--app-muted-foreground)/70 line-clamp-1 max-w-[120px]" title={row.statusReason}>
              {row.statusReason}
            </span>
          )}
        </div>
      ),
    },
    {
      header: "الإجراءات",
      cellAlign: "left",
      headerAlign: "left",
      minWidth: true,
      render: (_: unknown, row: Mission) => (
        <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
          <ActionButton
            icon={<Eye className="h-3.5 w-3.5 text-(--color-primary) hover:text-(--app-info)" />}
            color="btn-action-primary"
            title="عرض التفاصيل"
            onClick={() => setDetailMission(row)}
          />
          {canEdit && row.status !== "completed" && row.status !== "cancelled" && (
            <>
              <ActionButton
                icon={<CheckCircle2 className="h-3.5 w-3.5 text-(--color-primary) hover:text-(--app-info)" />}
                color="btn-action-primary"
                title="إكمال وتوثيق التقرير"
                onClick={() => setCompleteMission(row)}
              />
              <ActionButton
                icon={<Clock className="h-3.5 w-3.5 text-(--color-primary) hover:text-(--app-info)" />}
                color="btn-action-primary"
                title="تأجيل المأمورية"
                onClick={() => setActionTarget({ mission: row, type: "postpone" })}
              />
              <ActionButton
                icon={<XCircle className="h-3.5 w-3.5 text-(--color-primary) hover:text-(--app-info)" />}
                color="btn-action-primary"
                title="إلغاء المأمورية"
                onClick={() => setActionTarget({ mission: row, type: "cancel" })}
              />
            </>
          )}
          {canEdit && (
            <ActionButton
              icon={<Edit className="h-3.5 w-3.5 text-(--color-primary) hover:text-(--app-info)" />}
              color="btn-action-primary"
              title="تعديل المأمورية"
              onClick={() => setEditingMission(row)}
            />
          )}
        </div>
      ),
    },
  ];

  if (!isOpen) return null;

  return (
    <>
      <ModalShell
        title="سجل وأرشيف المأموريات"
        icon={<History className="w-5 h-5 text-(--color-primary)" />}
        onClose={onClose}
        overlayClassName="bg-black/40"
        panelClassName="max-w-6xl border-(--app-border) shadow-depth-xl"
        bodyClassName="p-6 space-y-5 no-scrollbar text-right"
        footer={
          <ModalActions
            mode="view"
            cancelText="إغلاق السجل"
            onCancel={onClose}
            startSlot={
              <span className="text-xs font-bold text-(--app-muted-foreground)">
                إجمالي النتائج: <strong className="font-mono text-(--color-primary)">{total}</strong> مأمورية
              </span>
            }
          />
        }
      >
        {/* Filters Bar */}
        <div className="p-4 rounded-2xl bg-(--app-surface-container) border border-(--app-border) space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {/* Search input */}
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-(--app-muted-foreground) block mr-1">
                بحث بالمأمورية أو الضابط
              </label>
              <div className="relative">
                <button
                  type="button"
                  onClick={() => {
                    const trimmed = search.trim();
                    if (trimmed.length !== 1) {
                      setDebouncedSearch(trimmed);
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
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    if (!e.target.value.trim()) {
                      setDebouncedSearch("");
                      setPage(1);
                    }
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      const trimmed = search.trim();
                      if (trimmed.length !== 1) {
                        setDebouncedSearch(trimmed);
                        setPage(1);
                      }
                    }
                  }}
                  placeholder="الاسم، الرقم العسكري، الجهة..."
                  className="w-full pr-9 pl-8 py-2 bg-(--app-surface) border border-(--app-border) rounded-xl text-xs font-bold text-(--app-foreground) focus:outline-none focus:ring-blue-500/20 focus:border-blue-500 transition-all text-right"
                  dir="rtl"
                />
                {search && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearch("");
                      setDebouncedSearch("");
                      setPage(1);
                    }}
                    className="absolute left-2.5 top-1/2 -translate-y-1/2 p-0.5 hover:bg-(--app-border) rounded-md text-(--app-muted-foreground) hover:text-(--color-primary) transition-colors cursor-pointer"
                    title="مسح النص"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* Status dropdown */}
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-(--app-muted-foreground) block mr-1">
                حالة المأمورية
              </label>
              <CustomSelect
                value={status}
                onChange={(val) => {
                  setStatus(val);
                  setPage(1);
                }}
                options={STATUS_OPTIONS}
                placeholder="كل الحالات"
                containerClassName="w-full"
              />
            </div>

            {/* Start Date */}
            <DateField
              id="archive-start-date"
              label="من تاريخ"
              value={startDate}
              onChange={(val) => {
                setStartDate(val);
                setPage(1);
              }}
            />

            {/* End Date */}
            <DateField
              id="archive-end-date"
              label="إلى تاريخ"
              value={endDate}
              onChange={(val) => {
                setEndDate(val);
                setPage(1);
              }}
            />
          </div>

          {/* Reset Filters */}
          {(search || status || startDate || endDate) && (
            <div className="flex justify-end pt-1">
              <button
                type="button"
                onClick={handleResetFilters}
                className="text-xs font-bold text-(--color-primary) hover:underline flex items-center gap-1.5 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>إعادة تعيين الفلاتر</span>
              </button>
            </div>
          )}
        </div>

        {/* Missions Table */}
        <div className="space-y-3">
          <MainTable<Mission>
            columns={columns}
            data={missions}
            showSerialNumber={true}
            isLoading={loading}
            loadingText="جاري تحميل سجل المأموريات..."
            emptyTitle="لا توجد مأموريات مسجلة"
            emptyDescription="لم يتم العثور على أي مأموريات مطابقة لخيارات البحث المحددة"
          />

          {/* Pagination */}
          {total > 0 && (
            <div className="flex items-center justify-between pt-2">
              <div className="flex items-center gap-3">
                <span className="text-xs font-bold text-(--app-muted-foreground)">
                  عرض {missions.length} من أصل {total}
                </span>
                <div className="flex items-center gap-1">
                  {[10, 20, 50].map((l) => (
                    <button
                      key={l}
                      type="button"
                      onClick={() => {
                        setLimit(l);
                        setPage(1);
                      }}
                      className={`h-6 px-2 text-[10px] font-bold rounded-lg transition-all ${
                        limit === l
                          ? "bg-(--color-primary) text-white"
                          : "text-(--app-muted-foreground) hover:bg-(--app-surface-container)"
                      }`}
                    >
                      {l}
                    </button>
                  ))}
                </div>
              </div>

              <Paginator
                page={page}
                totalPages={Math.max(1, Math.ceil(total / limit))}
                onPageChange={setPage}
                showTotal={false}
              />
            </div>
          )}
        </div>
      </ModalShell>

      {/* Nested Action Modals */}
      <MissionCompleteModal
        mission={completeMission}
        isOpen={!!completeMission}
        onClose={() => setCompleteMission(null)}
        onSuccess={() => {
          setCompleteMission(null);
          fetchMissions();
          router.refresh();
        }}
      />

      <MissionDetailModal
        mission={detailMission}
        isOpen={!!detailMission}
        isAdmin={isAdmin}
        onClose={() => setDetailMission(null)}
        onSuccess={() => {
          setDetailMission(null);
          fetchMissions();
          router.refresh();
        }}
        onEdit={canEdit ? (m) => setEditingMission(m) : undefined}
      />

      <MissionActionModal
        mission={actionTarget?.mission ?? null}
        actionType={actionTarget?.type ?? null}
        isOpen={!!actionTarget}
        onClose={() => setActionTarget(null)}
        onSuccess={() => {
          setActionTarget(null);
          fetchMissions();
          router.refresh();
        }}
      />

      <MissionForm
        mission={editingMission}
        officers={officers}
        isOpen={!!editingMission}
        onClose={() => setEditingMission(null)}
        onSave={() => {
          setEditingMission(null);
          fetchMissions();
          router.refresh();
        }}
      />
    </>
  );
}
