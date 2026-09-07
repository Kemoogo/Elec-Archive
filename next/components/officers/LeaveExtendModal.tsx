"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Clock } from "lucide-react";
import { ModalShell } from "@/components/ui/modal-shell";
import { ModalActions } from "@/components/ui/modal-actions";
import { DateField } from "@/components/ui/date-field";
import { FormLabel, FormTextarea } from "@/components/ui/form-fields";
import { useToast } from "@/components/ui/toast";
import { extractApiError } from "@/lib/utils";

interface LeaveExtendModalProps {
  leaveId: string;
  officerName: string;
  currentEndDate: string;
  isOpen: boolean;
  onClose: () => void;
}

export function LeaveExtendModal({
  leaveId,
  officerName,
  currentEndDate,
  isOpen,
  onClose,
}: LeaveExtendModalProps) {
  const router = useRouter();
  const { showToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [newEndDate, setNewEndDate] = useState("");
  const [reason, setReason] = useState("");

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
        const errorMsg = extractApiError(data, "فشل في تقديم طلب الامتداد");
        setError(errorMsg);
        showToast(errorMsg, "error");
        return;
      }

      showToast("تم تقديم طلب امتداد الإجازة ورفعه للقائد بنجاح", "success");
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
      icon={<Clock className="w-4 h-4 text-purple-600" />}
      onClose={onClose}
      overlayClassName="bg-black/40"
      panelClassName="max-h-[85vh] max-w-md border-(--app-border) shadow-depth-xl"
      bodyClassName="p-6 space-y-4"
      footer={
        <ModalActions
          submitText={loading ? "جاري التقديم..." : "رفع طلب الامتداد"}
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
        <div className="p-3 bg-(--app-surface-container-low) rounded-xl border border-(--app-border) text-xs space-y-1">
          <div>
            <span className="text-(--app-muted-foreground) font-bold">الضابط: </span>
            <span className="font-extrabold text-(--app-foreground)">{officerName}</span>
          </div>
          <div>
            <span className="text-(--app-muted-foreground) font-bold">تاريخ العودة الحالي: </span>
            <span className="font-extrabold text-(--app-foreground) font-mono">{currentEndDate.split("T")[0]}</span>
          </div>
        </div>

        <DateField
          id="ext-newEndDate"
          label="تاريخ العودة الجديد المطلوب"
          value={newEndDate}
          onChange={setNewEndDate}
          required
        />

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
