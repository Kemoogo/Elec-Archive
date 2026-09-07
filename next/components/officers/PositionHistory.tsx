"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import MainTable, { type TableColumn } from "@/components/ui/Table";
import { ModalShell, ModalBadge } from "@/components/ui/modal-shell";
import { SectionWrapper } from "@/components/ui/section-wrapper";
import { Briefcase, History, User, Award, Loader2, Calendar } from "lucide-react";
import { extractApiError } from "@/lib/utils";
import type { SerializedPositionGroup, SerializedPositionInterval } from "@/lib/officers/queries";
import { format, intervalToDuration } from "date-fns";
import { ar } from "date-fns/locale";

interface PositionHistoryProps {
  officerId: string;
  initialData?: SerializedPositionGroup[];
}

/** Helper to format Arabic duration between two dates */
function formatArabicDuration(startDateStr: string, endDateStr?: string | null): string {
  try {
    if (!startDateStr) return "-";
    const start = new Date(startDateStr);
    const end = endDateStr ? new Date(endDateStr) : new Date();
    if (isNaN(start.getTime()) || isNaN(end.getTime()) || start > end) {
      return "-";
    }

    const duration = intervalToDuration({ start, end });
    const parts: string[] = [];

    if (duration.years) {
      if (duration.years === 1) parts.push("سنة");
      else if (duration.years === 2) parts.push("سنتان");
      else if (duration.years >= 3 && duration.years <= 10) parts.push(`${duration.years} سنوات`);
      else parts.push(`${duration.years} سنة`);
    }

    if (duration.months) {
      if (duration.months === 1) parts.push("شهر");
      else if (duration.months === 2) parts.push("شهران");
      else if (duration.months >= 3 && duration.months <= 10) parts.push(`${duration.months} أشهر`);
      else parts.push(`${duration.months} شهر`);
    }

    if (duration.days && parts.length < 2) {
      if (duration.days === 1) parts.push("يوم");
      else if (duration.days === 2) parts.push("يومان");
      else if (duration.days >= 3 && duration.days <= 10) parts.push(`${duration.days} أيام`);
      else parts.push(`${duration.days} يوم`);
    }

    return parts.length > 0 ? parts.join(" و ") : "أقل من يوم";
  } catch {
    return "-";
  }
}

/** Helper to safely format dates without throwing RangeError */
function safeFormatDate(val: unknown, defaultText = "-"): string {
  if (!val || val === "null" || val === "undefined") return defaultText;
  try {
    const d = new Date(val as string | number | Date);
    if (isNaN(d.getTime())) return defaultText;
    return format(d, "yyyy/MM/dd", { locale: ar });
  } catch {
    return defaultText;
  }
}

