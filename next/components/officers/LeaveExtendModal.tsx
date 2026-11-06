"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Clock } from "lucide-react";
import { ModalShell, ModalHeaderCard, ModalBadge } from "@/components/ui/modal-shell";
import { ModalActions } from "@/components/ui/modal-actions";
import { DateField } from "@/components/ui/date-field";
import { DaysInput } from "@/components/ui/days-input";
import { FormLabel, FormTextarea } from "@/components/ui/form-fields";
import { useToast } from "@/components/ui/toast";
import { extractApiError } from "@/lib/utils";
import { formatDateWithDay } from "@/lib/utils/date-display";

function parseDateParts(dateStr: string): { year: number; month: number; day: number } | null {
  if (!dateStr) return null;
  const match = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) return null;
  return {
    year: Number(match[1]),
    month: Number(match[2]),
    day: Number(match[3]),
  };
}

function addDays(dateStr: string, days: number): string {
  const parts = parseDateParts(dateStr);
  if (!parts) return dateStr;
  const dt = new Date(parts.year, parts.month - 1, parts.day);
  dt.setDate(dt.getDate() + days);
  const year = dt.getFullYear();
  const month = String(dt.getMonth() + 1).padStart(2, "0");
  const day = String(dt.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function diffDays(startStr: string, endStr: string): number {
  const p1 = parseDateParts(startStr);
  const p2 = parseDateParts(endStr);
  if (!p1 || !p2) return 0;
  const t1 = new Date(p1.year, p1.month - 1, p1.day).getTime();
  const t2 = new Date(p2.year, p2.month - 1, p2.day).getTime();
  return Math.round((t2 - t1) / (1000 * 3600 * 24));
}

interface LeaveExtendModalProps {
  leaveId: string;
  officerName: string;
  officerLabel?: string;
  currentEndDate: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (newEndDate: string) => void;
}

export function LeaveExtendModal({
  leaveId,
  officerName,
  officerLabel,
  currentEndDate,
  isOpen,
  onClose,
  onSuccess,
}: LeaveExtendModalProps) {
  const router = useRouter();
  const { showToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [extensionDays, setExtensionDays] = useState<number>(1);
  const [newEndDate, setNewEndDate] = useState<string>(() => addDays(currentEndDate, 1));
  const [reason, setReason] = useState("");

  useEffect(() => {
    if (isOpen && currentEndDate) {
      setNewEndDate(addDays(currentEndDate, 1));
      setExtensionDays(1);
      setReason("");
      setError("");
    }
  }, [isOpen, currentEndDate]);

  const handleDateChange = (val: string) => {
    setNewEndDate(val);
    if (currentEndDate && val) {
      const diff = diffDays(currentEndDate, val);
      if (diff > 0) {
        setExtensionDays(diff);
      }
    }
  };

  const handleDaysChange = (days: number) => {
    setExtensionDays(days);
    if (currentEndDate && days > 0) {
      setNewEndDate(addDays(currentEndDate, days));
    }
  };

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEndDate) {
      setError("يرجى تحديد تاريخ الانتهاء الجديد");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/arkan-harb/leaves/extend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leaveId, newEndDate, reason }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        const errorMsg = extractApiError(data, "فشل في تمديد الإجازة");
        setError(errorMsg);
        showToast(errorMsg, "error");
        return;
      }

      showToast("تم تمديد وتنفيذ الإجازة مباشرة بنجاح", "success");
      onSuccess?.(newEndDate);
      onClose();
      router.refresh();
    } catch {
      setError("حدث خطأ في الاتصال بالخادم");
      showToast("حدث خطأ في الاتصال بالخادم", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <ModalShell
      title="طلب امتداد إجازة"
      icon={<Clock className="w-4 h-4 text-(--color-primary)" />}
      onClose={onClose}
      overlayClassName="bg-black/40"
      panelClassName="max-h-[85vh] max-w-lg border-(--app-border) shadow-depth-xl"
      bodyClassName="p-6 space-y-4"
      footer={
        <ModalActions
          submitText={loading ? "جاري التمديد..." : "تمديد وتنفيذ الإجازة مباشرة"}
          submitLoading={loading}
          cancelText="إلغاء"
          onCancel={onClose}
          form="extend-leave-form"
        />
      }
    >
      {error && (
        <div className="rounded-xl bg-(--app-error)/10 border border-(--app-error)/20 p-3 text-(--app-error) font-bold text-xs text-right">
          {error}
        </div>
      )}

      <form id="extend-leave-form" onSubmit={handleSubmit} className="space-y-4 text-right">
        <ModalHeaderCard
          icon={<Clock className="w-5 h-5" />}
          title={officerLabel || officerName}
          subtitle={`تاريخ العودة الحالي: ${formatDateWithDay(currentEndDate)}`}
          badge={
            <ModalBadge icon={<Clock className="w-3.5 h-3.5 text-(--app-muted-foreground) shrink-0" />}>
              امتداد إجازة
            </ModalBadge>
          }
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <DaysInput
            id="ext-days"
            label="أيام الامتداد"
            min={1}
            max={365}
            value={extensionDays}
            onChange={handleDaysChange}
            required
            disabled={loading}
          />

          <DateField
            id="ext-newEndDate"
            label="تاريخ العودة الجديد المطلوب"
            value={newEndDate}
            onChange={handleDateChange}
            required
          />
        </div>

        <div className="space-y-1.5">
          <FormLabel>سبب الامتداد</FormLabel>
          <FormTextarea
            id="ext-reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={2}
            placeholder="مبرر طلب امتداد الإجازة..."
          />
        </div>
      </form>
    </ModalShell>
  );
}
