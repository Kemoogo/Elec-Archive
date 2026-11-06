"use client";

import React, { useState, useMemo } from "react";
import { ArrowLeftRight, AlertCircle, User, History } from "lucide-react";
import { ModalShell } from "@/components/ui/modal-shell";
import { ModalActions } from "@/components/ui/modal-actions";
import { CustomSelect, type CustomSelectOption } from "@/components/ui/custom-select";
import { useToast } from "@/components/ui/toast";
import { extractApiError } from "@/lib/utils";
import { formatDateDisplay } from "@/lib/utils/date-display";
import type { OfficerOption } from "@/types";
import type { IDutySwapRecord } from "@/lib/db/models/DutyRoster.shared";

interface DutySwapModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  onViewHistory?: () => void;
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
  isAlreadySwapped?: boolean;
  originalOfficerLabel?: string;
  swapHistory?: IDutySwapRecord[];
  officers: OfficerOption[];
  existingEntries: Array<{
    date: string;
    assignedOfficerId: string;
    yadakOfficerId?: string;
    dutyType: string;
    dutyTitle: string;
  }>;
  weekLeaves: Array<{
    officerId: string;
    startDate: string;
    endDate: string;
    status: string;
  }>;
  weekMissions: Array<{
    officerId: string;
    startDate: string;
    endDate?: string | null;
    status: string;
    title: string;
  }>;
}

