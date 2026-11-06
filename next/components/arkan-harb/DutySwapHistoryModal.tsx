"use client";

import React, { useMemo } from "react";
import { History, Clock } from "lucide-react";
import { format } from "date-fns";
import { ar } from "date-fns/locale";
import { ModalShell } from "@/components/ui/modal-shell";
import { ModalActions } from "@/components/ui/modal-actions";
import { formatDateDisplay } from "@/lib/utils/date-display";
import type { IDutySwapRecord } from "@/lib/db/models/DutyRoster.shared";

interface DutySwapHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenSwap?: () => void;
  date: string; // YYYY-MM-DD
  dayName: string;
  dutyType: string;
  dutyTitle: string;
  targetRole?: "primary" | "yadak";
  currentOfficerId: string;
  currentOfficerName: string;
  currentOfficerLabel?: string;
  yadakOfficerId?: string;
  yadakOfficerName?: string;
  yadakOfficerLabel?: string;
  originalOfficerLabel?: string;
  swapHistory?: IDutySwapRecord[];
  canEdit?: boolean;
}

export function DutySwapHistoryModal({
  isOpen,
  onClose,
  onOpenSwap,
  date,
  dayName,
  dutyTitle,
  targetRole = "primary",
  currentOfficerName,
  currentOfficerLabel,
  yadakOfficerName,
  yadakOfficerLabel,
  originalOfficerLabel,
  swapHistory = [],
  canEdit = false,
}: DutySwapHistoryModalProps) {
  const formattedDate = useMemo(() => formatDateDisplay(date) || date, [date]);

  // Two-line title
  const modalTitle = useMemo(() => {
    const roleText =
      targetRole === "yadak"
        ? `السجل التاريخي لمبادلة الضابط اليدك لنوبتجية '${dutyTitle}'`
        : `السجل التاريخي لمبادلة نوبتجية '${dutyTitle}'`;

    return (
      <div className="flex flex-col text-right leading-snug">
        <span className="text-sm sm:text-base font-black text-(--color-primary)">
          {roleText}
        </span>
        <span className="text-xs font-bold text-(--app-muted-foreground)">
          عن يوم &apos;{dayName}&apos; الموافق {formattedDate}
        </span>
      </div>
    );
  }, [targetRole, dutyTitle, dayName, formattedDate]);

  const officerBeingReplacedLabel =
    targetRole === "yadak"
      ? yadakOfficerLabel || yadakOfficerName || "الضابط اليدك"
      : currentOfficerLabel || currentOfficerName;

  // Filter swaps specifically for this role
  const relevantSwaps = useMemo(() => {
    return (swapHistory || []).filter((sh) =>
      targetRole === "yadak"
        ? sh.targetRole === "yadak"
        : sh.targetRole === "primary" || !sh.targetRole
    );
  }, [swapHistory, targetRole]);

  // Determine the original officer who was first assigned upon roster approval
  const initialOfficerLabel = useMemo(() => {
    if (targetRole === "primary") {
      const firstPrimarySwap = swapHistory.find(
        (sh) => sh.targetRole === "primary" || !sh.targetRole
      );
      return (
        originalOfficerLabel ||
        firstPrimarySwap?.fromOfficerLabel ||
        firstPrimarySwap?.fromOfficerName ||
        currentOfficerLabel ||
        currentOfficerName ||
        "الضابط الأصلي"
      );
    }
    const firstYadakSwap = swapHistory.find((sh) => sh.targetRole === "yadak");
    return (
      firstYadakSwap?.fromOfficerLabel ||
      firstYadakSwap?.fromOfficerName ||
      yadakOfficerLabel ||
      yadakOfficerName ||
      "الضابط اليدك الأصلي"
    );
  }, [
    targetRole,
    originalOfficerLabel,
    swapHistory,
    currentOfficerLabel,
    currentOfficerName,
    yadakOfficerLabel,
    yadakOfficerName,
  ]);

  const formatSwapDate = (dateVal: string | Date | undefined) => {
    if (!dateVal) return "";
    try {
      const d = new Date(dateVal);
      if (isNaN(d.getTime())) return String(dateVal);
      return format(d, "eeee d MMMM yyyy - h:mm a", { locale: ar });
    } catch {
      return String(dateVal);
    }
  };

  // Build descending officers list without swap reason
  const descendingOfficersList = useMemo(() => {
    if (relevantSwaps.length === 0) {
      return [
        {
          label: initialOfficerLabel,
          isCurrent: true,
          statusText: "المكلف حالياً (التعيين المعتمد)",
          swapDate: undefined as string | Date | undefined,
        },
      ];
    }

    const items = [];
    const reversed = [...relevantSwaps].reverse();

    // 1. The latest assignee (currently serving)
    const latestSwap = reversed[0];
    items.push({
      label:
        latestSwap.toOfficerLabel ||
        latestSwap.toOfficerName ||
        officerBeingReplacedLabel,
      isCurrent: true,
      statusText: "المكلف بالخدمة حالياً",
      swapDate: latestSwap.swappedAt,
    });

    // 2. Previous swaps that have been superseded
    for (let i = 1; i < reversed.length; i++) {
      const sw = reversed[i];
      items.push({
        label: sw.toOfficerLabel || sw.toOfficerName || "ضابط سابق",
        isCurrent: false,
        statusText: `مبادلة سابقة (رقم ${relevantSwaps.length - i})`,
        swapDate: sw.swappedAt,
      });
    }

    // 3. Original officer at the bottom
    items.push({
      label: initialOfficerLabel,
      isCurrent: false,
      statusText: "التعيين المعتمد",
      swapDate: undefined as string | Date | undefined,
    });

    return items;
  }, [relevantSwaps, initialOfficerLabel, officerBeingReplacedLabel]);

  if (!isOpen) return null;

  return (
    <ModalShell
      title={modalTitle}
      icon={<History className="w-4 h-4 text-(--color-primary)" />}
      onClose={onClose}
      overlayClassName="bg-black/40"
      panelClassName="max-w-lg border-(--app-border) shadow-depth-xl"
      bodyClassName="p-5 space-y-4 no-scrollbar"
      footer={
        <ModalActions
          mode="view"
          submitText={canEdit && onOpenSwap ? "تقديم مبادلة جديدة" : undefined}
          onConfirm={
            canEdit && onOpenSwap
              ? () => {
                  onClose();
                  onOpenSwap();
                }
              : undefined
          }
          onCancel={onClose}
        />
      }
    >
      {/* Ordered Assignees and Swaps Sequence (سجل المعينين بالخدمة تنازلياً) */}
      <div className="rounded-xl border border-(--app-border) bg-(--app-surface-container)/40 p-3.5 space-y-3 text-right">
        <div className="flex items-center justify-between border-b border-(--app-border)/60 pb-2">
          <div className="flex items-center gap-1.5 text-xs font-black text-(--color-primary)">
            <History className="w-4 h-4 text-(--color-primary)" />
            <span>سجل المبادلات</span>
          </div>
          <span className="text-[10px] font-bold text-(--app-muted-foreground)">
            {descendingOfficersList.length > 1
              ? `${descendingOfficersList.length} ضباط متعاقبين`
              : "التعيين الأولي"}
          </span>
        </div>

        <div className="space-y-2">
          {descendingOfficersList.map((item, idx) => {
            const isLatest = idx === 0;
            const formattedTime = item.swapDate ? formatSwapDate(item.swapDate) : null;

            return (
              <div key={idx} className="flex items-start gap-2.5 text-xs">
                {/* Index badge */}
                <div
                  className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black shrink-0 mt-0.5 ${isLatest
                    ? "bg-(--color-primary) text-white shadow-xs"
                    : "bg-(--app-surface-container) border border-(--app-border) text-(--app-muted-foreground)"
                    }`}
                >
                  {idx + 1}
                </div>

                {/* Officer Card */}
                <div
                  className={`flex-1 space-y-1.5 p-2.5 rounded-lg border transition-all ${isLatest
                    ? "bg-(--app-surface) border-(--color-primary)/30 shadow-xs"
                    : "bg-(--app-surface)/60 border-(--app-border)/60"
                    }`}
                >
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <span
                      className={`font-bold ${isLatest
                        ? "text-(--color-primary) font-black"
                        : "text-(--app-muted-foreground) line-through decoration-slate-400"
                        }`}
                    >
                      {item.label}
                    </span>
                    <span
                      className={`text-[10px] font-black px-1.5 py-0.5 rounded-md ${isLatest
                        ? "bg-(--color-primary)/10 text-(--color-primary)"
                        : "bg-(--app-surface-container) text-(--app-muted-foreground)"
                        }`}
                    >
                      {item.statusText}
                    </span>
                  </div>

                  {/* Swap date if applicable */}
                  {formattedTime && (
                    <div className="pt-1.5 border-t border-(--app-border)/40 text-[11px] text-(--app-muted-foreground)">
                      <span className="flex items-center gap-1.5">
                        <Clock className="w-3 h-3 text-(--color-primary) shrink-0" />
                        <span>تاريخ المبادلة: {formattedTime}</span>
                      </span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </ModalShell>
  );
}
