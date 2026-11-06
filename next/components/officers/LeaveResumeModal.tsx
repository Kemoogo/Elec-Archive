"use client";

import React, { useState, useMemo } from "react";
import { RotateCcw, Calendar, CheckCircle2, Clock, AlertCircle } from "lucide-react";
import { ModalShell, ModalHeaderCard, ModalBadge } from "@/components/ui/modal-shell";
import { ModalActions } from "@/components/ui/modal-actions";
import { DateField } from "@/components/ui/date-field";
import { CustomSelect, type CustomSelectOption } from "@/components/ui/custom-select";
import { useToast } from "@/components/ui/toast";
import { extractApiError } from "@/lib/utils";
import { formatDateDisplay } from "@/components/ui/date-badge";
import { LEAVE_TYPE_LABELS, type LeaveType } from "@/lib/db/models/Leave.shared";
import type { OfficerOption } from "@/types/officer";

export interface InterruptedLeaveInfo {
  leaveId: string;
  officerId: string;
  officerName: string;
  officerRank?: string;
  officerLabel?: string;
  militaryId?: string;
  seniorityNumber?: string;
  type: LeaveType;
  typeLabel?: string;
  originalStartDate: string;
  actualReturnDate: string;
  originalEndDate: string;
  remainingDays: number;
}

interface LeaveResumeModalProps {
  isOpen: boolean;
  onClose: () => void;
  leaveInfo: InterruptedLeaveInfo | null;
  officers: OfficerOption[];
  onSuccess?: () => void;
}

