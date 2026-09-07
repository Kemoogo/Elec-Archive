"use client";

import React, { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  User,
  Plus,
  Clock,
  Scissors,
  CheckCircle2,
  XCircle,
  Edit3,
  MessageSquare,
  CheckCheck,
  Calendar,
  AlertCircle,
} from "lucide-react";
import MainTable, { type TableColumn } from "@/components/ui/Table";
import { SectionWrapper } from "@/components/ui/section-wrapper";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/toast";
import { ActionButton } from "@/components/officers/OfficersTable";
import { LeaveRequestModal, type OfficerOption } from "./LeaveRequestModal";
import { CommanderDecisionModal } from "./CommanderDecisionModal";
import { LeaveExtendModal } from "./LeaveExtendModal";
import { DateField } from "@/components/ui/date-field";
import { ModalShell } from "@/components/ui/modal-shell";
import { ModalActions } from "@/components/ui/modal-actions";
import { extractApiError } from "@/lib/utils";
import {
  LEAVE_TYPE_LABELS,
  type LeaveType,
  type LeaveStatus,
} from "@/lib/db/models/Leave.shared";

export interface LeaveItem {
  id: string;
  officerId: string;
  officerName: string;
  officerLabel?: string;
  officerMilitaryId: string;
  category: string;
  categoryLabel: string;
  type: LeaveType;
  typeLabel: string;
  startDate: string;
  endDate: string;
  lastReturnDate?: string;
  presenceDurationDays?: number;
  actingOfficerId?: string;
  actingOfficerName?: string;
  isActingOfficerPresentConfirmed?: boolean;
  commanderDecision?: {
    status?: string;
    notes?: string;
    decidedAt?: string;
  };
  extensionRequests?: {
    newEndDate: string;
    reason?: string;
    status: string;
  }[];
  actualReturnDate?: string;
  isReturnConfirmed?: boolean;
  reason?: string;
  status: LeaveStatus;
  statusLabel: string;
}

export interface OfficerLeaveStatusRow {
  officerId: string;
  fullName: string;
  rank: string;
  rankLabel: string;
  officerLabel: string;
  militaryId: string;
  seniorityNumber: string;
  defaultLeaveSystem: string;
  // Current dynamic state
  activeLeave?: LeaveItem;
  pendingLeave?: LeaveItem;
  pendingExtension?: LeaveItem;
  lastCompletedLeave?: LeaveItem;
  lastReturnDateFormatted: string;
  presenceDurationDays: number;
  isInUnit: boolean;
  isExternalMission: boolean;
  isReturningToday: boolean;
}

interface LeaveRegisterProps {
  officers: OfficerOption[];
  officerRows: OfficerLeaveStatusRow[];
  pendingRequests: LeaveItem[];
  canEdit: boolean;
  isCommander: boolean;
  showRequestsOnly: boolean;
}

function formatDateDisplay(dateStr?: string | null): string {
  if (!dateStr || typeof dateStr !== "string") return "---";
  const parts = dateStr.split("T")[0].split("-");
  if (parts.length < 3) return "---";
  const [year, month, day] = parts.map(Number);
  if (!year || !month || !day || isNaN(year) || isNaN(month) || isNaN(day)) return "---";
  const d = new Date(year, month - 1, day);
  return d.toLocaleDateString("ar-EG");
}

