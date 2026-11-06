"use client";

import React, { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  User,
  Plus,
  Clock,
  Scissors,
  CheckCircle2,
  XCircle,
  Edit3,
  CheckCheck,
  Calendar,
  AlertCircle,
  Trash2,
  Paperclip,
  Award,
  CheckCircle,
  Check,
  X,
  Eye,
  ChevronRight,
  ChevronLeft,
  FileText,
  ClipboardList,
  RotateCcw,
} from "lucide-react";
import MainTable, { type TableColumn } from "@/components/ui/Table";
import { SectionWrapper } from "@/components/ui/section-wrapper";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/toast";
import { ActionButton } from "@/components/officers/OfficersTable";
import { LeaveRequestModal } from "./LeaveRequestModal";
import type { OfficerOption } from "@/types/officer";
import { CommanderDecisionModal } from "./CommanderDecisionModal";
import { LeaveExtendModal } from "./LeaveExtendModal";
import { LeaveResumeModal, type InterruptedLeaveInfo } from "./LeaveResumeModal";
import { DateField } from "@/components/ui/date-field";
import { ModalShell } from "@/components/ui/modal-shell";
import { ModalActions } from "@/components/ui/modal-actions";
import { CustomSelect } from "@/components/ui/custom-select";
import { extractApiError } from "@/lib/utils";
import { LeaveSystemModal } from "./LeaveSystemModal";
import { OfficerLeaveHistoryModal } from "./OfficerLeaveHistoryModal";
import { formatDateWithDay, getDayName, formatDateDisplay } from "@/components/ui/date-badge";
import {
  LEAVE_TYPE_LABELS,
  OFFICER_LEAVE_SYSTEM_LABELS,
  LEAVE_REQUEST_TYPES,
  type OfficerLeaveSystem,
  type LeaveType,
  type LeaveStatus,
} from "@/lib/db/models/Leave.shared";
import { formatOfficerRank } from "@/lib/db/models/Officer.shared";

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
  actingOfficerLabel?: string;
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
  originalEndDate?: string;
  isResumed?: boolean;
  resumedLeaveId?: string;
  isReturnConfirmed?: boolean;
  medicalReportUrl?: string;
  reason?: string;
  viewedByCommander?: boolean;
  status: LeaveStatus;
  statusLabel: string;
}

function calculateTotalDays(startDateStr?: string, endDateStr?: string): number {
  if (!startDateStr || !endDateStr) return 0;
  const sParts = startDateStr.match(/^(\d{4})-(\d{2})-(\d{2})/);
  const eParts = endDateStr.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!sParts || !eParts) return 1;
  const s = new Date(Number(sParts[1]), Number(sParts[2]) - 1, Number(sParts[3]));
  const e = new Date(Number(eParts[1]), Number(eParts[2]) - 1, Number(eParts[3]));
  const diffMs = e.getTime() - s.getTime();
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24)) + 1;
  return Math.max(1, diffDays);
}

function formatDaysDisplay(count: number): string {
  if (count <= 0) return "ـ";
  const label = count >= 3 && count <= 10 ? "أيام" : "يوم";
  return `${count} ${label}`;
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
  interruptedLeave?: LeaveItem;
  lastReturnDate?: string;
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
  isAdmin?: boolean;
  showRequestsOnly: boolean;
}