export function LeaveResumeModal({
  isOpen,
  onClose,
  leaveInfo,
  officers = [],
  onSuccess,
}: LeaveResumeModalProps) {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Compute initial dates based on the interrupted leave
  const initialValues = useMemo(() => {
    const todayStr = new Date().toISOString().split("T")[0];
    const cutDate = leaveInfo?.actualReturnDate ? leaveInfo.actualReturnDate.split("T")[0] : todayStr;
    const defaultStart = todayStr >= cutDate ? todayStr : cutDate;
    const origEnd = leaveInfo?.originalEndDate ? leaveInfo.originalEndDate.split("T")[0] : "";
    const isSameDate = Boolean(origEnd && origEnd >= defaultStart);
    let defaultEnd = origEnd;
    if (!isSameDate) {
      const rem = Math.max(1, leaveInfo?.remainingDays || 1);
      const sDateObj = new Date(defaultStart);
      sDateObj.setDate(sDateObj.getDate() + rem - 1);
      defaultEnd = sDateObj.toISOString().split("T")[0];
    }
    return {
      mode: isSameDate ? ("same_date" as const) : ("modify_date" as const),
      start: defaultStart,
      end: defaultEnd,
    };
  }, [leaveInfo]);

  // Resume mode: "same_date" (no commander approval) vs "modify_date" (requires commander approval)
  const [resumeMode, setResumeMode] = useState<"same_date" | "modify_date">(initialValues.mode);

  // Dates state
  const [startDate, setStartDate] = useState<string>(initialValues.start);
  const [endDate, setEndDate] = useState<string>(initialValues.end);
  const [actingOfficerId, setActingOfficerId] = useState<string>("");
  const [reason, setReason] = useState<string>("");

  // Handle mode change
  const handleModeChange = (mode: "same_date" | "modify_date") => {
    setResumeMode(mode);
    if (!leaveInfo) return;

    if (mode === "same_date") {
      const origEnd = leaveInfo.originalEndDate ? leaveInfo.originalEndDate.split("T")[0] : "";
      if (origEnd) {
        setEndDate(origEnd);
      }
    } else {
      const rem = Math.max(1, leaveInfo.remainingDays || 1);
      const sDateObj = startDate ? new Date(startDate) : new Date();
      sDateObj.setDate(sDateObj.getDate() + rem - 1);
      setEndDate(sDateObj.toISOString().split("T")[0]);
    }
  };

  // Acting officer options (exclude current officer)
  const actingOfficerOptions: CustomSelectOption[] = useMemo(() => {
    return officers
      .filter((o) => o.id !== leaveInfo?.officerId)
      .map((o) => ({
        value: o.id,
        label: o.officerLabel || `${o.rank} / ${o.fullName || o.name}`,
        description: `رقم الأقدمية: ${o.seniorityNumber || "ـ"}`,
      }));
  }, [officers, leaveInfo?.officerId]);

  // Calculate current days for the resumed period
  const resumedDaysCount = useMemo(() => {
    if (!startDate || !endDate) return 0;
    const s = new Date(startDate);
    const e = new Date(endDate);
    if (isNaN(s.getTime()) || isNaN(e.getTime()) || e < s) return 0;
    return Math.max(1, Math.round((e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24)) + 1);
  }, [startDate, endDate]);

  if (!isOpen || !leaveInfo) return null;

  const typeLabel = leaveInfo.typeLabel || LEAVE_TYPE_LABELS[leaveInfo.type] || "إجازة";
  const origEndFormatted = leaveInfo.originalEndDate ? formatDateDisplay(leaveInfo.originalEndDate) : "ـ";
  const cutDateFormatted = leaveInfo.actualReturnDate ? formatDateDisplay(leaveInfo.actualReturnDate) : "ـ";
  const canUseSameDate = leaveInfo.originalEndDate && startDate <= leaveInfo.originalEndDate.split("T")[0];

  const handleSubmit = async () => {
    if (!startDate || !endDate) {
      setError("يرجى تحديد تواريخ الاستكمال");
      return;
    }

    if (endDate < startDate) {
      setError("تاريخ نهاية الاستكمال يجب أن يكون بعد أو يساوي تاريخ البداية");
      return;
    }

    const cutStr = leaveInfo.actualReturnDate ? leaveInfo.actualReturnDate.split("T")[0] : "";
    if (cutStr && startDate < cutStr) {
      setError(`تاريخ بداية الاستكمال لا يمكن أن يكون قبل تاريخ قطع الإجازة والعودة للوحدة (${cutDateFormatted})`);
      return;
    }

    if (resumeMode === "same_date" && !canUseSameDate) {
      setError("لا يمكن اختيار نفس تاريخ العودة لأن تاريخ البداية تجاوز تاريخ العودة الأصلي");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/arkan-harb/leaves/resume", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          originalLeaveId: leaveInfo.leaveId,
          startDate,
          endDate,
          resumeMode,
          actingOfficerId: actingOfficerId || undefined,
          reason: reason.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(extractApiError(data, "فشل تسجيل استكمال الإجازة"));
      }

      if (data.data?.requiresCommanderApproval) {
        showToast("تم تقديم طلب استكمال الإجازة وتعديل العودة بنجاح (في انتظار تصديق القائد)", "info");
      } else {
        showToast("تم اعتماد استكمال الإجازة مباشرة بنجاح (نفس تاريخ العودة المصدق)", "info");
      }

      onSuccess?.();
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "حدث خطأ غير متوقع");
    } finally {
      setLoading(false);
    }
  };

  return (
    <ModalShell
      title="استكمال إجازة مقطوعة"
      icon={<RotateCcw className="w-4 h-4 text-(--color-primary)" />}
      onClose={onClose}
      overlayClassName="bg-black/40"
      panelClassName="max-w-lg border-(--app-border) shadow-depth-xl"
      bodyClassName="p-5 space-y-4 no-scrollbar"
      footer={
        <ModalActions
          submitText={loading ? "جاري الحفظ..." : "تأكيد استكمال الإجازة"}
          submitDisabled={loading || !startDate || !endDate}
          onConfirm={handleSubmit}
          onCancel={onClose}
          cancelText="إلغاء"
        />
      }
    >
      {/* Header Card */}
      <ModalHeaderCard
        icon={<RotateCcw className="w-6 h-6 text-(--color-primary)" />}
        title={leaveInfo.officerLabel || `${leaveInfo.officerRank ? `${leaveInfo.officerRank} / ` : ""}${leaveInfo.officerName}`}
        subtitle={`الرقم العسكري: ${leaveInfo.militaryId || "ـ"} | الأقدمية: ${leaveInfo.seniorityNumber || "ـ"}`}
        badge={
          <ModalBadge icon={<Calendar className="w-3.5 h-3.5" />}>
            إجازة {typeLabel}
          </ModalBadge>
        }
      />

      {/* Summary of Interrupted Leave */}
      <div className="p-3 bg-(--color-primary)/5 border border-(--color-primary)/20 rounded-xl space-y-2 text-right">
        <div className="flex items-center justify-between text-xs">
          <span className="font-bold text-(--app-muted-foreground)">تاريخ قطع الإجازة والعودة للوحدة:</span>
          <span className="font-mono font-black text-(--color-primary)">{cutDateFormatted}</span>
        </div>
        <div className="flex items-center justify-between text-xs">
          <span className="font-bold text-(--app-muted-foreground)">تاريخ العودة الأصلي المصدق سابقاً:</span>
          <span className="font-mono font-black text-(--color-primary)">{origEndFormatted}</span>
        </div>
        <div className="flex items-center justify-between text-xs border-t border-(--color-primary)/15 pt-2">
          <span className="font-bold text-(--app-muted-foreground)">الأيام المتبقية المستحقة للاستعواض:</span>
          <span className="inline-flex items-center gap-1 font-mono font-black text-xs px-2 py-0.5 rounded-lg bg-(--color-primary)/10 text-(--color-primary)">
            {leaveInfo.remainingDays} {leaveInfo.remainingDays >= 3 && leaveInfo.remainingDays <= 10 ? "أيام" : "يوم"}
          </span>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="p-3 bg-(--color-primary)/5 border border-(--color-primary)/20 rounded-xl flex items-start gap-2.5 text-right">
          <AlertCircle className="w-4 h-4 text-(--color-primary) shrink-0 mt-0.5" />
          <p className="text-xs font-bold text-(--color-primary)">{error}</p>
        </div>
      )}

      {/* Option Selection: Same Date vs Modified Date */}
      <div className="space-y-2 text-right">
        <label className="text-xs font-bold text-(--app-muted-foreground) block mr-1">
          نظام استكمال الإجازة والتصديق:
        </label>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {/* Option 1: Same return date */}
          <button
            type="button"
            onClick={() => handleModeChange("same_date")}
            disabled={!canUseSameDate}
            className={`p-3 rounded-xl border text-right transition-all cursor-pointer ${
              resumeMode === "same_date"
                ? "border-(--color-primary) bg-(--color-primary)/10 shadow-sm"
                : "border-(--app-border) bg-(--app-surface) hover:bg-(--app-surface-container)"
            } ${!canUseSameDate ? "opacity-50 cursor-not-allowed" : ""}`}
          >
            <div className="flex items-center gap-2 mb-1">
              <CheckCircle2 className={`w-4 h-4 ${resumeMode === "same_date" ? "text-(--color-primary)" : "text-(--app-muted-foreground)"}`} />
              <span className="text-xs font-black text-(--color-primary)">نفس تاريخ العودة</span>
            </div>
            <p className="text-[11px] font-bold text-(--app-muted-foreground) leading-relaxed">
              العودة في {origEndFormatted} (بدون تصديق من القائد - اعتماد فوري).
            </p>
          </button>

          {/* Option 2: Modified date */}
          <button
            type="button"
            onClick={() => handleModeChange("modify_date")}
            className={`p-3 rounded-xl border text-right transition-all cursor-pointer ${
              resumeMode === "modify_date"
                ? "border-(--color-primary) bg-(--color-primary)/10 shadow-sm"
                : "border-(--app-border) bg-(--app-surface) hover:bg-(--app-surface-container)"
            }`}
          >
            <div className="flex items-center gap-2 mb-1">
              <Clock className={`w-4 h-4 ${resumeMode === "modify_date" ? "text-(--color-primary)" : "text-(--app-muted-foreground)"}`} />
              <span className="text-xs font-black text-(--color-primary)">تعديل تاريخ العودة</span>
            </div>
            <p className="text-[11px] font-bold text-(--app-muted-foreground) leading-relaxed">
              استعواض الأيام وتحديد موعد عودة جديد (يعرض للتصديق من القائد).
            </p>
          </button>
        </div>
      </div>

      {/* Date Fields */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-right">
        <DateField
          id="resume-start-date"
          label="تاريخ بداية الاستكمال"
          value={startDate}
          onChange={(val) => {
            setStartDate(val);
            if (resumeMode === "modify_date") {
              const rem = Math.max(1, leaveInfo.remainingDays || 1);
              const s = new Date(val);
              s.setDate(s.getDate() + rem - 1);
              setEndDate(s.toISOString().split("T")[0]);
            }
          }}
          required
        />

        <DateField
          id="resume-end-date"
          label="تاريخ نهاية الاستكمال (العودة)"
          value={endDate}
          onChange={(val) => {
            setEndDate(val);
            if (resumeMode === "same_date") {
              setResumeMode("modify_date");
            }
          }}
          required
        />
      </div>

      {/* Duration Summary */}
      <div className="p-2.5 bg-(--app-surface-container) border border-(--app-border) rounded-xl flex items-center justify-between text-right text-xs">
        <span className="font-bold text-(--app-muted-foreground)">إجمالي أيام الاستكمال المحددة:</span>
        <span className="font-mono font-black text-(--color-primary)">
          {resumedDaysCount} {resumedDaysCount >= 3 && resumedDaysCount <= 10 ? "أيام" : "يوم"}
        </span>
      </div>

      {/* Acting Officer */}
      <div className="space-y-1.5 text-right">
        <CustomSelect
          id="resume-acting-officer"
          label="الضابط القائم بالأعمال (اختياري)"
          value={actingOfficerId}
          onChange={setActingOfficerId}
          options={actingOfficerOptions}
          placeholder="اختر الضابط البديل..."
        />
      </div>

      {/* Reason / Notes */}
      <div className="space-y-1.5 text-right">
        <label htmlFor="resume-notes" className="text-xs font-bold text-(--app-muted-foreground) block mr-1">
          ملاحظات الاستكمال
        </label>
        <input
          id="resume-notes"
          type="text"
          maxLength={200}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="أي ملاحظات أو توجيهات خاصة بالاستكمال..."
          className="w-full px-3 py-2 bg-(--app-surface) border border-(--app-border) rounded-xl text-xs font-bold text-(--app-muted-foreground) focus:outline-none focus:ring-blue-500/20 focus:border-blue-500 transition-all text-right"
        />
      </div>
    </ModalShell>
  );
}