export function PositionHistory({ officerId, initialData }: PositionHistoryProps) {
  const searchParams = useSearchParams();
  const [data, setData] = useState<SerializedPositionGroup[]>(initialData || []);
  const [loading, setLoading] = useState(!initialData);
  const [error, setError] = useState<string | null>(null);
  const [selectedPosition, setSelectedPosition] = useState<SerializedPositionGroup | null>(null);

  const showActiveOnly = searchParams.get("view") !== "all";

  const filteredData = useMemo(() => {
    if (showActiveOnly) {
      return data.filter((p) => p.status === "active");
    }
    return data;
  }, [data, showActiveOnly]);

  useEffect(() => {
    if (initialData && initialData.length > 0) {
      return;
    }

    const fetchData = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/arkan-harb/positions?officerId=${officerId}&limit=100`);
        if (!response.ok) {
          throw new Error("فشل في تحميل سجل الوظائف");
        }
        const result = await response.json();
        if (result.success && Array.isArray(result.data?.items)) {
          // Map API items into SerializedPositionGroup format if fetched client-side
          const rawItems = result.data.items;
          const mapped: SerializedPositionGroup[] = [];

          for (const pa of rawItems) {
            const rawIntervals: SerializedPositionInterval[] = [];
            const historyList = pa.assignmentHistory || [];

            for (const h of historyList) {
              const hOfficerId = typeof h.officerId === "object" ? h.officerId?._id || h.officerId?.id : h.officerId;
              if (String(hOfficerId) === String(officerId)) {
                const isAct = !h.endDate;
                rawIntervals.push({
                  id: h._id || `${pa.id}-${h.startDate}`,
                  role: h.role,
                  roleLabel: h.role === "primary" ? "ضابط أساسي" : "ضابط بديل",
                  startDate: new Date(h.startDate).toISOString(),
                  endDate: h.endDate ? new Date(h.endDate).toISOString() : null,
                  status: isAct ? "active" : "ended",
                  statusLabel: isAct ? "تكليف سارٍ" : "منتهٍ",
                  notes: h.notes,
                });
              }
            }

            if (rawIntervals.length === 0) {
              const isPrimary = String(pa.primaryOfficer?.id || pa.primaryOfficer?._id || pa.primaryOfficerId) === String(officerId);
              const isSub = (pa.substituteOfficers || []).some((s: { id?: string; _id?: string }) => String(s.id || s._id) === String(officerId));
              if (isPrimary || isSub) {
                const roleKey = isPrimary ? "primary" : "substitute";
                rawIntervals.push({
                  id: pa.id || String(pa._id),
                  role: roleKey,
                  roleLabel: isPrimary ? "ضابط أساسي" : "ضابط بديل",
                  startDate: new Date(pa.primaryStartDate || pa.createdAt || new Date()).toISOString(),
                  endDate: null,
                  status: "active",
                  statusLabel: "تكليف سارٍ",
                  notes: pa.notes,
                });
              }
            }

            if (rawIntervals.length > 0) {
              rawIntervals.sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime());
              const hasPrimary = rawIntervals.some((i) => i.role === "primary");
              const hasSub = rawIntervals.some((i) => i.role === "substitute");
              const combinedRole = hasPrimary && hasSub ? "both" : hasPrimary ? "primary" : "substitute";
              const isActive = rawIntervals.some((i) => i.status === "active");

              mapped.push({
                id: pa.id || String(pa._id),
                positionTitle: pa.positionTitle,
                department: pa.department || "القيادة",
                role: combinedRole,
                roleLabel: combinedRole === "both" ? "أساسي / بديل" : combinedRole === "primary" ? "ضابط أساسي" : "ضابط بديل",
                recordsCount: rawIntervals.length,
                status: isActive ? "active" : "ended",
                statusLabel: isActive ? "تكليف سارٍ" : "تكليف سابق (منتهٍ)",
                intervals: rawIntervals,
              });
            }
          }

          setData(mapped);
        } else {
          const errMsg = extractApiError(result, "فشل في تحميل سجل الوظائف");
          throw new Error(errMsg);
        }
      } catch (err) {
        console.error("Fetch error:", err);
        setError(err instanceof Error ? err.message : "حدث خطأ غير متوقع");
      } finally {
        setLoading(false);
      }
    };

    if (officerId) {
      fetchData();
    }
  }, [officerId, initialData]);

  // Main Table Columns: [ م | مسمى الوظيفة | نوع التكليف | عدد السجلات | الحالة ]
  const mainColumns: TableColumn<SerializedPositionGroup>[] = useMemo(
    () => [
      {
        header: "مسمى الوظيفة",
        accessor: "positionTitle",
        cellAlign: "right",
        headerAlign: "right",
        render: (_val, row) => (
          <div className="flex flex-col text-right">
            <span className="text-xs font-bold text-(--app-muted-foreground)">{row.positionTitle}</span>
            <span className="text-[11px] font-bold text-(--app-muted-foreground)/60">فرع / {row.department}</span>
          </div>
        ),
      },
      {
        header: "نوع التكليف",
        accessor: "roleLabel",
        cellAlign: "center",
        headerAlign: "center",
        render: (val, row) => (
          <ModalBadge
            icon={
              row.role === "substitute" ? (
                <User className="w-3.5 h-3.5 text-(--app-muted-foreground)" />
              ) : (
                <Award className="w-3.5 h-3.5 text-(--color-primary)" />
              )
            }
          >
            {String(val)}
          </ModalBadge>
        ),
      },
      {
        header: "عدد السجلات",
        accessor: "recordsCount",
        cellAlign: "center",
        headerAlign: "center",
        render: (_val, row) => (
          <button
            type="button"
            onClick={() => setSelectedPosition(row)}
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-(--app-surface-container) border border-(--app-border) shadow-xs font-mono text-xs font-black text-(--color-primary) hover:border-(--color-primary)/40 hover:text-(--app-info) hover:underline cursor-pointer transition-all"
            title="اضغط لعرض فترات وتواريخ التكليف للوظيفة بالتفصيل"
          >
            <History className="w-3.5 h-3.5 text-(--app-muted-foreground)" />
            <span>{row.recordsCount}</span>
            <span className="text-[10px] font-sans font-bold text-(--app-muted-foreground)">سجلات</span>
          </button>
        ),
      },
      {
        header: "الحالة",
        accessor: "status",
        cellAlign: "center",
        headerAlign: "center",
        render: (_val, row) => (
          <span
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold ${
              row.status === "active"
                ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20"
                : "bg-(--app-surface-container) text-(--app-muted-foreground) border border-(--app-border)"
            }`}
          >
            {row.status === "active" ? (
              <>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span>تكليف سارٍ</span>
              </>
            ) : (
              <span>منتهٍ</span>
            )}
          </span>
        ),
      },
    ],
    []
  );

  // Interval Detail Modal Table Columns: [ م | نوع التكليف | تاريخ البدء | تاريخ الانتهاء | مدة شغل الوظيفة | الحالة ]
  const intervalColumns: TableColumn<SerializedPositionInterval>[] = useMemo(
    () => [
      {
        header: "نوع التكليف",
        accessor: "roleLabel",
        cellAlign: "center",
        headerAlign: "center",
        render: (val, row) => (
          <ModalBadge
            icon={
              row.role === "substitute" ? (
                <User className="w-3.5 h-3.5 text-(--app-muted-foreground)" />
              ) : (
                <Award className="w-3.5 h-3.5 text-(--color-primary)" />
              )
            }
          >
            {String(val)}
          </ModalBadge>
        ),
      },
      {
        header: "تاريخ البدء",
        accessor: "startDate",
        cellAlign: "center",
        headerAlign: "center",
        className: "font-mono text-xs text-(--app-muted-foreground)",
        render: (val) => safeFormatDate(val, "-"),
      },
      {
        header: "تاريخ الانتهاء",
        accessor: "endDate",
        cellAlign: "center",
        headerAlign: "center",
        render: (val, row) => (
          <span
            className={`text-xs font-bold ${
              row.status === "active" ? "text-(--color-primary) font-black" : "text-(--app-muted-foreground) font-mono"
            }`}
          >
            {row.status === "active" || !val ? "حالي ومستمر" : safeFormatDate(val, "حالي ومستمر")}
          </span>
        ),
      },
      {
        header: "مدة شغل الوظيفة",
        cellAlign: "center",
        headerAlign: "center",
        className: "text-xs font-bold text-(--app-muted-foreground)",
        render: (_val, row) => (
          <span className="text-xs font-bold text-(--app-muted-foreground)">
            {formatArabicDuration(row.startDate, row.endDate)}
          </span>
        ),
      },
      {
        header: "الحالة",
        accessor: "status",
        cellAlign: "center",
        headerAlign: "center",
        render: (_val, row) => (
          <span
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold ${
              row.status === "active"
                ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20"
                : "bg-(--app-surface-container) text-(--app-muted-foreground) border border-(--app-border)"
            }`}
          >
            {row.status === "active" ? (
              <>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span>سارٍ</span>
              </>
            ) : (
              <span>منتهٍ</span>
            )}
          </span>
        ),
      },
    ],
    []
  );

  if (loading) {
    return (
      <div className="flex h-48 items-center justify-center rounded-2xl border border-dashed border-(--app-border) bg-(--app-surface-container)/30">
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="h-7 w-7 animate-spin text-(--color-primary)" />
          <p className="text-xs text-(--app-muted-foreground) font-bold">جاري تحميل السجل الوظيفي للضابط...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-5 text-center">
        <p className="text-xs font-bold text-red-600 dark:text-red-400">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Main Table */}
      <SectionWrapper noPadding className="overflow-hidden rounded-2xl">
        <MainTable
          columns={mainColumns}
          data={filteredData}
          showSerialNumber
          emptyTitle={showActiveOnly ? "لا توجد وظائف جارية حالياً" : "لا توجد وظائف مسجلة"}
          emptyDescription={
            showActiveOnly
              ? "لا يشغل الضابط أي وظيفة أساسية أو بديلة سارية في الوقت الحالي. يمكنك التبديل إلى «كافة الوظائف» لعرض التكليفات السابقة."
              : "لم يتم تسكين أو تكليف الضابط بأي وظيفة أساسية أو بديلة في فرع التنظيم والإدارة حتى الآن."
          }
        />
      </SectionWrapper>

      {/* Detailed Position Intervals Modal */}
      {selectedPosition && (
        <ModalShell
          title={`سجل فترات التكليف: ${selectedPosition.positionTitle}`}
          icon={<History className="w-4 h-4" />}
          onClose={() => setSelectedPosition(null)}
          overlayClassName="bg-black/40"
          panelClassName="max-w-2xl border-(--app-border) shadow-depth-xl"
          bodyClassName="p-5 space-y-4 no-scrollbar text-right"
          footer={
            <div className="flex items-center justify-end w-full">
              <button
                type="button"
                onClick={() => setSelectedPosition(null)}
                className="btn-secondary text-xs"
              >
                إغلاق
              </button>
            </div>
          }
        >
          {/* Position Info Banner */}
          <div className="p-3.5 bg-(--color-primary)/5 border border-(--color-primary)/10 shadow-sm rounded-2xl flex items-center justify-between text-right">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-(--color-primary)/10 border border-(--color-primary)/20 flex items-center justify-center text-(--color-primary) shrink-0">
                <Briefcase className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-extrabold text-(--color-primary)">{selectedPosition.positionTitle}</h4>
                <p className="text-xs text-(--app-muted-foreground) font-bold">الفرع / القسم: {selectedPosition.department}</p>
              </div>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1 bg-(--app-surface-container) border border-(--app-border) rounded-xl shadow-sm text-xs font-bold text-(--app-muted-foreground)">
              <Calendar className="w-3.5 h-3.5 text-(--app-muted-foreground)" />
              <span>إجمالي الفترات:</span>
              <span className="font-mono font-black text-(--color-primary)">{selectedPosition.intervals.length}</span>
            </div>
          </div>

          {/* Intervals Table */}
          <SectionWrapper noPadding className="overflow-hidden rounded-2xl">
            <MainTable
              columns={intervalColumns}
              data={selectedPosition.intervals}
              showSerialNumber
              emptyTitle="لا توجد حركات سابقة"
              emptyDescription="لا توجد فترات تعيين مسجلة لهذه الوظيفة."
            />
          </SectionWrapper>
        </ModalShell>
      )}
    </div>
  );
}