export function LeaveRegister({
  officers = [],
  officerRows = [],
  pendingRequests = [],
  canEdit,
  isCommander,
  isAdmin = false,
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
    officerLabel?: string;
    currentEndDate: string;
  } | null>(null);

  const [interruptLeave, setInterruptLeave] = useState<{
    id: string;
    officerName: string;
  } | null>(null);
  const [actualReturnDate, setActualReturnDate] = useState("");
  const [interruptReason, setInterruptReason] = useState("");
  const [isInterrupting, setIsInterrupting] = useState(false);

  // Cancel Leave Modal State
  const [cancelModal, setCancelModal] = useState<{
    leaveId: string;
    officerName: string;
  } | null>(null);
  const [cancelReason, setCancelReason] = useState("");
  const [isCancelling, setIsCancelling] = useState(false);

  // Edit Pending Leave Modal State
  const [editPendingModal, setEditPendingModal] = useState<{
    isOpen: boolean;
    leaveId: string;
    officerId: string;
    officerName: string;
    officerLabel: string;
    type: LeaveType;
    startDate: string;
    endDate: string;
    actingOfficerId?: string;
    isActingOfficerPresentConfirmed?: boolean;
    reason?: string;
  } | null>(null);
  const [isEditingPending, setIsEditingPending] = useState(false);

  // Leave system change modal state
  const [systemModalOfficer, setSystemModalOfficer] = useState<{
    officerId: string;
    officerName: string;
    officerRank?: string;
    officerLabel?: string;
    militaryId?: string;
    seniorityNumber?: string;
    currentSystem?: string;
  } | null>(null);

  // Officer leave history modal state
  const [historyModalOfficer, setHistoryModalOfficer] = useState<{
    officerId: string;
    fullName: string;
    rankLabel?: string;
    militaryId?: string;
    seniorityNumber?: string;
  } | null>(null);

  // Bulk Approve Modal State
  const [bulkApproveModalOpen, setBulkApproveModalOpen] = useState(false);

  // Resume Interrupted Leave Modal State
  const [resumeModalData, setResumeModalData] = useState<InterruptedLeaveInfo | null>(null);

  // Local optimistic state for instant UI reaction without refresh
  const [localRows, setLocalRows] = useState<OfficerLeaveStatusRow[]>(officerRows);
  const [localPendingRequests, setLocalPendingRequests] = useState<LeaveItem[]>(pendingRequests);

  useEffect(() => {
    setLocalRows(officerRows);
  }, [officerRows]);

  useEffect(() => {
    setLocalPendingRequests(pendingRequests);
  }, [pendingRequests]);

  // Bulk Commander approve loading
  const [isApprovingAll, setIsApprovingAll] = useState(false);

  // 1. Filter out external mission officers
  const eligibleOfficers = useMemo(() => {
    return localRows.filter((o) => !o.isExternalMission);
  }, [localRows]);

  // 2. Split into the tables:
  // Table 1: Returning today (has active leave ending today, return not yet confirmed)
  const returningTodayOfficers = useMemo(() => {
    return eligibleOfficers.filter((o) => o.isReturningToday);
  }, [eligibleOfficers]);

  // Table 2: Officers with pending leave requests (shows only if requests exist)
  const pendingLeaveOfficers = useMemo(() => {
    return eligibleOfficers.filter((o) => Boolean(o.pendingLeave));
  }, [eligibleOfficers]);

  // Table 3: Officers on active leave
  const onLeaveOfficers = useMemo(() => {
    let list = eligibleOfficers.filter((o) => o.activeLeave && !o.isReturningToday);
    if (showRequestsOnly) {
      list = list.filter((o) => Boolean(o.pendingExtension || o.pendingLeave));
    }
    return list;
  }, [eligibleOfficers, showRequestsOnly]);

  // Instant handler for Commander Decision on individual leave
  const handleCommanderSuccess = (
    leaveId: string,
    action: string,
    modifiedStart?: string,
    modifiedEnd?: string
  ) => {
    setLocalPendingRequests((prev) => prev.filter((r) => r.id !== leaveId));
    setLocalRows((prevRows) =>
      prevRows.map((row) => {
        if (row.pendingLeave?.id === leaveId) {
          const leave = row.pendingLeave;
          if (action === "approve" || action === "modify") {
            return {
              ...row,
              pendingLeave: undefined,
              activeLeave: {
                ...leave,
                startDate: modifiedStart || leave.startDate,
                endDate: modifiedEnd || leave.endDate,
                status: "approved",
              },
            };
          } else {
            return {
              ...row,
              pendingLeave: undefined,
            };
          }
        }
        return row;
      })
    );
    router.refresh();
  };

  // Instant handler for Direct Leave Extension
  const handleExtendSuccess = (leaveId: string, newEndDate: string) => {
    setLocalRows((prevRows) =>
      prevRows.map((row) => {
        if (row.activeLeave?.id === leaveId) {
          return {
            ...row,
            activeLeave: {
              ...row.activeLeave,
              endDate: newEndDate,
            },
          };
        }
        return row;
      })
    );
    router.refresh();
  };

  // Bulk Approve Handler: Open dedicated modal
  const handleApproveAll = () => {
    if (localPendingRequests.length === 0) return;
    setBulkApproveModalOpen(true);
  };

  // Confirm execution of Bulk Approval from modal
  const handleConfirmBulkApprove = async () => {
    if (localPendingRequests.length === 0) return;

    setIsApprovingAll(true);
    try {
      const res = await fetch("/api/arkan-harb/leaves/commander-decision", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          leaveIds: localPendingRequests.map((r) => r.id),
          action: "approve",
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(extractApiError(data, "فشل في تصديق الكل"));
      }

      showToast("تم التصديق على كافة طلبات الإجازة بنجاح", "success");
      setBulkApproveModalOpen(false);
      setLocalPendingRequests([]);
      setLocalRows((prevRows) =>
        prevRows.map((row) => {
          if (row.pendingLeave) {
            return {
              ...row,
              activeLeave: {
                ...row.pendingLeave,
                status: "approved",
              },
              pendingLeave: undefined,
            };
          }
          return row;
        })
      );
      router.refresh();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "حدث خطأ أثناء التصديق", "error");
    } finally {
      setIsApprovingAll(false);
    }
  };

  // Carousel Review Modal State & Handlers
  interface CarouselReviewItem {
    leaveId: string;
    officerId: string;
    officerName: string;
    officerRankLabel?: string;
    officerLabel?: string;
    militaryId?: string;
    seniorityNumber?: string;
    defaultLeaveSystem?: string;
    leaveTypeLabel: string;
    startDate: string;
    endDate: string;
    presenceDurationDays?: number;
    actingOfficerId?: string;
    actingOfficerName?: string;
    actingOfficerLabel?: string;
    isActingOfficerPresentConfirmed?: boolean;
    reason?: string;
    medicalReportUrl?: string;
    decision?: "approved" | "rejected";
  }

  const [carouselOpen, setCarouselOpen] = useState(false);
  const [carouselIndex, setCarouselIndex] = useState(0);
  const [slideDirection, setSlideDirection] = useState<"next" | "prev">("next");
  const [hasRejectedAny, setHasRejectedAny] = useState(false);
  const [carouselItems, setCarouselItems] = useState<CarouselReviewItem[]>([]);
  const [isCarouselSubmitting, setIsCarouselSubmitting] = useState(false);

  const openCarousel = (targetLeaveId?: string) => {
    const sourceList = targetLeaveId
      ? pendingLeaveOfficers.filter((o) => o.pendingLeave?.id === targetLeaveId)
      : pendingLeaveOfficers;

    const items: CarouselReviewItem[] = sourceList.map((o) => {
      const actingId = o.pendingLeave?.actingOfficerId;
      const actingFromList = actingId ? officers.find((off) => off.id === actingId) : undefined;
      const actingLabel =
        actingFromList?.officerLabel ||
        o.pendingLeave?.actingOfficerLabel ||
        (actingFromList?.rank && actingFromList?.fullName
          ? `${formatOfficerRank(actingFromList.rank, actingFromList.isArkanHarb)} / ${actingFromList.fullName}`
          : o.pendingLeave?.actingOfficerName);

      return {
        leaveId: o.pendingLeave!.id,
        officerId: o.officerId,
        officerName: o.fullName,
        officerRankLabel: o.rankLabel,
        officerLabel: o.officerLabel,
        militaryId: o.militaryId,
        seniorityNumber: o.seniorityNumber,
        defaultLeaveSystem: o.defaultLeaveSystem,
        leaveTypeLabel: o.pendingLeave!.typeLabel || "إجازة رسمية",
        startDate: o.pendingLeave!.startDate,
        endDate: o.pendingLeave!.endDate,
        presenceDurationDays: o.presenceDurationDays,
        actingOfficerId: actingId,
        actingOfficerName: o.pendingLeave!.actingOfficerName,
        actingOfficerLabel: actingLabel,
        isActingOfficerPresentConfirmed: Boolean(
          (actingId || o.pendingLeave!.actingOfficerName) &&
          o.pendingLeave!.isActingOfficerPresentConfirmed
        ),
        reason: o.pendingLeave!.reason,
        medicalReportUrl: o.pendingLeave!.medicalReportUrl,
      };
    });

    if (items.length === 0) return;

    setCarouselItems(items);
    setCarouselIndex(0);
    setSlideDirection("next");
    setHasRejectedAny(false);
    setCarouselOpen(true);
  };

  const handleCarouselDecision = async (action: "approve" | "reject") => {
    const currentItem = carouselItems[carouselIndex];
    if (!currentItem || currentItem.decision || isCarouselSubmitting) return;

    setIsCarouselSubmitting(true);
    try {
      const res = await fetch("/api/arkan-harb/leaves/commander-decision", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          leaveIds: [currentItem.leaveId],
          action,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(extractApiError(data, "فشل تسجيل القرار"));
      }

      handleCommanderSuccess(currentItem.leaveId, action);
      if (action === "reject") {
        setHasRejectedAny(true);
      }

      const decidedStatus: "approved" | "rejected" =
        action === "approve" ? "approved" : "rejected";

      const updatedItems = carouselItems.map((it, idx) =>
        idx === carouselIndex ? { ...it, decision: decidedStatus } : it
      );
      setCarouselItems(updatedItems);

      showToast(
        action === "approve"
          ? `تم التصديق على إجازة ${currentItem.officerName}`
          : `لم يتصدق على إجازة ${currentItem.officerName}`,
        action === "approve" ? "success" : "info"
      );

      // Determine next request to automatically advance to:
      // 1. Next undecided item after current index
      let nextIndex = -1;
      for (let i = carouselIndex + 1; i < updatedItems.length; i++) {
        if (!updatedItems[i].decision) {
          nextIndex = i;
          break;
        }
      }
      // 2. If not found, search from the beginning for any undecided item
      if (nextIndex === -1) {
        for (let i = 0; i < carouselIndex; i++) {
          if (!updatedItems[i].decision) {
            nextIndex = i;
            break;
          }
        }
      }

      if (nextIndex !== -1) {
        setTimeout(() => {
          setSlideDirection("next");
          setCarouselIndex(nextIndex);
        }, 250);
      } else {
        // If all items have decisions:
        if (carouselIndex < updatedItems.length - 1) {
          setTimeout(() => {
            setSlideDirection("next");
            setCarouselIndex((prev) => prev + 1);
          }, 250);
        } else {
          // Gracefully close modal after brief delay
          setTimeout(() => {
            setCarouselOpen(false);
          }, 600);
        }
      }
    } catch (err) {
      showToast(err instanceof Error ? err.message : "حدث خطأ أثناء حفظ القرار", "error");
    } finally {
      setIsCarouselSubmitting(false);
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
      setLocalRows((prevRows) =>
        prevRows.map((row) => {
          if (row.activeLeave?.id === leaveId) {
            return {
              ...row,
              activeLeave: undefined,
              isReturningToday: false,
            };
          }
          return row;
        })
      );
      router.refresh();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "حدث خطأ في الاتصال", "error");
    }
  };

  // Interrupt Leave (قطع الإجازة / عودة مبكرة)
  const handleInterruptSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!interruptLeave || !actualReturnDate) return;

    const todayStr = new Date().toISOString().split("T")[0];
    if (actualReturnDate > todayStr) {
      showToast("قطع الإجازة يجب أن يكون في يوم التنفيذ ولا يمكن أن يكون تاريخاً مستقبلياً", "error");
      return;
    }

    setIsInterrupting(true);
    try {
      const res = await fetch("/api/arkan-harb/leaves/interrupt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          leaveId: interruptLeave.id,
          actualReturnDate,
          reason: interruptReason.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(extractApiError(data, "فشل في قطع الإجازة"));
      }

      showToast("تم تسجيل قطع الإجازة وتحديث التمام بنجاح", "success");
      setLocalRows((prevRows) =>
        prevRows.map((row) => {
          if (row.activeLeave?.id === interruptLeave.id) {
            return {
              ...row,
              activeLeave: undefined,
            };
          }
          return row;
        })
      );
      setInterruptLeave(null);
      setInterruptReason("");
      router.refresh();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "حدث خطأ في الاتصال", "error");
    } finally {
      setIsInterrupting(false);
    }
  };

  // Cancel Pending Leave Request (قبل اطلاع القائد)
  const handleCancelSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cancelModal) return;

    const targetLeaveId = cancelModal.leaveId;
    setIsCancelling(true);
    try {
      const res = await fetch("/api/arkan-harb/leaves/cancel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          leaveId: targetLeaveId,
          reason: cancelReason.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(extractApiError(data, "فشل في إلغاء طلب الإجازة"));
      }

      showToast("تم إلغاء وسحب طلب الإجازة بنجاح", "success");
      setCancelModal(null);
      setCancelReason("");
      setLocalPendingRequests((prev) => prev.filter((r) => r.id !== targetLeaveId));
      setLocalRows((prevRows) =>
        prevRows.map((row) => {
          if (row.pendingLeave?.id === targetLeaveId) {
            return {
              ...row,
              pendingLeave: undefined,
            };
          }
          return row;
        })
      );
      router.refresh();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "حدث خطأ في الاتصال", "error");
    } finally {
      setIsCancelling(false);
    }
  };

  // Submit edits for pending leave request
  const handleEditPendingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editPendingModal) return;

    if (!editPendingModal.startDate || !editPendingModal.endDate) {
      showToast("يرجى تحديد تاريخ البداية والنهاية", "error");
      return;
    }

    if (new Date(editPendingModal.endDate) < new Date(editPendingModal.startDate)) {
      showToast("تاريخ النهاية يجب أن يكون بعد أو نفس تاريخ البداية", "error");
      return;
    }

    setIsEditingPending(true);
    try {
      const res = await fetch(`/api/arkan-harb/leaves/${editPendingModal.leaveId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: editPendingModal.type,
          startDate: editPendingModal.startDate,
          endDate: editPendingModal.endDate,
          actingOfficerId: editPendingModal.actingOfficerId || undefined,
          isActingOfficerPresentConfirmed: Boolean(editPendingModal.actingOfficerId && editPendingModal.isActingOfficerPresentConfirmed),
          reason: editPendingModal.reason?.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(extractApiError(data, "فشل في تعديل طلب الإجازة"));
      }

      showToast("تم تعديل طلب الإجازة بنجاح", "success");

      const targetLeaveId = editPendingModal.leaveId;
      const updatedType = editPendingModal.type;
      const updatedStart = editPendingModal.startDate;
      const updatedEnd = editPendingModal.endDate;
      const updatedReason = editPendingModal.reason;
      const updatedActingId = editPendingModal.actingOfficerId;
      const updatedConfirmed = Boolean(editPendingModal.actingOfficerId && editPendingModal.isActingOfficerPresentConfirmed);

      const actingOfficer = officers.find((o) => o.id === updatedActingId);
      const actingLabel = actingOfficer?.officerLabel;

      setLocalRows((prevRows) =>
        prevRows.map((row) => {
          if (row.pendingLeave?.id === targetLeaveId) {
            return {
              ...row,
              pendingLeave: {
                ...row.pendingLeave,
                type: updatedType,
                typeLabel: LEAVE_TYPE_LABELS[updatedType] || updatedType,
                startDate: updatedStart,
                endDate: updatedEnd,
                actingOfficerId: updatedActingId,
                actingOfficerName: actingOfficer?.fullName,
                actingOfficerLabel: actingLabel,
                isActingOfficerPresentConfirmed: updatedConfirmed,
                reason: updatedReason,
              },
            };
          }
          return row;
        })
      );

      setLocalPendingRequests((prev) =>
        prev.map((r) => {
          if (r.id === targetLeaveId) {
            return {
              ...r,
              type: updatedType,
              typeLabel: LEAVE_TYPE_LABELS[updatedType] || updatedType,
              startDate: updatedStart,
              endDate: updatedEnd,
              actingOfficerId: updatedActingId,
              actingOfficerName: actingOfficer?.fullName,
              actingOfficerLabel: actingLabel,
              isActingOfficerPresentConfirmed: updatedConfirmed,
              reason: updatedReason,
            };
          }
          return r;
        })
      );

      setEditPendingModal(null);
      router.refresh();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "حدث خطأ في الاتصال", "error");
    } finally {
      setIsEditingPending(false);
    }
  };

  // Quick Open Request Modal for an Officer
  const handleOpenRequestModal = (officerId: string) => {
    setSelectedOfficerForRequest(officerId);
    setRequestModalOpen(true);
  };

  // Shared Officer Columns Format (Match Officers Table)
  const renderRank = (_: unknown, row: OfficerLeaveStatusRow) => (
    <span className="text-xs font-bold text-(--app-muted-foreground)">
      {row.rankLabel || row.rank}
    </span>
  );

  const renderName = (_: unknown, row: OfficerLeaveStatusRow) => (
    <button
      type="button"
      onClick={() =>
        setHistoryModalOfficer({
          officerId: row.officerId,
          fullName: row.fullName,
          rankLabel: row.rankLabel,
          militaryId: row.militaryId,
          seniorityNumber: row.seniorityNumber,
        })
      }
      className="text-xs font-black text-(--color-primary) hover:underline hover:text-(--app-info) cursor-pointer transition-colors text-right"
      title="عرض سجل إجازات الضابط"
    >
      {row.fullName}
    </button>
  );

  const renderSystemBadge = (_: unknown, row: OfficerLeaveStatusRow) => {
    const sys = row.defaultLeaveSystem as LeaveType;
    const hasSystem = Boolean(row.defaultLeaveSystem);

    if (!hasSystem) {
      if (canEdit || isAdmin) {
        return (
          <button
            type="button"
            onClick={() =>
              setSystemModalOfficer({
                officerId: row.officerId,
                officerName: row.fullName,
                officerRank: row.rankLabel,
                officerLabel: row.officerLabel,
                militaryId: row.militaryId,
                seniorityNumber: row.seniorityNumber,
                currentSystem: "",
              })
            }
            className="inline-flex items-center justify-center w-7 h-7 rounded-lg border border-dashed border-(--app-border) text-(--app-muted-foreground) hover:bg-(--app-surface-container) hover:border-(--app-muted-foreground) cursor-pointer transition-all group"
            title="تحديد نظام الإجازة"
          >
            <Plus className="w-4 h-4 group-hover:scale-110 transition-transform" />
          </button>
        );
      }
      return <span className="text-xs font-bold text-(--app-muted-foreground)/40">ـ</span>;
    }

    if (canEdit || isAdmin) {
      return (
        <button
          type="button"
          onClick={() =>
            setSystemModalOfficer({
              officerId: row.officerId,
              officerName: row.fullName,
              officerRank: row.rankLabel,
              officerLabel: row.officerLabel,
              militaryId: row.militaryId,
              seniorityNumber: row.seniorityNumber,
              currentSystem: row.defaultLeaveSystem,
            })
          }
          className="inline-block cursor-pointer group"
          title="اضغط لتعديل نظام الإجازة"
        >
          <Badge
            variant="outline"
            className="bg-(--app-surface-container) border-(--app-border) text-(--app-muted-foreground) group-hover:border-(--app-muted-foreground) text-xs font-bold px-2.5 py-1 transition-all"
          >
            {LEAVE_TYPE_LABELS[sys] || row.defaultLeaveSystem}
          </Badge>
        </button>
      );
    }

    return (
      <Badge
        variant="outline"
        className="bg-(--app-surface-container) border-(--app-border) text-(--app-muted-foreground) text-xs font-bold px-2.5 py-1"
      >
        {LEAVE_TYPE_LABELS[sys] || row.defaultLeaveSystem}
      </Badge>
    );
  };

  const renderSystemPlainText = (_: unknown, row: OfficerLeaveStatusRow) => {
    const sys = row.defaultLeaveSystem as LeaveType;
    if (!row.defaultLeaveSystem) {
      return <span className="text-xs font-bold text-(--app-muted-foreground)/40">ـ</span>;
    }
    return (
      <span className="text-xs font-bold text-(--app-muted-foreground)">
        {LEAVE_TYPE_LABELS[sys] || row.defaultLeaveSystem}
      </span>
    );
  };

  const renderPresenceStatus = (_: unknown, row: OfficerLeaveStatusRow) => {
    const isPresent = !row.isExternalMission && !row.activeLeave;
    if (isPresent) {
      return (
        <div className="flex items-center justify-center text-(--app-muted-foreground)" title="متواجد بالوحدة">
          <Check className="w-4 h-4 stroke-[2.5]" />
        </div>
      );
    }
    return (
      <div className="flex items-center justify-center text-(--app-error)" title={row.isExternalMission ? "مأمورية خارجية" : "في إجازة"}>
        <X className="w-4 h-4 stroke-[2.5]" />
      </div>
    );
  };

  const renderLastReturn = (_: unknown, row: OfficerLeaveStatusRow) => {
    // إذا كان غير متواجد بالوحدة: إما مأمورية أو إجازة
    if (row.isExternalMission) {
      return (
        <Badge
          variant="outline"
          className="bg-(--color-primary)/5 border-(--color-primary)/20 text-(--color-primary) text-xs font-bold px-2.5 py-1"
        >
          مأمورية
        </Badge>
      );
    }

    if (row.activeLeave) {
      return (
        <Badge
          variant="outline"
          className="bg-(--color-primary)/5 border-(--color-primary)/20 text-(--color-primary) text-xs font-bold px-2.5 py-1"
        >
          إجازة
        </Badge>
      );
    }

    const rawDate = row.lastReturnDate || row.lastCompletedLeave?.actualReturnDate || row.lastCompletedLeave?.endDate;
    if (rawDate) {
      const dayName = getDayName(rawDate);
      const dateStr = formatDateDisplay(rawDate);
      if (dateStr) {
        return (
          <div className="flex flex-col items-center justify-center leading-tight py-0.5">
            {dayName && (
              <span className="text-[11px] font-extrabold text-(--color-primary)">
                {dayName}
              </span>
            )}
            <span className="text-xs font-mono font-bold text-(--app-muted-foreground)">
              {dateStr}
            </span>
          </div>
        );
      }
    }

    if (row.lastReturnDateFormatted && row.lastReturnDateFormatted !== "لا توجد عودة مسجلة") {
      const parts = row.lastReturnDateFormatted.trim().split(" ");
      if (parts.length >= 2) {
        const day = parts[0];
        const dateVal = parts.slice(1).join(" ");
        return (
          <div className="flex flex-col items-center justify-center leading-tight py-0.5">
            <span className="text-[11px] font-extrabold text-(--color-primary)">
              {day}
            </span>
            <span className="text-xs font-mono font-bold text-(--app-muted-foreground)">
              {dateVal}
            </span>
          </div>
        );
      }
      return (
        <span className="text-xs font-bold text-(--app-muted-foreground)">
          {row.lastReturnDateFormatted}
        </span>
      );
    }

    return <span className="text-xs font-bold text-(--app-muted-foreground)/40">ـ</span>;
  };

  const renderPresenceDuration = (_: unknown, row: OfficerLeaveStatusRow) => {
    if (row.presenceDurationDays > 0) {
      return (
        <span className="inline-flex items-center gap-1 font-bold text-xs text-(--color-primary) bg-(--color-primary)/5 px-2.5 py-1 rounded-xl border border-(--color-primary)/15">
          <span className="font-mono font-black text-xs">{row.presenceDurationDays}</span>
          <span className="text-[11px] font-bold text-(--app-muted-foreground)">يوم</span>
        </span>
      );
    }
    return <span className="text-xs font-bold text-(--app-muted-foreground)/40">ـ</span>;
  };

  // ----------------------------------------------------
  // Table 1 Columns: Returning Today
  // ----------------------------------------------------
  const returningColumns: TableColumn<OfficerLeaveStatusRow>[] = [
    { header: "الرتبة", accessor: "rankLabel", cellAlign: "right", headerAlign: "right", render: renderRank },
    { header: "الأسم", accessor: "fullName", cellAlign: "right", headerAlign: "right", render: renderName },
    { header: "نظام الإجازة", accessor: "defaultLeaveSystem", cellAlign: "center", headerAlign: "center", render: renderSystemPlainText },
    {
      header: "الإجازة الحالية",
      accessor: "activeLeave",
      cellAlign: "center",
      headerAlign: "center",
      minWidth: true,
      render: (_, row) => {
        if (!row.activeLeave) return <span className="text-xs font-bold text-(--app-muted-foreground)/40">ـ</span>;
        const leaveType = row.activeLeave.type as LeaveType;
        const label = LEAVE_TYPE_LABELS[leaveType] || row.activeLeave.typeLabel || "إجازة";
        return (
          <span className="text-xs font-bold text-(--app-muted-foreground)">
            {label}
          </span>
        );
      },
    },
    {
      header: "المدة",
      headerAlign: "center",
      children: [
        {
          header: "من",
          cellAlign: "center",
          headerAlign: "center",
          minWidth: true,
          className: "whitespace-nowrap min-w-[105px]",
          headerClassName: "min-w-[105px]",
          render: (_, row) => {
            if (!row.activeLeave) return <span className="text-xs font-bold text-(--app-muted-foreground)/40">ـ</span>;
            const d = row.activeLeave.startDate;
            return (
              <div className="flex flex-col items-center justify-center leading-tight py-0.5">
                <span className="text-[11px] font-bold text-(--app-muted-foreground)">
                  {getDayName(d)}
                </span>
                <span className="text-xs font-mono font-bold text-(--app-muted-foreground)">
                  {formatDateDisplay(d)}
                </span>
              </div>
            );
          },
        },
        {
          header: "إلى",
          cellAlign: "center",
          headerAlign: "center",
          minWidth: true,
          className: "whitespace-nowrap min-w-[105px]",
          headerClassName: "min-w-[105px]",
          render: (_, row) => {
            if (!row.activeLeave) return <span className="text-xs font-bold text-(--app-muted-foreground)/40">ـ</span>;
            const d = row.activeLeave.endDate;
            return (
              <div className="flex flex-col items-center justify-center leading-tight py-0.5">
                <span className="text-[11px] font-bold text-(--app-muted-foreground)">
                  {getDayName(d)}
                </span>
                <span className="text-xs font-mono font-bold text-(--app-muted-foreground)">
                  {formatDateDisplay(d)}
                </span>
              </div>
            );
          },
        },
      ],
    },
    {
      header: "الإجمالي",
      cellAlign: "center",
      headerAlign: "center",
      minWidth: true,
      className: "whitespace-nowrap min-w-[85px]",
      headerClassName: "min-w-[85px]",
      render: (_, row) => {
        if (!row.activeLeave) return <span className="text-xs font-bold text-(--app-muted-foreground)/40">ـ</span>;
        const days = calculateTotalDays(row.activeLeave.startDate, row.activeLeave.endDate);
        return (
          <span className="inline-flex items-center gap-1 font-bold text-xs text-(--app-muted-foreground) bg-(--app-surface-container) px-2.5 py-1 rounded-xl border border-(--app-border)">
            <span className="font-mono font-black text-xs">{days}</span>
            <span className="text-[11px] font-bold text-(--app-muted-foreground)">
              {days >= 3 && days <= 10 ? "أيام" : "يوم"}
            </span>
          </span>
        );
      },
    },
    {
      header: "القائم بالأعمال",
      accessor: "activeLeave",
      cellAlign: "center",
      headerAlign: "center",
      render: (_, row) => {
        const actingId = row.activeLeave?.actingOfficerId;
        const actingFromList = actingId ? officers.find((off) => off.id === actingId) : undefined;
        const label =
          actingFromList?.officerLabel ||
          row.activeLeave?.actingOfficerLabel ||
          row.activeLeave?.actingOfficerName ||
          "ـ";
        return (
          <span className="text-xs font-bold text-(--app-muted-foreground)">
            {label}
          </span>
        );
      },
    },
    {
      header: "الإجراءات",
      cellAlign: "center",
      headerAlign: "center",
      minWidth: true,
      render: (_, row) => (
        <div className="flex items-center justify-center gap-1.5" onClick={(e) => e.stopPropagation()}>
          {(canEdit || isAdmin) && row.activeLeave && (
            <ActionButton
              icon={<CheckCircle2 className="w-4 h-4 text-(--color-primary)" />}
              color="btn-action-primary"
              title="تأكيد عودة الضابط للوحدة"
              onClick={() => handleConfirmReturn(row.activeLeave!.id)}
            />
          )}
        </div>
      ),
    },
  ];

  // ----------------------------------------------------
  // Table 1 Columns: نوع نظام الإجازات (تجربة: تلوين اسم الضابط بلون اسم اليوم وباقي العناصر بلون الاسم السابق)
  // ----------------------------------------------------
  const renderNameForLeaveSystem = (_: unknown, row: OfficerLeaveStatusRow) => (
    <button
      type="button"
      onClick={() =>
        setHistoryModalOfficer({
          officerId: row.officerId,
          fullName: row.fullName,
          rankLabel: row.rankLabel,
          militaryId: row.militaryId,
          seniorityNumber: row.seniorityNumber,
        })
      }
      className="text-xs font-black text-(--color-primary) hover:underline hover:text-(--app-info) cursor-pointer transition-colors text-right"
      title="عرض سجل إجازات الضابط"
    >
      {row.fullName}
    </button>
  );

  const renderSystemBadgeForLeaveSystem = (_: unknown, row: OfficerLeaveStatusRow) => {
    const sys = row.defaultLeaveSystem as LeaveType;
    const hasSystem = Boolean(row.defaultLeaveSystem);

    if (!hasSystem) {
      if (canEdit || isAdmin) {
        return (
          <button
            type="button"
            onClick={() =>
              setSystemModalOfficer({
                officerId: row.officerId,
                officerName: row.fullName,
                officerRank: row.rankLabel,
                officerLabel: row.officerLabel,
                militaryId: row.militaryId,
                seniorityNumber: row.seniorityNumber,
                currentSystem: "",
              })
            }
            className="inline-flex items-center justify-center w-7 h-7 rounded-lg border border-dashed border-(--app-border) text-(--app-muted-foreground) hover:bg-(--app-surface-container) hover:border-(--app-muted-foreground) cursor-pointer transition-all group"
            title="تحديد نظام الإجازة"
          >
            <Plus className="w-4 h-4 group-hover:scale-110 transition-transform" />
          </button>
        );
      }
      return <span className="text-xs font-bold text-(--app-muted-foreground)/40">ـ</span>;
    }

    if (canEdit || isAdmin) {
      return (
        <button
          type="button"
          onClick={() =>
            setSystemModalOfficer({
              officerId: row.officerId,
              officerName: row.fullName,
              officerRank: row.rankLabel,
              officerLabel: row.officerLabel,
              militaryId: row.militaryId,
              seniorityNumber: row.seniorityNumber,
              currentSystem: row.defaultLeaveSystem,
            })
          }
          className="inline-block cursor-pointer group"
          title="اضغط لتعديل نظام الإجازة"
        >
          <Badge
            variant="outline"
            className="bg-(--app-surface-container) border-(--app-border) text-(--app-muted-foreground) group-hover:border-(--app-muted-foreground) text-xs font-bold px-2.5 py-1 transition-all"
          >
            {LEAVE_TYPE_LABELS[sys] || row.defaultLeaveSystem}
          </Badge>
        </button>
      );
    }

    return (
      <Badge
        variant="outline"
        className="bg-(--app-surface-container) border-(--app-border) text-(--app-muted-foreground) text-xs font-bold px-2.5 py-1"
      >
        {LEAVE_TYPE_LABELS[sys] || row.defaultLeaveSystem}
      </Badge>
    );
  };

  const renderPresenceStatusForLeaveSystem = (_: unknown, row: OfficerLeaveStatusRow) => {
    const isPresent = !row.isExternalMission && !row.activeLeave;
    if (isPresent) {
      return (
        <div className="flex items-center justify-center text-(--app-muted-foreground)" title="متواجد بالوحدة">
          <Check className="w-4 h-4 stroke-[2.5]" />
        </div>
      );
    }
    return (
      <div className="flex items-center justify-center text-(--app-error)" title={row.isExternalMission ? "مأمورية خارجية" : "في إجازة"}>
        <X className="w-4 h-4 stroke-[2.5]" />
      </div>
    );
  };

  const renderLastReturnForLeaveSystem = (_: unknown, row: OfficerLeaveStatusRow) => {
    const rawDate = row.lastReturnDate || row.lastCompletedLeave?.actualReturnDate || row.lastCompletedLeave?.endDate;
    if (rawDate) {
      const dayName = getDayName(rawDate);
      const dateStr = formatDateDisplay(rawDate);
      if (dateStr) {
        return (
          <div className="flex flex-col items-center justify-center leading-tight py-0.5">
            {dayName && (
              <span className="text-[11px] font-bold text-(--app-muted-foreground)">
                {dayName}
              </span>
            )}
            <span className="text-xs font-mono font-bold text-(--app-muted-foreground)">
              {dateStr}
            </span>
          </div>
        );
      }
    }

    if (row.lastReturnDateFormatted && row.lastReturnDateFormatted !== "لا توجد عودة مسجلة") {
      const parts = row.lastReturnDateFormatted.trim().split(" ");
      if (parts.length >= 2) {
        const day = parts[0];
        const dateVal = parts.slice(1).join(" ");
        return (
          <div className="flex flex-col items-center justify-center leading-tight py-0.5">
            <span className="text-[11px] font-bold text-(--app-muted-foreground)">
              {day}
            </span>
            <span className="text-xs font-mono font-bold text-(--app-muted-foreground)">
              {dateVal}
            </span>
          </div>
        );
      }
      return (
        <span className="text-xs font-bold text-(--app-muted-foreground)">
          {row.lastReturnDateFormatted}
        </span>
      );
    }

    return <span className="text-xs font-bold text-(--app-muted-foreground)/40">ـ</span>;
  };

  const leaveSystemTableColumns: TableColumn<OfficerLeaveStatusRow>[] = [
    { header: "الرتبة", accessor: "rankLabel", cellAlign: "right", headerAlign: "right", render: renderRank },
    { header: "الأسم", accessor: "fullName", cellAlign: "right", headerAlign: "right", render: renderNameForLeaveSystem },
    { header: "نوع نظام الإجازة", accessor: "defaultLeaveSystem", cellAlign: "center", headerAlign: "center", render: renderSystemBadgeForLeaveSystem },
    { header: "التواجد", cellAlign: "center", headerAlign: "center", minWidth: true, render: renderPresenceStatusForLeaveSystem },
    { header: "آخر عودة", accessor: "lastReturnDateFormatted", cellAlign: "center", headerAlign: "center", render: renderLastReturnForLeaveSystem },
    ...((canEdit || isAdmin)
      ? [
          {
            header: "الإجراءات",
            cellAlign: "center" as const,
            headerAlign: "center" as const,
            minWidth: true,
            render: (_: unknown, row: OfficerLeaveStatusRow) => (
              <div className="flex items-center justify-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                {/* إضافة / تعديل نظام الإجازة */}
                <ActionButton
                  icon={<Award className="w-4 h-4 text-(--color-primary) hover:text-(--app-info)" />}
                  color="btn-action-primary"
                  title={row.defaultLeaveSystem ? "تعديل نظام الإجازة للضابط" : "تحديد نظام الإجازة للضابط"}
                  onClick={() =>
                    setSystemModalOfficer({
                      officerId: row.officerId,
                      officerName: row.fullName,
                      officerLabel: row.officerLabel,
                      officerRank: row.rankLabel,
                      militaryId: row.militaryId,
                      seniorityNumber: row.seniorityNumber,
                      currentSystem: row.defaultLeaveSystem || "",
                    })
                  }
                />
                {/* أيقونة للضابط المقدم له طلب إجازة وفي انتظار قرار القائد */}
                {row.pendingLeave && (
                  <ActionButton
                    icon={<Clock className="w-4 h-4 text-(--color-primary) animate-pulse" />}
                    color="btn-action-primary"
                    title={`طلب إجازة معلق (${LEAVE_TYPE_LABELS[row.pendingLeave.type as LeaveType] || row.pendingLeave.type}) في انتظار قرار القائد`}
                    onClick={() =>
                      setHistoryModalOfficer({
                        officerId: row.officerId,
                        fullName: row.fullName,
                        rankLabel: row.rankLabel,
                        militaryId: row.militaryId,
                        seniorityNumber: row.seniorityNumber,
                      })
                    }
                  />
                )}
                {/* استكمال إجازة مقطوعة (إذا كان لدى الضابط إجازة مقطوعة لم تستكمل) */}
                {row.interruptedLeave && !row.activeLeave && (
                  <ActionButton
                    icon={<RotateCcw className="w-4 h-4 text-(--color-primary) hover:text-(--app-info)" />}
                    color="btn-action-primary"
                    title={`استكمال إجازة مقطوعة (${LEAVE_TYPE_LABELS[row.interruptedLeave.type] || row.interruptedLeave.type})`}
                    onClick={() => {
                      const origEnd = row.interruptedLeave!.originalEndDate || row.interruptedLeave!.endDate;
                      const origTotal = calculateTotalDays(row.interruptedLeave!.startDate, origEnd);
                      const taken = calculateTotalDays(row.interruptedLeave!.startDate, row.interruptedLeave!.actualReturnDate || row.interruptedLeave!.startDate);
                      const rem = Math.max(1, origTotal - taken);

                      setResumeModalData({
                        leaveId: row.interruptedLeave!.id,
                        officerId: row.officerId,
                        officerName: row.fullName,
                        officerRank: row.rankLabel,
                        officerLabel: row.officerLabel,
                        militaryId: row.militaryId,
                        seniorityNumber: row.seniorityNumber,
                        type: row.interruptedLeave!.type,
                        typeLabel: row.interruptedLeave!.typeLabel,
                        originalStartDate: row.interruptedLeave!.startDate,
                        actualReturnDate: row.interruptedLeave!.actualReturnDate || row.interruptedLeave!.startDate,
                        originalEndDate: origEnd,
                        remainingDays: rem,
                      });
                    }}
                  />
                )}
                {/* تقديم طلب إجازة - لا يُمنع إلا إذا كان الضابط في إجازة حالية */}
                {!row.activeLeave && (
                  <ActionButton
                    icon={<Plus className="w-4 h-4 text-(--color-primary) hover:text-(--app-info)" />}
                    color="btn-action-primary"
                    title="تقديم طلب إجازة للضابط"
                    onClick={() => handleOpenRequestModal(row.officerId)}
                  />
                )}
              </div>
            ),
          },
        ]
      : []),
  ];

  // ----------------------------------------------------
  // Table 2 Columns: طلبات الإجازة المعلقة
  // ----------------------------------------------------
  const pendingRequestsTableColumns: TableColumn<OfficerLeaveStatusRow>[] = [
    { header: "الرتبة", accessor: "rankLabel", cellAlign: "right", headerAlign: "right", render: renderRank },
    { header: "الأسم", accessor: "fullName", cellAlign: "right", headerAlign: "right", render: renderName },
    { header: "نظام الإجازة", accessor: "defaultLeaveSystem", cellAlign: "center", headerAlign: "center", render: renderSystemPlainText },
    { header: "مدة التواجد", accessor: "presenceDurationDays", cellAlign: "center", headerAlign: "center", render: renderPresenceDuration },
    {
      header: "نوع طلب الإجازة",
      cellAlign: "center",
      headerAlign: "center",
      render: (_, row) => {
        if (!row.pendingLeave) return null;
        const leave = row.pendingLeave;
        const leaveTypeName = LEAVE_TYPE_LABELS[leave.type] || leave.typeLabel || "إجازة";

        return (
          <div className="flex flex-col items-center gap-1 py-0.5">
            <Badge
              variant="outline"
              className="bg-(--app-surface-container) border-(--app-border) text-(--app-muted-foreground) text-xs font-bold px-2.5 py-1 inline-flex items-center gap-1.5 shadow-2xs"
            >
              <Clock className="w-3.5 h-3.5 text-(--app-muted-foreground) shrink-0" />
              <span>طلب {leaveTypeName}</span>
            </Badge>
            {leave.commanderDecision?.notes && (
              <span className="text-[10px] text-(--app-muted-foreground) font-bold">
                توجيه القائد: {leave.commanderDecision.notes}
              </span>
            )}
            {leave.medicalReportUrl && (
              <a
                href={leave.medicalReportUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-[11px] font-bold text-(--app-muted-foreground) hover:underline cursor-pointer"
                title="عرض الشيت الطبي"
              >
                <Paperclip className="w-3 h-3" />
                <span>الشيت الطبي</span>
              </a>
            )}
          </div>
        );
      },
    },
    {
      header: "المدة المطلوبة",
      headerAlign: "center",
      children: [
        {
          header: "من",
          cellAlign: "center",
          headerAlign: "center",
          minWidth: true,
          className: "whitespace-nowrap min-w-[105px]",
          headerClassName: "min-w-[105px]",
          render: (_, row) => {
            if (!row.pendingLeave) return <span className="text-xs font-bold text-(--app-muted-foreground)/40">ـ</span>;
            const d = row.pendingLeave.startDate;
            return (
              <div className="flex flex-col items-center justify-center leading-tight py-0.5">
                <span className="text-[11px] font-bold text-(--app-muted-foreground)">
                  {getDayName(d)}
                </span>
                <span className="text-xs font-mono font-bold text-(--app-muted-foreground)">
                  {formatDateDisplay(d)}
                </span>
              </div>
            );
          },
        },
        {
          header: "إلى",
          cellAlign: "center",
          headerAlign: "center",
          minWidth: true,
          className: "whitespace-nowrap min-w-[105px]",
          headerClassName: "min-w-[105px]",
          render: (_, row) => {
            if (!row.pendingLeave) return <span className="text-xs font-bold text-(--app-muted-foreground)/40">ـ</span>;
            const d = row.pendingLeave.endDate;
            return (
              <div className="flex flex-col items-center justify-center leading-tight py-0.5">
                <span className="text-[11px] font-bold text-(--app-muted-foreground)">
                  {getDayName(d)}
                </span>
                <span className="text-xs font-mono font-bold text-(--app-muted-foreground)">
                  {formatDateDisplay(d)}
                </span>
              </div>
            );
          },
        },
      ],
    },
    {
      header: "الإجمالي",
      cellAlign: "center",
      headerAlign: "center",
      minWidth: true,
      className: "whitespace-nowrap min-w-[85px]",
      headerClassName: "min-w-[85px]",
      render: (_, row) => {
        if (!row.pendingLeave) return <span className="text-xs font-bold text-(--app-muted-foreground)/40">ـ</span>;
        const days = calculateTotalDays(row.pendingLeave.startDate, row.pendingLeave.endDate);
        return (
          <span className="inline-flex items-center gap-1 font-bold text-xs text-(--app-muted-foreground) bg-(--app-surface-container) px-2.5 py-1 rounded-xl border border-(--app-border)">
            <span className="font-mono font-bold text-xs">{days}</span>
            <span className="text-[11px] font-bold text-(--app-muted-foreground)">
              {days >= 3 && days <= 10 ? "أيام" : "يوم"}
            </span>
          </span>
        );
      },
    },
    {
      header: "الإجراءات",
      cellAlign: "center",
      headerAlign: "center",
      minWidth: true,
      render: (_, row) => {
        if (!row.pendingLeave) return null;
        const pending = row.pendingLeave;
        const isViewed = Boolean(pending.viewedByCommander);

        // Commander buttons: تصدق and لم يتصدق (Commander or Admin)
        const showCommanderDecision = isCommander || isAdmin;

        // View button (eye): Everyone (Commander, Arkan Harb, Admin)
        const showView = true;

        // Arkan Harb edit/delete: only if not viewed by Commander; Admin always sees them
        const showEdit = isAdmin || (!isCommander && canEdit && !isViewed);
        const showDelete = isAdmin || (!isCommander && canEdit && !isViewed);

        return (
          <div className="flex items-center justify-center gap-1.5" onClick={(e) => e.stopPropagation()}>
            {/* 1. تصدق (Approve) */}
            {showCommanderDecision && (
              <ActionButton
                icon={<CheckCircle2 className="w-4 h-4 text-(--color-primary)" />}
                color="btn-action-primary"
                title="تصدق (اعتماد الإجازة)"
                onClick={() =>
                  setDecisionModal({
                    isOpen: true,
                    leaveId: pending.id,
                    officerName: row.fullName,
                    officerLabel: row.officerLabel,
                    actionType: "approve",
                    initialStartDate: pending.startDate,
                    initialEndDate: pending.endDate,
                  })
                }
              />
            )}

            {/* 2. لم يتصدق (Reject) */}
            {showCommanderDecision && (
              <ActionButton
                icon={<XCircle className="w-4 h-4 text-(--color-primary)" />}
                color="btn-action-primary"
                title="لم يتصدق (رفض الطلب)"
                onClick={() =>
                  setDecisionModal({
                    isOpen: true,
                    leaveId: pending.id,
                    officerName: row.fullName,
                    officerLabel: row.officerLabel,
                    actionType: "reject",
                    initialStartDate: pending.startDate,
                    initialEndDate: pending.endDate,
                  })
                }
              />
            )}

            {/* 3. عرض الطلب (Eye Icon) */}
            {showView && (
              <ActionButton
                icon={<Eye className="w-4 h-4 text-(--color-primary)" />}
                color="btn-action-primary"
                title="عرض تفاصيل الطلب"
                onClick={() => openCarousel(pending.id)}
              />
            )}

            {/* 4. تعديل الطلب (Edit3) */}
            {showEdit && (
              <ActionButton
                icon={<Edit3 className="w-4 h-4 text-(--color-primary)" />}
                color="btn-action-primary"
                title="تعديل طلب الإجازة"
                onClick={() =>
                  setEditPendingModal({
                    isOpen: true,
                    leaveId: pending.id,
                    officerId: row.officerId,
                    officerName: row.fullName,
                    officerLabel: row.officerLabel,
                    type: pending.type,
                    startDate: pending.startDate ? pending.startDate.split("T")[0] : "",
                    endDate: pending.endDate ? pending.endDate.split("T")[0] : "",
                    actingOfficerId: pending.actingOfficerId || "",
                    isActingOfficerPresentConfirmed: Boolean(pending.isActingOfficerPresentConfirmed),
                    reason: pending.reason || "",
                  })
                }
              />
            )}

            {/* 5. حذف / إلغاء الطلب (Trash2) */}
            {showDelete && (
              <ActionButton
                icon={<Trash2 className="w-4 h-4 text-(--color-primary)" />}
                color="btn-action-primary"
                title="إلغاء وحذف طلب الإجازة"
                onClick={() =>
                  setCancelModal({
                    leaveId: pending.id,
                    officerName: row.fullName,
                  })
                }
              />
            )}
          </div>
        );
      },
    },
  ];

  // ----------------------------------------------------
  // ----------------------------------------------------
  // Table 3 Columns: On Leave (الضباط في الإجازة)
  // ----------------------------------------------------
  const onLeaveColumns: TableColumn<OfficerLeaveStatusRow>[] = useMemo(() => {
    return [
      { header: "الرتبة", accessor: "rankLabel", cellAlign: "right", headerAlign: "right", render: renderRank },
      { header: "الأسم", accessor: "fullName", cellAlign: "right", headerAlign: "right", render: renderName },
      { header: "نظام الإجازة", accessor: "defaultLeaveSystem", cellAlign: "center", headerAlign: "center", render: renderSystemPlainText },
      {
        header: "الإجازة الحالية",
        accessor: "activeLeave",
        cellAlign: "center",
        headerAlign: "center",
        minWidth: true,
        render: (_, row) => {
          if (!row.activeLeave) return <span className="text-xs font-bold text-(--app-muted-foreground)/40">ـ</span>;
          const leaveType = row.activeLeave.type as LeaveType;
          const label = LEAVE_TYPE_LABELS[leaveType] || row.activeLeave.typeLabel || "إجازة";
          return (
            <span className="text-xs font-bold text-(--app-muted-foreground)">
              {label}
            </span>
          );
        },
      },
      {
        header: "المدة",
        headerAlign: "center",
        children: [
          {
            header: "من",
            cellAlign: "center",
            headerAlign: "center",
            minWidth: true,
            className: "whitespace-nowrap min-w-[105px]",
            headerClassName: "min-w-[105px]",
            render: (_, row) => {
              if (!row.activeLeave) return <span className="text-xs font-bold text-(--app-muted-foreground)/40">ـ</span>;
              const d = row.activeLeave.startDate;
              return (
                <div className="flex flex-col items-center justify-center leading-tight py-0.5">
                  <span className="text-[11px] font-bold text-(--app-muted-foreground)">
                    {getDayName(d)}
                  </span>
                  <span className="text-xs font-mono font-bold text-(--app-muted-foreground)">
                    {formatDateDisplay(d)}
                  </span>
                </div>
              );
            },
          },
          {
            header: "إلى",
            cellAlign: "center",
            headerAlign: "center",
            minWidth: true,
            className: "whitespace-nowrap min-w-[105px]",
            headerClassName: "min-w-[105px]",
            render: (_, row) => {
              if (!row.activeLeave) return <span className="text-xs font-bold text-(--app-muted-foreground)/40">ـ</span>;
              const d = row.activeLeave.endDate;
              return (
                <div className="flex flex-col items-center justify-center leading-tight py-0.5">
                  <span className="text-[11px] font-bold text-(--app-muted-foreground)">
                    {getDayName(d)}
                  </span>
                  <span className="text-xs font-mono font-bold text-(--app-muted-foreground)">
                    {formatDateDisplay(d)}
                  </span>
                </div>
              );
            },
          },
        ],
      },
      {
        header: "الإجمالي",
        cellAlign: "center",
        headerAlign: "center",
        minWidth: true,
        className: "whitespace-nowrap min-w-[85px]",
        headerClassName: "min-w-[85px]",
        render: (_, row) => {
          if (!row.activeLeave) return <span className="text-xs font-bold text-(--app-muted-foreground)/40">ـ</span>;
          const days = calculateTotalDays(row.activeLeave.startDate, row.activeLeave.endDate);
          return (
            <span className="inline-flex items-center gap-1 font-bold text-xs text-(--app-muted-foreground) bg-(--app-surface-container) px-2.5 py-1 rounded-xl border border-(--app-border)">
              <span className="font-mono font-black text-xs">{days}</span>
              <span className="text-[11px] font-bold text-(--app-muted-foreground)">
                {days >= 3 && days <= 10 ? "أيام" : "يوم"}
              </span>
            </span>
          );
        },
      },
      {
        header: "القائم بالأعمال",
        accessor: "activeLeave",
        cellAlign: "center",
        headerAlign: "center",
        render: (_, row) => {
          const actingId = row.activeLeave?.actingOfficerId;
          const actingFromList = actingId ? officers.find((off) => off.id === actingId) : undefined;
          const label =
            actingFromList?.officerLabel ||
            row.activeLeave?.actingOfficerLabel ||
            row.activeLeave?.actingOfficerName ||
            "ـ";
          return (
            <div className="flex flex-col items-center text-xs font-bold text-(--app-muted-foreground)">
              <span>{label}</span>
              {row.activeLeave?.medicalReportUrl && (
                <a
                  href={row.activeLeave.medicalReportUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 mt-1 text-[11px] font-bold text-(--color-primary) hover:underline cursor-pointer"
                  title="عرض الشيت الطبي"
                >
                  <Paperclip className="w-3 h-3" />
                  <span>الشيت الطبي</span>
                </a>
              )}
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
          <div className="flex items-center justify-center gap-1.5" onClick={(e) => e.stopPropagation()}>
            {(canEdit || isAdmin) && row.activeLeave && (
              <>
                <ActionButton
                  icon={<Clock className="w-4 h-4 text-(--color-primary)" />}
                  color="btn-action-primary"
                  title="تمديد الإجازة"
                  onClick={() =>
                    setExtendModal({
                      isOpen: true,
                      leaveId: row.activeLeave!.id,
                      officerName: row.fullName,
                      officerLabel: row.officerLabel,
                      currentEndDate: row.activeLeave!.endDate,
                    })
                  }
                />
                <ActionButton
                  icon={<Scissors className="w-4 h-4 text-(--color-primary)" />}
                  color="btn-action-primary"
                  title="تسجيل عودة مبكرة (قطع الإجازة)"
                  onClick={() => {
                    setInterruptLeave({ id: row.activeLeave!.id, officerName: row.fullName });
                    setActualReturnDate(new Date().toISOString().split("T")[0]);
                    setInterruptReason("");
                  }}
                />
              </>
            )}
          </div>
        ),
      },
    ];
  }, [canEdit, isAdmin]);

  return (
    <div className="space-y-8">
      {/* Commander & Admin Bulk Approval Banner */}
      {(isCommander || isAdmin) && pendingRequests.length > 0 && (
        <SectionWrapper className="bg-(--color-primary)/5 border border-(--color-primary)/20">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-1">
            <div className="flex items-center gap-3 text-right">
              <div className="p-2.5 bg-(--color-primary)/10 rounded-xl text-(--color-primary)">
                <AlertCircle className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-black text-(--color-primary)">
                  {isCommander
                    ? `يوجد (${pendingRequests.length}) طلب إجازة / امتداد في انتظار تصديق سيادتكم`
                    : `يوجد (${pendingRequests.length}) طلب إجازة / امتداد في انتظار التصديق`}
                </h4>
                <p className="text-xs font-bold text-(--app-muted-foreground)">
                  يمكنكم مراجعة الطلبات فردياً في الجداول أو التصديق على الجميع دفعة واحدة.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => openCarousel()}
                className="btn-secondary text-xs flex items-center gap-2"
              >
                <Eye className="w-4 h-4" />
                <span>عرض طلبات الإجازة</span>
              </button>
              <button
                type="button"
                onClick={handleApproveAll}
                disabled={isApprovingAll}
                className="btn-primary text-xs flex items-center gap-2"
              >
                <CheckCheck className="w-4 h-4" />
                <span>{isApprovingAll ? "جاري التصديق..." : "تصدق للكل"}</span>
              </button>
            </div>
          </div>
        </SectionWrapper>
      )}

      {/* ---------------------------------------------------- */}
      {/* 1. TABLE: طلبات الإجازة (يظهر أولاً في حالة وجود طلب إجازة) */}
      {/* ---------------------------------------------------- */}
      {pendingLeaveOfficers.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-(--app-surface-container) border border-(--app-border) rounded-lg">
                <Clock className="h-5 w-5 text-(--color-primary)" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-(--color-primary) flex items-center gap-2">
                  <span>طلبات الإجازة</span>
                  <span className="text-xs px-2.5 py-0.5 rounded-full bg-(--app-surface-container) border border-(--app-border) text-(--app-muted-foreground) font-bold">
                    {pendingLeaveOfficers.length} معلق
                  </span>
                </h2>
              </div>
            </div>
          </div>

          <SectionWrapper noPadding className="overflow-hidden rounded-2xl">
            <MainTable<OfficerLeaveStatusRow>
              columns={pendingRequestsTableColumns}
              data={pendingLeaveOfficers}
              showSerialNumber={true}
              emptyTitle="لا توجد طلبات إجازة معلقة"
            />
          </SectionWrapper>
        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* 2. TABLE: عودة من الإجازة اليوم (إن وجد) */}
      {/* ---------------------------------------------------- */}
      {returningTodayOfficers.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-(--app-surface-container) border border-(--app-border) rounded-lg">
                <CheckCircle className="h-5 w-5 text-(--color-primary)" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-(--color-primary) flex items-center gap-2">
                  <span>عودة من الإجازة اليوم</span>
                  <span className="text-xs px-2.5 py-0.5 rounded-full bg-(--app-surface-container) border border-(--app-border) text-(--app-muted-foreground) font-bold">
                    {returningTodayOfficers.length} ضابط
                  </span>
                </h2>
              </div>
            </div>
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
      {/* 3. TABLE: الضباط في الإجازة (جدول عودة الإجازات / الإجازات السارية) */}
      {/* ---------------------------------------------------- */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-(--app-surface-container) border border-(--app-border) rounded-lg">
              <Calendar className="h-5 w-5 text-(--color-primary)" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-(--color-primary) flex items-center gap-2">
                <span>الضباط في الإجازة</span>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-(--app-surface-container) border border-(--app-border) text-(--app-muted-foreground) font-bold">
                  {onLeaveOfficers.length} ضابط
                </span>
              </h2>
            </div>
          </div>
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
      {/* 4. TABLE: نوع نظام الإجازات (جدول كامل الضباط) */}
      {/* ---------------------------------------------------- */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-(--app-surface-container) border border-(--app-border) rounded-lg">
              <Award className="h-5 w-5 text-(--color-primary)" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-(--color-primary) flex items-center gap-2">
                <span>نوع نظام الإجازات</span>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-(--app-surface-container) border border-(--app-border) text-(--app-muted-foreground) font-bold">
                  {localRows.length} ضابط
                </span>
              </h2>
            </div>
          </div>
        </div>

        <SectionWrapper noPadding className="overflow-hidden rounded-2xl">
          <MainTable<OfficerLeaveStatusRow>
            columns={leaveSystemTableColumns}
            data={localRows}
            showSerialNumber={true}
            emptyTitle="لا يوجد ضباط مسجلين"
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

      {/* Leave Resume Modal (استكمال إجازة مقطوعة) */}
      {resumeModalData && (
        <LeaveResumeModal
          key={resumeModalData.leaveId}
          isOpen={Boolean(resumeModalData)}
          onClose={() => setResumeModalData(null)}
          leaveInfo={resumeModalData}
          officers={officers}
          onSuccess={() => {
            router.refresh();
          }}
        />
      )}

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
          onSuccess={handleCommanderSuccess}
        />
      )}

      {/* Leave Extension Modal */}
      {extendModal && extendModal.isOpen && (
        <LeaveExtendModal
          leaveId={extendModal.leaveId}
          officerName={extendModal.officerName}
          officerLabel={extendModal.officerLabel}
          currentEndDate={extendModal.currentEndDate}
          isOpen={extendModal.isOpen}
          onClose={() => setExtendModal(null)}
          onSuccess={(newEndDate) => handleExtendSuccess(extendModal.leaveId, newEndDate)}
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
            <div className="p-3 bg-(--color-primary)/5 border border-(--color-primary)/20 rounded-xl text-xs text-(--color-primary) font-medium">
              سيتم تعديل حالة إجازة الضابط (<strong>{interruptLeave.officerName}</strong>) إلى &quot;مقطوعة&quot; وتحديث تمامه تلقائياً كـ &quot;حاضر&quot; من تاريخ العودة الفعلي.
            </div>

            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-(--app-muted-foreground)">تاريخ العودة الفعلي (تاريخ القطع)</span>
                {actualReturnDate && (
                  <span className="text-[11px] font-black text-(--color-primary)">
                    يوم {getDayName(actualReturnDate)}
                  </span>
                )}
              </div>
              <DateField
                id="actualReturnDate"
                label=""
                value={actualReturnDate}
                onChange={setActualReturnDate}
                required
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="interruptReason" className="text-xs font-bold text-(--app-muted-foreground) block mr-1">
                سبب قطع الإجازة (اختياري)
              </label>
              <input
                id="interruptReason"
                type="text"
                value={interruptReason}
                onChange={(e) => setInterruptReason(e.target.value)}
                placeholder="أدخل سبب قطع الإجازة إن وجد..."
                className="w-full px-3 py-2 bg-(--app-surface) border border-(--app-border) rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:ring-blue-500/20 focus:border-blue-500 transition-all text-right"
              />
            </div>
          </form>
        </ModalShell>
      )}

      {/* Cancel Leave Request Modal (إلغاء وسحب طلب الإجازة قبل اطلاع القائد) */}
      {cancelModal && (
        <ModalShell
          title="إلغاء وسحب طلب الإجازة"
          titleVariant="danger"
          icon={<Trash2 className="w-4 h-4" />}
          onClose={() => {
            setCancelModal(null);
            setCancelReason("");
          }}
          overlayClassName="bg-black/40"
          panelClassName="max-h-[85vh] max-w-md border-(--app-border) shadow-depth-xl"
          bodyClassName="p-6 space-y-4"
          footer={
            <ModalActions
              submitText={isCancelling ? "جاري الإلغاء..." : "تأكيد إلغاء الطلب"}
              submitVariant="destructive"
              submitLoading={isCancelling}
              onCancel={() => {
                setCancelModal(null);
                setCancelReason("");
              }}
              form="cancel-leave-form"
            />
          }
        >
          <form id="cancel-leave-form" onSubmit={handleCancelSubmit} className="space-y-4 text-right">
            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-xs text-red-900 font-medium">
              هل أنت متأكد من إلغاء وسحب طلب إجازة الضابط (<strong>{cancelModal.officerName}</strong>)؟ لن يظهر هذا الطلب للسيد القائد بعد الإلغاء.
            </div>

            <div className="space-y-1.5">
              <label htmlFor="cancelReason" className="text-xs font-bold text-(--app-muted-foreground) block mr-1">
                سبب الإلغاء (اختياري)
              </label>
              <input
                id="cancelReason"
                type="text"
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="أدخل سبب إلغاء وسحب الطلب..."
                className="w-full px-3 py-2 bg-(--app-surface) border border-(--app-border) rounded-xl text-sm font-bold text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-blue-500/20 focus:border-blue-500 transition-all text-right"
              />
            </div>
          </form>
        </ModalShell>
      )}

      {/* Edit Pending Leave Modal (تعديل طلب الإجازة) */}
      {editPendingModal && (
        <ModalShell
          title="تعديل طلب إجازة"
          icon={<Edit3 className="w-4 h-4 text-(--color-primary)" />}
          onClose={() => setEditPendingModal(null)}
          overlayClassName="bg-black/40"
          panelClassName="max-w-xl border-(--app-border) shadow-depth-xl"
          bodyClassName="p-6 space-y-4 text-right no-scrollbar"
          footer={
            <ModalActions
              submitText={isEditingPending ? "جاري الحفظ..." : "حفظ التعديلات"}
              submitLoading={isEditingPending}
              onCancel={() => setEditPendingModal(null)}
              form="edit-pending-leave-form"
            />
          }
        >
          <form id="edit-pending-leave-form" onSubmit={handleEditPendingSubmit} className="space-y-4">
            {/* Officer Summary Card */}
            <div className="p-3.5 rounded-xl bg-(--app-surface-container-low) border border-(--app-border) flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-(--color-primary)/10 border border-(--color-primary)/20 flex items-center justify-center text-(--color-primary)">
                  <User className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-black text-(--color-primary)">
                    {editPendingModal.officerLabel || editPendingModal.officerName}
                  </h4>
                  <span className="text-[11px] text-(--app-muted-foreground) font-bold">
                    تعديل بيانات طلب الإجازة المقدم
                  </span>
                </div>
              </div>
            </div>

            {/* Leave Type Select */}
            <div className="space-y-1.5">
              <CustomSelect
                id="edit-leave-type"
                label="نوع الإجازة"
                value={editPendingModal.type}
                onChange={(val) =>
                  setEditPendingModal((prev) => (prev ? { ...prev, type: val as LeaveType } : null))
                }
                options={LEAVE_REQUEST_TYPES.map((t) => ({
                  value: t,
                  label: LEAVE_TYPE_LABELS[t as LeaveType] || t,
                }))}
                required
              />
            </div>

            {/* Dates: From & To */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <DateField
                id="edit-start-date"
                label="تاريخ البداية (من)"
                value={editPendingModal.startDate}
                onChange={(val) =>
                  setEditPendingModal((prev) => (prev ? { ...prev, startDate: val } : null))
                }
                required
              />
              <DateField
                id="edit-end-date"
                label="تاريخ النهاية (إلى)"
                value={editPendingModal.endDate}
                onChange={(val) =>
                  setEditPendingModal((prev) => (prev ? { ...prev, endDate: val } : null))
                }
                required
              />
            </div>

            {/* Duration Display */}
            {editPendingModal.startDate && editPendingModal.endDate && (
              <div className="p-2.5 rounded-xl bg-(--app-surface-container) border border-(--app-border) flex items-center justify-between text-xs font-bold">
                <span className="text-(--app-muted-foreground)">إجمالي عدد الأيام:</span>
                <span className="font-mono text-(--color-primary) font-black">
                  {formatDaysDisplay(calculateTotalDays(editPendingModal.startDate, editPendingModal.endDate))}
                </span>
              </div>
            )}

            {/* Acting Officer Select */}
            <div className="space-y-1.5">
              <CustomSelect
                id="edit-acting-officer"
                label="الضابط البديل (القائم بالعمل)"
                value={editPendingModal.actingOfficerId || ""}
                onChange={(val) =>
                  setEditPendingModal((prev) =>
                    prev
                      ? {
                          ...prev,
                          actingOfficerId: val,
                          isActingOfficerPresentConfirmed: val ? prev.isActingOfficerPresentConfirmed : false,
                        }
                      : null
                  )
                }
                options={[
                  { value: "", label: "بدون ضابط بديل" },
                  ...officers
                    .filter((o) => o.id !== editPendingModal.officerId && o.isInUnit !== false)
                    .map((o) => ({
                      value: o.id,
                      label: o.officerLabel || `${o.rank} / ${o.fullName}`,
                      description: o.militaryId ? `الرقم العسكري: ${o.militaryId}` : undefined,
                    })),
                ]}
                placeholder="اختر الضابط البديل..."
              />
            </div>

            {/* Checkbox for acting officer present */}
            {editPendingModal.actingOfficerId && (
              <label className="flex items-center gap-2 cursor-pointer p-2.5 rounded-xl bg-(--app-surface-container) border border-(--app-border)">
                <input
                  type="checkbox"
                  checked={Boolean(editPendingModal.isActingOfficerPresentConfirmed)}
                  onChange={(e) =>
                    setEditPendingModal((prev) =>
                      prev ? { ...prev, isActingOfficerPresentConfirmed: e.target.checked } : null
                    )
                  }
                  className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500/20 border-(--app-border)"
                />
                <span className="text-xs font-bold text-(--app-foreground)">
                  تأكيد تواجد الضابط البديل بالوحدة وجاهزيته للقيام بالعمل
                </span>
              </label>
            )}

            {/* Reason / Notes */}
            <div className="space-y-1.5">
              <label htmlFor="edit-leave-reason" className="text-xs font-bold text-(--app-muted-foreground) block mr-1">
                سبب / ملاحظات الطلب (اختياري)
              </label>
              <textarea
                id="edit-leave-reason"
                rows={2}
                value={editPendingModal.reason || ""}
                onChange={(e) =>
                  setEditPendingModal((prev) => (prev ? { ...prev, reason: e.target.value } : null))
                }
                placeholder="أدخل أي ملاحظات إضافية..."
                className="w-full px-3 py-2 bg-(--app-surface) border border-(--app-border) rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:ring-blue-500/20 focus:border-blue-500 transition-all text-right resize-none"
              />
            </div>
          </form>
        </ModalShell>
      )}

      {/* Leave System Modal */}
      {systemModalOfficer && (
        <LeaveSystemModal
          isOpen={Boolean(systemModalOfficer)}
          onClose={() => setSystemModalOfficer(null)}
          officer={systemModalOfficer}
        />
      )}

      {/* Officer Leave History Modal */}
      {historyModalOfficer && (
        <OfficerLeaveHistoryModal
          isOpen={Boolean(historyModalOfficer)}
          onClose={() => setHistoryModalOfficer(null)}
          officer={historyModalOfficer}
        />
      )}

      {/* Bulk Approve Confirmation Modal (بديل للرسالة العادية) */}
      {bulkApproveModalOpen && (
        <ModalShell
          title="التصديق الجماعي على طلبات الإجازات"
          icon={<CheckCheck className="w-5 h-5 text-(--color-primary)" />}
          onClose={() => setBulkApproveModalOpen(false)}
          overlayClassName="bg-black/40"
          panelClassName="max-h-[85vh] max-w-2xl border-(--app-border) shadow-depth-xl"
          bodyClassName="p-5 space-y-4 overflow-y-auto no-scrollbar"
          footer={
            <ModalActions
              submitText={isApprovingAll ? "جاري التصديق..." : "تأكيد التصديق على الجميع"}
              submitVariant="primary"
              submitLoading={isApprovingAll}
              onCancel={() => setBulkApproveModalOpen(false)}
              onConfirm={handleConfirmBulkApprove}
            />
          }
        >
          <div className="space-y-4 text-right">
            <div className="p-3 bg-(--color-primary)/5 border border-(--color-primary)/15 rounded-xl text-xs text-(--color-primary) font-bold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-(--color-primary)" />
              <span>
                سيتم التصديق المباشر على طلبات الإجازات الآتية (إجمالي {localPendingRequests.length} طلب) ونقلهم لحالة معتمد وتحديث التمام فوراً:
              </span>
            </div>

            <div className="border border-(--app-border) rounded-xl overflow-hidden">
              <table className="w-full text-right text-xs">
                <thead className="bg-(--color-primary) text-white font-bold">
                  <tr>
                    <th className="py-2.5 px-3">م</th>
                    <th className="py-2.5 px-3">الضابط</th>
                    <th className="py-2.5 px-3">نوع الطلب</th>
                    <th className="py-2.5 px-3 text-center">من</th>
                    <th className="py-2.5 px-3 text-center">إلى</th>
                    <th className="py-2.5 px-3 text-center">الإجمالي</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-(--app-border)/40 font-bold text-(--app-muted-foreground)">
                  {localPendingRequests.map((req, idx) => {
                    const days = calculateTotalDays(req.startDate, req.endDate);
                    return (
                      <tr key={req.id} className="hover:bg-(--app-surface-container)/60 transition-colors">
                        <td className="py-2 px-3 font-mono text-[11px]">{idx + 1}</td>
                        <td className="py-2 px-3 text-(--color-primary)">
                          {req.officerLabel || req.officerName}
                        </td>
                        <td className="py-2 px-3">
                          {LEAVE_TYPE_LABELS[req.type] || req.typeLabel || "إجازة"}
                        </td>
                        <td className="py-2 px-3 text-center">
                          <div className="flex flex-col items-center">
                            <span className="text-[10px] text-(--color-primary)">{getDayName(req.startDate)}</span>
                            <span className="font-mono text-[11px]">{formatDateDisplay(req.startDate)}</span>
                          </div>
                        </td>
                        <td className="py-2 px-3 text-center">
                          <div className="flex flex-col items-center">
                            <span className="text-[10px] text-(--color-primary)">{getDayName(req.endDate)}</span>
                            <span className="font-mono text-[11px]">{formatDateDisplay(req.endDate)}</span>
                          </div>
                        </td>
                        <td className="py-2 px-3 text-center">
                          <span className="inline-flex items-center gap-1 font-bold text-xs text-(--color-primary) bg-(--color-primary)/5 px-2 py-0.5 rounded-lg border border-(--color-primary)/15">
                            <span className="font-mono font-black">{days}</span>
                            <span className="text-[10px] font-bold text-(--app-muted-foreground)">
                              {days >= 3 && days <= 10 ? "أيام" : "يوم"}
                            </span>
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </ModalShell>
      )}

      {/* 8. Carousel Review Modal for Commander */}
      {carouselOpen && carouselItems.length > 0 && (
        <ModalShell
          title="استعراض وتصديق طلبات الإجازة"
          icon={<ClipboardList className="w-4 h-4 text-(--color-primary)" />}
          onClose={() => setCarouselOpen(false)}
          overlayClassName="bg-black/40"
          panelClassName="max-w-2xl border-(--app-border) shadow-depth-xl overflow-hidden"
          bodyClassName="p-6 space-y-5 text-right no-scrollbar overflow-x-hidden"
          footer={
            carouselItems.length === 1 ? (
              <ModalActions mode="view" onCancel={() => setCarouselOpen(false)} />
            ) : (
              <div className="flex items-center justify-between w-full gap-3">
                {/* Right side in RTL: التالي (Next) */}
                <div className="flex items-center">
                  {carouselIndex < carouselItems.length - 1 ? (
                    <button
                      type="button"
                      disabled={isCarouselSubmitting}
                      onClick={() => {
                        setSlideDirection("next");
                        setCarouselIndex((prev) => Math.min(carouselItems.length - 1, prev + 1));
                      }}
                      className="btn-secondary text-xs flex items-center gap-1.5 cursor-pointer"
                    >
                      <ChevronRight className="w-4 h-4" />
                      <span>التالي</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setCarouselOpen(false)}
                      className="btn-secondary text-xs flex items-center gap-1.5 cursor-pointer"
                    >
                      <span>إغلاق</span>
                    </button>
                  )}
                </div>

                {/* Center in RTL: Stepper dots and "تصدق للكل" if applicable */}
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1.5">
                    {carouselItems.map((it, idx) => (
                      <button
                        key={it.leaveId}
                        type="button"
                        onClick={() => {
                          if (idx !== carouselIndex) {
                            setSlideDirection(idx > carouselIndex ? "next" : "prev");
                            setCarouselIndex(idx);
                          }
                        }}
                        className={`h-2 rounded-full transition-all cursor-pointer ${
                          idx === carouselIndex
                            ? "w-6 bg-(--color-primary)"
                            : it.decision === "approved"
                            ? "w-2 bg-blue-500/60"
                            : it.decision === "rejected"
                            ? "w-2 bg-red-500/60"
                            : "w-2 bg-(--app-border)"
                        }`}
                        title={`الطلب ${idx + 1}`}
                      />
                    ))}
                  </div>
                </div>

                {/* Left side in RTL: السابق (Previous) */}
                <div className="flex items-center">
                  <button
                    type="button"
                    disabled={carouselIndex === 0 || isCarouselSubmitting}
                    onClick={() => {
                      setSlideDirection("prev");
                      setCarouselIndex((prev) => Math.max(0, prev - 1));
                    }}
                    className="btn-secondary text-xs flex items-center gap-1.5 disabled:opacity-40 cursor-pointer"
                  >
                    <span>السابق</span>
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )
          }
        >
          {(() => {
            const current = carouselItems[carouselIndex];
            if (!current) return null;
            const days = calculateTotalDays(current.startDate, current.endDate);

            return (
              <div
                key={current.leaveId}
                className={`space-y-4 ${
                  carouselItems.length > 1
                    ? slideDirection === "next"
                      ? "animate-carousel-next"
                      : "animate-carousel-prev"
                    : ""
                }`}
              >
                {/* Stepper info badge */}
                {(carouselItems.length > 1 || current.decision) && (
                  <div className="flex items-center justify-between pb-2 border-b border-(--app-border)/40">
                    {carouselItems.length > 1 ? (
                      <span className="px-3 py-1 rounded-full text-xs font-black bg-(--color-primary)/10 text-(--color-primary) border border-(--color-primary)/20">
                        طلب إجازة ({carouselIndex + 1} من {carouselItems.length})
                      </span>
                    ) : (
                      <span />
                    )}

                    {current.decision ? (
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-black flex items-center gap-1.5 ${
                          current.decision === "approved"
                            ? "bg-blue-500/10 text-blue-600 border border-blue-500/20"
                            : "bg-red-500/10 text-red-600 border border-red-500/20"
                        }`}
                      >
                        {current.decision === "approved" ? (
                          <>
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>تم التصديق على الطلب</span>
                          </>
                        ) : (
                          <>
                            <XCircle className="w-3.5 h-3.5" />
                            <span>لم يتصدق على الطلب</span>
                          </>
                        )}
                      </span>
                    ) : (
                      <span className="text-xs font-bold text-(--app-muted-foreground)">
                        {isCommander ? "في انتظار قرار سيادتكم" : "في انتظار قرار التصديق"}
                      </span>
                    )}
                  </div>
                )}

                {/* Officer Card with Acting Officer directly below applicant officer */}
                <div className="p-4 rounded-2xl bg-(--app-surface-container-low) border border-(--app-border) shadow-xs flex flex-col gap-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl bg-(--color-primary)/10 border border-(--color-primary)/20 flex items-center justify-center text-(--color-primary) shrink-0">
                        <User className="w-6 h-6" />
                      </div>
                      <div>
                        <h3 className="text-base font-black text-(--color-primary)">
                          {current.officerLabel || `${current.officerRankLabel || ""} / ${current.officerName}`}
                        </h3>
                        <div className="flex items-center gap-2 mt-0.5 text-xs text-(--app-muted-foreground) font-bold flex-wrap">
                          {current.militaryId && (
                            <span>الرقم العسكري: <span className="font-mono text-(--app-foreground)">{current.militaryId}</span></span>
                          )}
                          {current.seniorityNumber && (
                            <span>• رقم الأقدمية: <span className="font-mono text-(--app-foreground)">{current.seniorityNumber}</span></span>
                          )}
                        </div>
                      </div>
                    </div>

                    {current.defaultLeaveSystem && (
                      <div className="text-left shrink-0">
                        <div className="inline-flex flex-col items-center bg-(--app-surface) px-3 py-1.5 rounded-xl border border-(--app-border) shadow-xs">
                          <span className="text-[10px] font-bold text-(--app-muted-foreground)">نظام الإجازة</span>
                          <span className="text-xs font-black text-(--color-primary)">
                            {OFFICER_LEAVE_SYSTEM_LABELS[current.defaultLeaveSystem as OfficerLeaveSystem] ||
                             LEAVE_TYPE_LABELS[current.defaultLeaveSystem as LeaveType] ||
                             current.defaultLeaveSystem}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Acting Officer - Directly below applicant name */}
                  <div className="pt-2 mt-0.5 border-t border-(--app-border)/60 flex items-center justify-between gap-2 bg-(--app-surface) px-3.5 py-2 rounded-xl border border-(--app-border)/40">
                    <div className="flex items-center gap-2 text-xs">
                      <span className="font-bold text-(--app-muted-foreground)">الضابط البديل (القائم بالعمل):</span>
                      <span className="font-black text-(--color-primary)">
                        {current.actingOfficerLabel || current.actingOfficerName || "لا يوجد ضابط بديل مسجل"}
                      </span>
                    </div>
                    {Boolean((current.actingOfficerId || current.actingOfficerName) && current.isActingOfficerPresentConfirmed) && (
                      <span className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-blue-500/10 text-blue-600 border border-blue-500/20">
                        موجود بالوحدة
                      </span>
                    )}
                  </div>
                </div>

                {/* Leave Details Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="p-3 rounded-xl bg-(--app-surface) border border-(--app-border) shadow-xs">
                    <span className="text-[10px] font-bold text-(--app-muted-foreground) block">نوع الإجازة</span>
                    <span className="text-xs font-black text-(--color-primary) mt-1 block">
                      {current.leaveTypeLabel}
                    </span>
                  </div>

                  <div className="p-3 rounded-xl bg-(--app-surface) border border-(--app-border) shadow-xs">
                    <span className="text-[10px] font-bold text-(--app-muted-foreground) block">المدة المطلوبة</span>
                    <span className="text-xs font-mono font-black text-(--color-primary) mt-1 block">
                      {days} {days >= 3 && days <= 10 ? "أيام" : "يوم"}
                    </span>
                  </div>

                  <div className="p-3 rounded-xl bg-(--app-surface) border border-(--app-border) shadow-xs">
                    <span className="text-[10px] font-bold text-(--app-muted-foreground) block">المدة بالوحدة منذ آخر عودة</span>
                    <span className="text-xs font-mono font-black text-(--color-primary) mt-1 block">
                      {typeof current.presenceDurationDays === "number" && current.presenceDurationDays > 0
                        ? `${current.presenceDurationDays} يوم`
                        : "ـ"}
                    </span>
                  </div>
                </div>

                {/* Duration Dates */}
                <div className="p-3 rounded-xl bg-(--color-primary)/5 border border-(--color-primary)/15 flex items-center justify-start gap-4 text-xs font-bold">
                  <div className="flex items-center gap-2">
                    <span className="text-(--app-muted-foreground)">من:</span>
                    <span className="text-(--color-primary) font-black">{formatDateWithDay(current.startDate)}</span>
                  </div>
                  <span className="text-(--color-primary)/30 font-light select-none">|</span>
                  <div className="flex items-center gap-2">
                    <span className="text-(--app-muted-foreground)">إلى:</span>
                    <span className="text-(--color-primary) font-black">{formatDateWithDay(current.endDate)}</span>
                  </div>
                </div>

                {/* Notes / Reason if available */}
                {current.reason && (
                  <div className="p-3 rounded-xl bg-(--app-surface) border border-(--app-border) text-xs">
                    <span className="font-bold text-(--app-muted-foreground) block mb-1">سبب / ملاحظات الطلب:</span>
                    <p className="font-bold text-(--app-foreground)">{current.reason}</p>
                  </div>
                )}

                {/* Medical report link if available */}
                {current.medicalReportUrl && (
                  <div className="p-3 rounded-xl bg-(--app-surface) border border-(--app-border) flex items-center justify-between text-xs">
                    <span className="font-bold text-(--app-muted-foreground)">مرفق تقرير طبي معتمد:</span>
                    <a
                      href={current.medicalReportUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-(--color-primary) font-black hover:underline flex items-center gap-1"
                    >
                      <FileText className="w-3.5 h-3.5" />
                      <span>عرض التقرير الطبي</span>
                    </a>
                  </div>
                )}

                {/* Decision Action Buttons Container - keeps its exact dimensions so modal height stays constant */}
                {(isCommander || isAdmin) && (
                  <div className="pt-2 min-h-[44px] flex items-center justify-center">
                    {!current.decision ? (
                      <div className="flex items-center justify-center gap-3">
                        <button
                          type="button"
                          disabled={isCarouselSubmitting}
                          onClick={() => handleCarouselDecision("approve")}
                          className="btn-primary px-8 py-2.5 text-xs font-black flex items-center gap-2 cursor-pointer"
                        >
                          <CheckCircle2 className="w-4 h-4" />
                          <span>تصدق</span>
                        </button>
                        <button
                          type="button"
                          disabled={isCarouselSubmitting}
                          onClick={() => handleCarouselDecision("reject")}
                          className="btn-destructive px-6 py-2.5 text-xs font-black flex items-center gap-2 cursor-pointer"
                        >
                          <XCircle className="w-4 h-4" />
                          <span>لم يتصدق</span>
                        </button>
                      </div>
                    ) : (
                      <div className="h-[38px] flex items-center justify-center text-xs font-bold text-(--app-muted-foreground)">
                        {current.decision === "approved" ? (
                          <span className="text-blue-600 flex items-center gap-1.5 font-black animate-fade-in-up">
                            <CheckCircle2 className="w-4 h-4" />
                            <span>تم تسجيل قرار التصديق</span>
                          </span>
                        ) : (
                          <span className="text-red-600 flex items-center gap-1.5 font-black animate-fade-in-up">
                            <XCircle className="w-4 h-4" />
                            <span>تم تسجيل قرار عدم التصديق</span>
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })()}
        </ModalShell>
      )}
    </div>
  );
}