export function LeaveRegister({
  officers = [],
  officerRows = [],
  pendingRequests = [],
  canEdit,
  isCommander,
  showRequestsOnly,
}: LeaveRegisterProps) {
  const router = useRouter();
  const { showToast } = useToast();

  // Modal States
  const [requestModalOpen, setRequestModalOpen] = useState(false);
  const [selectedOfficerForRequest, setSelectedOfficerForRequest] = useState<string | undefined>(undefined);

  const [decisionModal, setDecisionModal] = useState<{
    isOpen: boolean;
    leaveId: string;
    officerName: string;
    officerLabel?: string;
    actionType: "approve" | "reject" | "modify" | "other_orders";
    initialStartDate: string;
    initialEndDate: string;
  } | null>(null);

  const [extendModal, setExtendModal] = useState<{
    isOpen: boolean;
    leaveId: string;
    officerName: string;
    currentEndDate: string;
  } | null>(null);

  const [interruptLeave, setInterruptLeave] = useState<{
    id: string;
    officerName: string;
  } | null>(null);
  const [actualReturnDate, setActualReturnDate] = useState("");
  const [isInterrupting, setIsInterrupting] = useState(false);

  // Bulk Commander approve loading
  const [isApprovingAll, setIsApprovingAll] = useState(false);

  // 1. Filter out external mission officers
  const eligibleOfficers = useMemo(() => {
    return officerRows.filter((o) => !o.isExternalMission);
  }, [officerRows]);

  // 2. Split into the three core tables:
  // Table 1: Returning today (has active leave ending today, return not yet confirmed)
  const returningTodayOfficers = useMemo(() => {
    return eligibleOfficers.filter((o) => o.isReturningToday);
  }, [eligibleOfficers]);

  // Table 2: Officers inside the unit (not on active leave)
  const insideUnitOfficers = useMemo(() => {
    let list = eligibleOfficers.filter((o) => !o.activeLeave && !o.isReturningToday);
    if (showRequestsOnly) {
      list = list.filter((o) => Boolean(o.pendingLeave));
    }
    return list;
  }, [eligibleOfficers, showRequestsOnly]);

  // Table 3: Officers on active leave
  const onLeaveOfficers = useMemo(() => {
    let list = eligibleOfficers.filter((o) => o.activeLeave && !o.isReturningToday);
    if (showRequestsOnly) {
      list = list.filter((o) => Boolean(o.pendingExtension || o.pendingLeave));
    }
    return list;
  }, [eligibleOfficers, showRequestsOnly]);

  // Bulk Approve All Pending Requests (Commander Header Action)
  const handleApproveAll = async () => {
    if (pendingRequests.length === 0) return;
    if (!confirm(`هل أنت متأكد من التصديق على جميع طلبات الإجازات المعلقة (${pendingRequests.length} طلب) دفعة واحدة؟`)) {
      return;
    }

    setIsApprovingAll(true);
    try {
      const res = await fetch("/api/arkan-harb/leaves/commander-decision", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          leaveIds: pendingRequests.map((r) => r.id),
          action: "approve",
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(extractApiError(data, "فشل في تصديق الكل"));
      }

      showToast("تم التصديق على كافة طلبات الإجازة بنجاح", "success");
      router.refresh();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "حدث خطأ أثناء التصديق", "error");
    } finally {
      setIsApprovingAll(false);
    }
  };

  // Confirm Return Today
  const handleConfirmReturn = async (leaveId: string) => {
    try {
      const res = await fetch("/api/arkan-harb/leaves/confirm-return", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leaveId }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(extractApiError(data, "فشل في تأكيد العودة"));
      }

      showToast("تم تأكيد عودة الضابط للوحدة بنجاح وانتقاله لحاضر بالتمام", "success");
      router.refresh();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "حدث خطأ في الاتصال", "error");
    }
  };

  // Interrupt Leave (قطع الإجازة / عودة مبكرة)
  const handleInterruptSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!interruptLeave || !actualReturnDate) return;

    setIsInterrupting(true);
    try {
      const res = await fetch("/api/arkan-harb/leaves/interrupt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          leaveId: interruptLeave.id,
          actualReturnDate,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(extractApiError(data, "فشل في قطع الإجازة"));
      }

      showToast("تم قطع الإجازة وتسجيل تاريخ العودة الفعلي بنجاح", "success");
      setInterruptLeave(null);
      setActualReturnDate("");
      router.refresh();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "حدث خطأ في الاتصال", "error");
    } finally {
      setIsInterrupting(false);
    }
  };

  // Quick Open Request Modal for an Officer
  const handleOpenRequestModal = (officerId: string) => {
    setSelectedOfficerForRequest(officerId);
    setRequestModalOpen(true);
  };

  // Shared Officer Columns Format (Match Officers Table)
  const renderRank = (_: unknown, row: OfficerLeaveStatusRow) => (
    <span className="font-extrabold text-xs text-(--app-muted-foreground)">
      {row.rankLabel || row.rank}
    </span>
  );

  const renderName = (_: unknown, row: OfficerLeaveStatusRow) => (
    <div className="flex items-center gap-2">
      <User className="h-4 w-4 text-(--app-muted-foreground) shrink-0" />
      <div className="flex flex-col text-right">
        <Link
          href={`/officers/${row.officerId}`}
          className="text-sm font-extrabold text-(--app-foreground) hover:underline hover:text-(--app-info) cursor-pointer"
        >
          {row.fullName}
        </Link>
        <span className="text-xs font-mono text-(--app-muted-foreground)">
          عسكري: #{row.militaryId}
        </span>
      </div>
    </div>
  );

  const renderSystemBadge = (_: unknown, row: OfficerLeaveStatusRow) => {
    const sys = row.defaultLeaveSystem as LeaveType;
    return (
      <Badge
        variant="outline"
        className="bg-(--color-primary)/5 border-(--color-primary)/20 text-(--color-primary) text-xs font-bold px-2.5 py-1"
      >
        {LEAVE_TYPE_LABELS[sys] || row.defaultLeaveSystem || "ميدانية"}
      </Badge>
    );
  };

  const renderLastReturn = (_: unknown, row: OfficerLeaveStatusRow) => (
    <div className="flex flex-col items-center text-xs font-bold">
      <span className="font-extrabold text-(--app-foreground)">
        {row.lastReturnDateFormatted}
      </span>
      {row.presenceDurationDays > 0 && (
        <span className="text-[11px] font-semibold text-(--app-muted-foreground) mt-0.5">
          مدة التواجد: {row.presenceDurationDays} يوم
        </span>
      )}
    </div>
  );

  // ----------------------------------------------------
  // Table 1 Columns: Returning Today
  // ----------------------------------------------------
  const returningColumns: TableColumn<OfficerLeaveStatusRow>[] = [
    { header: "الرتبة", accessor: "rankLabel", cellAlign: "center", headerAlign: "center", render: renderRank },
    { header: "الاسم والبيانات العسكرية", accessor: "fullName", cellAlign: "right", headerAlign: "right", render: renderName },
    { header: "نظام الإجازة", accessor: "defaultLeaveSystem", cellAlign: "center", headerAlign: "center", render: renderSystemBadge },
    {
      header: "فترة الإجازة المنتهية اليوم",
      accessor: "activeLeave",
      cellAlign: "center",
      headerAlign: "center",
      render: (_, row) => (
        <div className="flex flex-col items-center text-xs font-bold text-amber-900 dark:text-amber-300">
          <span>من {formatDateDisplay(row.activeLeave?.startDate)}</span>
          <span className="font-extrabold text-amber-700 dark:text-amber-400">حتى اليوم ({formatDateDisplay(row.activeLeave?.endDate)})</span>
        </div>
      ),
    },
    {
      header: "القائم بالأعمال",
      accessor: "activeLeave",
      cellAlign: "center",
      headerAlign: "center",
      render: (_, row) => (
        <span className="text-xs font-bold text-(--app-foreground)">
          {row.activeLeave?.actingOfficerName || "ـ"}
        </span>
      ),
    },
    {
      header: "الإجراءات",
      cellAlign: "center",
      headerAlign: "center",
      minWidth: true,
      render: (_, row) => (
        <div className="flex items-center justify-center gap-2">
          {canEdit && row.activeLeave && (
            <button
              type="button"
              onClick={() => handleConfirmReturn(row.activeLeave!.id)}
              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-extrabold shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>تأكيد عودة</span>
            </button>
          )}
        </div>
      ),
    },
  ];

  // ----------------------------------------------------
  // Table 2 Columns: Inside Unit
  // ----------------------------------------------------
  const insideUnitColumns: TableColumn<OfficerLeaveStatusRow>[] = [
    { header: "الرتبة", accessor: "rankLabel", cellAlign: "center", headerAlign: "center", render: renderRank },
    { header: "الاسم والبيانات العسكرية", accessor: "fullName", cellAlign: "right", headerAlign: "right", render: renderName },
    { header: "نوع نظام الإجازة", accessor: "defaultLeaveSystem", cellAlign: "center", headerAlign: "center", render: renderSystemBadge },
    { header: "آخر عودة ومدة التواجد", accessor: "lastReturnDateFormatted", cellAlign: "center", headerAlign: "center", render: renderLastReturn },
    {
      header: "الملاحظات وموقف الطلبات",
      accessor: "pendingLeave",
      cellAlign: "center",
      headerAlign: "center",
      render: (_, row) => {
        if (row.pendingLeave) {
          return (
            <div className="flex flex-col items-center gap-1">
              <Badge
                variant="secondary"
                className="bg-amber-500/10 text-amber-800 border-amber-500/30 text-xs font-extrabold px-2.5 py-1"
              >
                طلب إجازة معلق للقائد ({formatDateDisplay(row.pendingLeave.startDate)} - {formatDateDisplay(row.pendingLeave.endDate)})
              </Badge>
              {row.pendingLeave.commanderDecision?.notes && (
                <span className="text-[10px] text-amber-700 font-bold">
                  توجيه القائد: {row.pendingLeave.commanderDecision.notes}
                </span>
              )}
            </div>
          );
        }
        return <span className="text-xs font-semibold text-(--app-muted-foreground)">متواجد بالوحدة</span>;
      },
    },
    {
      header: "الإجراءات",
      cellAlign: "center",
      headerAlign: "center",
      minWidth: true,
      render: (_, row) => (
        <div className="flex items-center justify-center gap-1.5">
          {/* Commander Decision Buttons on Pending Leave */}
          {isCommander && row.pendingLeave && (
            <div className="flex items-center gap-1 bg-(--app-surface-container) p-1 rounded-xl border border-(--app-border)">
              <ActionButton
                icon={<CheckCircle2 className="w-4 h-4 text-emerald-600" />}
                color="btn-action-success"
                title="تصدق (اعتماد الإجازة)"
                onClick={() =>
                  setDecisionModal({
                    isOpen: true,
                    leaveId: row.pendingLeave!.id,
                    officerName: row.fullName,
                    officerLabel: row.officerLabel,
                    actionType: "approve",
                    initialStartDate: row.pendingLeave!.startDate,
                    initialEndDate: row.pendingLeave!.endDate,
                  })
                }
              />
              <ActionButton
                icon={<XCircle className="w-4 h-4 text-red-600" />}
                color="btn-action-danger"
                title="لم يتصدق (رفض الطلب)"
                onClick={() =>
                  setDecisionModal({
                    isOpen: true,
                    leaveId: row.pendingLeave!.id,
                    officerName: row.fullName,
                    officerLabel: row.officerLabel,
                    actionType: "reject",
                    initialStartDate: row.pendingLeave!.startDate,
                    initialEndDate: row.pendingLeave!.endDate,
                  })
                }
              />
              <ActionButton
                icon={<Edit3 className="w-4 h-4 text-blue-600" />}
                color="btn-action-info"
                title="تعديل المواعيد والتصديق"
                onClick={() =>
                  setDecisionModal({
                    isOpen: true,
                    leaveId: row.pendingLeave!.id,
                    officerName: row.fullName,
                    officerLabel: row.officerLabel,
                    actionType: "modify",
                    initialStartDate: row.pendingLeave!.startDate,
                    initialEndDate: row.pendingLeave!.endDate,
                  })
                }
              />
              <ActionButton
                icon={<MessageSquare className="w-4 h-4 text-amber-600" />}
                color="btn-action-warning"
                title="أوامر وتعليمات أخرى"
                onClick={() =>
                  setDecisionModal({
                    isOpen: true,
                    leaveId: row.pendingLeave!.id,
                    officerName: row.fullName,
                    officerLabel: row.officerLabel,
                    actionType: "other_orders",
                    initialStartDate: row.pendingLeave!.startDate,
                    initialEndDate: row.pendingLeave!.endDate,
                  })
                }
              />
            </div>
          )}

          {/* Arkan Harb Action: Submit Leave Request */}
          {canEdit && !row.pendingLeave && (
            <button
              type="button"
              onClick={() => handleOpenRequestModal(row.officerId)}
              className="px-3 py-1.5 bg-(--color-primary)/10 hover:bg-(--color-primary)/20 text-(--color-primary) border border-(--color-primary)/20 rounded-xl text-xs font-bold transition-all flex items-center gap-1 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>تقديم طلب إجازة</span>
            </button>
          )}
        </div>
      ),
    },
  ];

  // ----------------------------------------------------
  // Table 3 Columns: On Leave
  // ----------------------------------------------------
  const onLeaveColumns: TableColumn<OfficerLeaveStatusRow>[] = [
    { header: "الرتبة", accessor: "rankLabel", cellAlign: "center", headerAlign: "center", render: renderRank },
    { header: "الاسم والبيانات العسكرية", accessor: "fullName", cellAlign: "right", headerAlign: "right", render: renderName },
    { header: "نوع نظام الإجازة", accessor: "defaultLeaveSystem", cellAlign: "center", headerAlign: "center", render: renderSystemBadge },
    {
      header: "فترة الإجازة السارية",
      accessor: "activeLeave",
      cellAlign: "center",
      headerAlign: "center",
      render: (_, row) => (
        <div className="flex flex-col items-center text-xs font-bold">
          <span className="font-extrabold text-(--app-foreground)">
            {formatDateDisplay(row.activeLeave?.startDate)} حتى {formatDateDisplay(row.activeLeave?.endDate)}
          </span>
          <div className="flex items-center gap-1.5 text-[10px] font-bold text-(--app-success) mt-0.5">
            <span className="w-1.5 h-1.5 rounded-full bg-(--app-success) animate-pulse" />
            <span>سارٍ بالتمام اليومي</span>
          </div>
        </div>
      ),
    },
    {
      header: "الملاحظات وموقف الامتداد",
      accessor: "pendingExtension",
      cellAlign: "center",
      headerAlign: "center",
      render: (_, row) => {
        if (row.pendingExtension) {
          return (
            <Badge
              variant="secondary"
              className="bg-purple-500/10 text-purple-800 border-purple-500/30 text-xs font-extrabold px-2 py-0.5"
            >
              طلب امتداد معلق للقائد
            </Badge>
          );
        }
        return (
          <div className="flex flex-col text-xs text-(--app-muted-foreground)">
            <span>القائم بالأعمال: {row.activeLeave?.actingOfficerName || "ـ"}</span>
            {row.activeLeave?.reason && <span>السبب: {row.activeLeave.reason}</span>}
          </div>
        );
      },
    },
    {
      header: "الإجراءات",
      cellAlign: "center",
      headerAlign: "center",
      minWidth: true,
      render: (_, row) => (
        <div className="flex items-center justify-center gap-1.5">
          {/* Commander Decision on Pending Extension */}
          {isCommander && row.pendingExtension && (
            <div className="flex items-center gap-1 bg-(--app-surface-container) p-1 rounded-xl border border-(--app-border)">
              <ActionButton
                icon={<CheckCircle2 className="w-4 h-4 text-emerald-600" />}
                color="btn-action-success"
                title="تصدق (اعتماد الامتداد)"
                onClick={() =>
                  setDecisionModal({
                    isOpen: true,
                    leaveId: row.activeLeave!.id,
                    officerName: row.fullName,
                    officerLabel: row.officerLabel,
                    actionType: "approve",
                    initialStartDate: row.activeLeave!.startDate,
                    initialEndDate: row.activeLeave!.endDate,
                  })
                }
              />
              <ActionButton
                icon={<XCircle className="w-4 h-4 text-red-600" />}
                color="btn-action-danger"
                title="لم يتصدق (رفض الامتداد)"
                onClick={() =>
                  setDecisionModal({
                    isOpen: true,
                    leaveId: row.activeLeave!.id,
                    officerName: row.fullName,
                    officerLabel: row.officerLabel,
                    actionType: "reject",
                    initialStartDate: row.activeLeave!.startDate,
                    initialEndDate: row.activeLeave!.endDate,
                  })
                }
              />
            </div>
          )}

          {/* Arkan Harb Actions on Active Leave: Extend & Interrupt */}
          {canEdit && row.activeLeave && !row.pendingExtension && (
            <>
              <button
                type="button"
                onClick={() =>
                  setExtendModal({
                    isOpen: true,
                    leaveId: row.activeLeave!.id,
                    officerName: row.fullName,
                    currentEndDate: row.activeLeave!.endDate,
                  })
                }
                title="طلب امتداد الإجازة"
                className="px-2.5 py-1.5 bg-purple-500/10 hover:bg-purple-500/20 text-purple-700 border border-purple-500/30 rounded-xl text-xs font-bold transition-all flex items-center gap-1 cursor-pointer"
              >
                <Clock className="w-3.5 h-3.5" />
                <span>طلب امتداد</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setInterruptLeave({ id: row.activeLeave!.id, officerName: row.fullName });
                  setActualReturnDate(new Date().toISOString().split("T")[0]);
                }}
                title="تسجيل عودة مبكرة وقطع الإجازة"
                className="px-2.5 py-1.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 border border-amber-500/30 rounded-xl text-xs font-bold transition-all flex items-center gap-1 cursor-pointer"
              >
                <Scissors className="w-3.5 h-3.5" />
                <span>تسجيل عودة</span>
              </button>
            </>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-8">
      {/* Commander Bulk Approval Banner */}
      {isCommander && pendingRequests.length > 0 && (
        <SectionWrapper className="bg-amber-500/10 border border-amber-500/30">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-1">
            <div className="flex items-center gap-3 text-right">
              <div className="p-2.5 bg-amber-500/20 rounded-xl text-amber-800">
                <AlertCircle className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-black text-amber-900">
                  يوجد ({pendingRequests.length}) طلب إجازة / امتداد في انتظار تصديق سيادتكم
                </h4>
                <p className="text-xs font-bold text-amber-800/80">
                  يمكنكم مراجعة الطلبات فردياً في الجداول أو التصديق على الجميع دفعة واحدة.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleApproveAll}
              disabled={isApprovingAll}
              className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black shadow-md transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50 shrink-0"
            >
              <CheckCheck className="w-4 h-4" />
              <span>{isApprovingAll ? "جاري التصديق..." : "تصدق للكل"}</span>
            </button>
          </div>
        </SectionWrapper>
      )}

      {/* ---------------------------------------------------- */}
      {/* 1. TABLE: RETURNING TODAY (Conditional: shows only if > 0) */}
      {/* ---------------------------------------------------- */}
      {returningTodayOfficers.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-ping" />
              <h3 className="text-base font-black text-amber-800 dark:text-amber-400">
                عودة من الإجازة اليوم ({returningTodayOfficers.length} ضابط)
              </h3>
            </div>
            <span className="text-xs font-bold text-slate-500">
              يرجى تأكيد عودتهم للوحدة رسمياً لنقلهم إلى قوة داخل الوحدة
            </span>
          </div>

          <SectionWrapper noPadding className="overflow-hidden rounded-2xl">
            <MainTable<OfficerLeaveStatusRow>
              columns={returningColumns}
              data={returningTodayOfficers}
              showSerialNumber={true}
              emptyTitle="لا يوجد ضباط منتظر عودتهم اليوم"
            />
          </SectionWrapper>
        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* 2. TABLE: INSIDE UNIT OFFICERS */}
      {/* ---------------------------------------------------- */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-4 bg-emerald-600 rounded-full" />
            <h3 className="text-base font-black text-(--color-primary)">
              ضباط داخل الوحدة ({insideUnitOfficers.length} ضابط)
            </h3>
          </div>
          <span className="text-xs font-bold text-(--app-muted-foreground)">
            الضباط المتواجدون حالياً بالقوة داخل الوحدة
          </span>
        </div>

        <SectionWrapper noPadding className="overflow-hidden rounded-2xl">
          <MainTable<OfficerLeaveStatusRow>
            columns={insideUnitColumns}
            data={insideUnitOfficers}
            showSerialNumber={true}
            emptyTitle="لا يوجد ضباط داخل الوحدة حالياً"
            emptyDescription="جميع الضباط إما في إجازات أو مأموريات خارجية"
          />
        </SectionWrapper>
      </div>

      {/* ---------------------------------------------------- */}
      {/* 3. TABLE: OFFICERS ON LEAVE */}
      {/* ---------------------------------------------------- */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-4 bg-amber-600 rounded-full" />
            <h3 className="text-base font-black text-(--color-primary)">
              ضباط في الإجازة ({onLeaveOfficers.length} ضابط)
            </h3>
          </div>
          <span className="text-xs font-bold text-(--app-muted-foreground)">
            الضباط الذين يقضون إجازاتهم حالياً وسارية بتمام اليوم
          </span>
        </div>

        <SectionWrapper noPadding className="overflow-hidden rounded-2xl">
          <MainTable<OfficerLeaveStatusRow>
            columns={onLeaveColumns}
            data={onLeaveOfficers}
            showSerialNumber={true}
            emptyTitle="لا يوجد ضباط في إجازة حالياً"
            emptyDescription="جميع ضباط الوحدة متواجدون داخل الوحدة"
          />
        </SectionWrapper>
      </div>

      {/* ---------------------------------------------------- */}
      {/* MODALS */}
      {/* ---------------------------------------------------- */}

      {/* Leave Request Modal */}
      <LeaveRequestModal
        officers={officers}
        preselectedOfficerId={selectedOfficerForRequest}
        isOpen={requestModalOpen}
        onClose={() => {
          setRequestModalOpen(false);
          setSelectedOfficerForRequest(undefined);
        }}
      />

      {/* Commander Decision Modal */}
      {decisionModal && decisionModal.isOpen && (
        <CommanderDecisionModal
          leaveId={decisionModal.leaveId}
          officerName={decisionModal.officerName}
          officerLabel={decisionModal.officerLabel}
          actionType={decisionModal.actionType}
          initialStartDate={decisionModal.initialStartDate}
          initialEndDate={decisionModal.initialEndDate}
          isOpen={decisionModal.isOpen}
          onClose={() => setDecisionModal(null)}
        />
      )}

      {/* Leave Extension Modal */}
      {extendModal && extendModal.isOpen && (
        <LeaveExtendModal
          leaveId={extendModal.leaveId}
          officerName={extendModal.officerName}
          currentEndDate={extendModal.currentEndDate}
          isOpen={extendModal.isOpen}
          onClose={() => setExtendModal(null)}
        />
      )}

      {/* Interrupt Leave Modal (قطع الإجازة وتسجيل عودة مبكرة) */}
      {interruptLeave && (
        <ModalShell
          title="تسجيل عودة مبكرة (قطع الإجازة)"
          icon={<Calendar className="w-4 h-4" />}
          onClose={() => setInterruptLeave(null)}
          overlayClassName="bg-black/40"
          panelClassName="max-h-[85vh] max-w-md border-(--app-border) shadow-depth-xl"
          bodyClassName="p-6"
          footer={
            <ModalActions
              submitText={isInterrupting ? "جاري الحفظ..." : "إقرار قطع الإجازة"}
              submitLoading={isInterrupting}
              onCancel={() => setInterruptLeave(null)}
              form="interrupt-leave-form"
            />
          }
        >
          <form id="interrupt-leave-form" onSubmit={handleInterruptSubmit} className="space-y-4 text-right">
            <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-xs text-amber-900 font-medium">
              سيتم تعديل حالة إجازة الضابط (<strong>{interruptLeave.officerName}</strong>) إلى &quot;مقطوعة&quot; وتحديث تمامه تلقائياً كـ &quot;حاضر&quot; من تاريخ العودة الفعلي.
            </div>

            <DateField
              id="actualReturnDate"
              label="تاريخ العودة الفعلي (تاريخ القطع)"
              value={actualReturnDate}
              onChange={setActualReturnDate}
              required
            />
          </form>
        </ModalShell>
      )}
    </div>
  );
}