export function DutySwapModal({
  isOpen,
  onClose,
  onSuccess,
  onViewHistory,
  date,
  dayName,
  dutyType,
  dutyTitle,
  targetRole = "primary",
  currentOfficerId,
  currentOfficerName,
  currentOfficerLabel,
  yadakOfficerId,
  yadakOfficerName,
  yadakOfficerLabel,
  swapHistory = [],
  officers,
  existingEntries,
  weekLeaves,
  weekMissions,
}: DutySwapModalProps) {
  const { showToast } = useToast();
  const [replacementOfficerId, setReplacementOfficerId] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [validationWarning, setValidationWarning] = useState<string | null>(null);

  const formattedDate = useMemo(() => formatDateDisplay(date) || date, [date]);

  // Two-line title
  const modalTitle = useMemo(() => {
    const roleText =
      targetRole === "yadak"
        ? `مبادلة الضابط اليدك لنوبتجية ${dutyTitle}`
        : `مبادلة نوبتجية ${dutyTitle}`;

    return (
      <div className="flex flex-col text-right leading-snug">
        <span className="text-sm sm:text-base font-black text-(--color-primary)">
          {roleText}
        </span>
        <span className="text-xs font-bold text-(--app-muted-foreground)">
          عن يوم {dayName} الموافق {formattedDate}
        </span>
      </div>
    );
  }, [targetRole, dutyTitle, dayName, formattedDate]);

  const officerBeingReplacedId =
    targetRole === "yadak" ? yadakOfficerId || "" : currentOfficerId;
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

  // Dynamic filter for eligible replacement officers on this date
  const replacementOptions: CustomSelectOption[] = useMemo(() => {
    return officers
      .filter((o) => o.id !== officerBeingReplacedId && o.id !== currentOfficerId && o.id !== yadakOfficerId)
      .map((o) => {
        // 1. Check same-day duty assignment (primary or yadak)
        const sameDayDuty = existingEntries.find(
          (e) =>
            e.date === date &&
            (e.assignedOfficerId === o.id || e.yadakOfficerId === o.id) &&
            !(e.dutyType === dutyType || e.dutyTitle === dutyTitle)
        );

        // 2. Check leaves
        const onLeave = weekLeaves.find((l) => {
          if (l.officerId !== o.id) return false;
          const s = l.startDate.slice(0, 10);
          const e = l.endDate.slice(0, 10);
          return date >= s && date <= e;
        });

        // 3. Check missions
        const onMission = weekMissions.find((m) => {
          if (m.officerId !== o.id) return false;
          const s = m.startDate.slice(0, 10);
          const e = m.endDate ? m.endDate.slice(0, 10) : "9999-99-99";
          return date >= s && date <= e;
        });

        let disabledReason: string | undefined;
        let badge: string | undefined;

        if (targetRole === "yadak" && o.id === currentOfficerId) {
          disabledReason = "مسكن كضابط أساسي في هذه الخدمة";
          badge = "الضابط الأساسي";
        } else if (targetRole === "primary" && yadakOfficerId && o.id === yadakOfficerId) {
          disabledReason = "مسكن كضابط يدك في هذه الخدمة";
          badge = "الضابط اليدك";
        } else if (sameDayDuty) {
          disabledReason = `معين بالفعل اليوم في: ${sameDayDuty.dutyTitle}`;
          badge = "معين اليوم";
        } else if (onLeave) {
          disabledReason = "في إجازة رسمية مسجلة";
          badge = "في إجازة";
        } else if (onMission) {
          disabledReason = `في مأمورية رسمية (${onMission.title})`;
          badge = "في مأمورية";
        }

        return {
          value: o.id,
          label: o.officerLabel || `${o.rank} / ${o.fullName || o.name}`,
          description: disabledReason || `رقم الأقدمية: ${o.seniorityNumber || "ـ"}`,
          disabled: Boolean(disabledReason),
          badge,
        };
      });
  }, [
    officers,
    officerBeingReplacedId,
    currentOfficerId,
    yadakOfficerId,
    targetRole,
    date,
    dutyType,
    dutyTitle,
    existingEntries,
    weekLeaves,
    weekMissions,
  ]);

  if (!isOpen) return null;

  const handleSelectReplacement = (offId: string) => {
    setReplacementOfficerId(offId);
    setValidationWarning(null);

    const opt = replacementOptions.find((o) => o.value === offId);
    if (opt?.disabled) {
      setValidationWarning(`تنبيه مانع: ${opt.description}`);
    }
  };

  const handleSubmitSwap = async () => {
    if (isSubmitting) return;

    if (!replacementOfficerId) {
      showToast("يرجى اختيار الضابط البديل للمبادلة", "error");
      return;
    }

    if (validationWarning) {
      showToast(validationWarning, "error");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/arkan-harb/roster/swap", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date,
          dutyType,
          dutyTitle,
          replacementOfficerId,
          targetRole,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        const errorMsg = extractApiError(json, "فشل تنفيذ مبادلة النوبتجية");
        showToast(errorMsg, "error");
        return;
      }

      showToast(json.message || "تمت مبادلة النوبتجية بنجاح", "success");
      onSuccess();
      onClose();
    } catch {
      showToast("حدث خطأ في الاتصال بالخادم أثناء تنفيذ المبادلة", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ModalShell
      title={modalTitle}
      icon={<ArrowLeftRight className="w-4 h-4 text-(--color-primary)" />}
      onClose={onClose}
      overlayClassName="bg-black/40"
      panelClassName="max-w-lg border-(--app-border) shadow-depth-xl"
      bodyClassName="p-5 space-y-4 no-scrollbar"
      footer={
        <ModalActions
          submitText={isSubmitting ? "جاري تنفيذ المبادلة..." : "تأكيد وتنفيذ المبادلة"}
          submitLoading={isSubmitting}
          onConfirm={handleSubmitSwap}
          onCancel={onClose}
        />
      }
    >
      {/* Officer currently on duty card */}
      <div className="p-3.5 rounded-xl bg-(--app-surface-container) border border-(--app-border) space-y-1.5 text-right">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold text-(--app-muted-foreground)">
            {targetRole === "yadak"
              ? "الضابط اليدك المكلف حالياً (المطلوب استبداله):"
              : "الضابط المكلف حالياً بالخدمة (المطلوب مبادلته):"}
          </span>
          {relevantSwaps.length > 0 && onViewHistory && (
            <button
              type="button"
              onClick={() => {
                onClose();
                onViewHistory();
              }}
              className="inline-flex items-center gap-1 text-[11px] font-bold text-(--color-primary) hover:underline cursor-pointer"
            >
              <History className="w-3 h-3" />
              <span>عرض السجل التاريخي ({relevantSwaps.length})</span>
            </button>
          )}
        </div>
        <div className="flex items-center gap-2">
          <User className="w-4 h-4 text-(--color-primary) shrink-0" />
          <span className="text-sm font-black text-(--color-primary)">
            {officerBeingReplacedLabel}
          </span>
          <span className="px-2 py-0.5 rounded-md bg-(--color-primary)/10 text-(--color-primary) text-[10px] font-bold">
            {targetRole === "yadak" ? "يدك" : "أساسي"}
          </span>
        </div>
      </div>

      {/* Replacement Officer Selection */}
      <div className="space-y-1.5">
        <label
          htmlFor="replacement-officer"
          className="text-xs font-bold text-(--app-muted-foreground) block mr-1"
        >
          الضابط البديل (الذي سيتولى الخدمة بدلاً منه) <span className="text-red-500">*</span>
        </label>
        <CustomSelect
          id="replacement-officer"
          value={replacementOfficerId}
          onChange={handleSelectReplacement}
          options={replacementOptions}
          placeholder="اختر الضابط البديل الملتزم بالخدمة..."
          required
        />
      </div>

      {/* Validation Warning Alert */}
      {validationWarning && (
        <div className="p-3 rounded-xl bg-(--color-primary)/5 border border-(--color-primary)/20 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-(--color-primary) shrink-0 mt-0.5" />
          <span className="text-xs font-bold text-(--color-primary)">
            {validationWarning}
          </span>
        </div>
      )}
    </ModalShell>
  );
}
