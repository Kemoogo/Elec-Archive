"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, XCircle, Edit3, MessageSquare } from "lucide-react";
import { ModalShell } from "@/components/ui/modal-shell";
import { ModalActions } from "@/components/ui/modal-actions";
import { DateField } from "@/components/ui/date-field";
import { FormLabel, FormTextarea } from "@/components/ui/form-fields";
import { useToast } from "@/components/ui/toast";
import { extractApiError } from "@/lib/utils";

interface CommanderDecisionModalProps {
  leaveId: string;
  officerName: string;
  officerLabel?: string;
  actionType: "approve" | "reject" | "modify" | "other_orders";
  initialStartDate: string;
  initialEndDate: string;
  isOpen: boolean;
  onClose: () => void;
}

export function CommanderDecisionModal({
  leaveId,
  officerName,
  officerLabel,
  actionType,
  initialStartDate,
  initialEndDate,
  isOpen,
  onClose,
}: CommanderDecisionModalProps) {
  const router = useRouter();
  const { showToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [startDate, setStartDate] = useState(initialStartDate ? initialStartDate.split("T")[0] : "");
  const [endDate, setEndDate] = useState(initialEndDate ? initialEndDate.split("T")[0] : "");
  const [notes, setNotes] = useState("");

  if (!isOpen) return null;

  // Calculate day count if modifying
  let dayCount = 0;
  if (startDate && endDate) {
    const s = new Date(startDate);
    const e = new Date(endDate);
    if (!isNaN(s.getTime()) && !isNaN(e.getTime()) && e >= s) {
      dayCount = Math.round((e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    }
  }

  const getTitle = () => {
    switch (actionType) {
      case "approve":
        return "تصديق على طلب الإجازة";
      case "reject":
        return "عدم التصديق على الطلب";
      case "modify":
        return "تعديل فترة الإجازة والتصديق عليها";
      case "other_orders":
        return "أوامر وتعليمات أخرى للقائد";
    }
  };

  const getIcon = () => {
    switch (actionType) {
      case "approve":
        return <CheckCircle2 className="w-4 h-4 text-emerald-600" />;
      case "reject":
        return <XCircle className="w-4 h-4 text-red-600" />;
      case "modify":
        return <Edit3 className="w-4 h-4 text-blue-600" />;
      case "other_orders":
        return <MessageSquare className="w-4 h-4 text-amber-600" />;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/arkan-harb/leaves/commander-decision", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          leaveId,
          action: actionType,
          notes: notes || undefined,
          startDate: actionType === "modify" ? startDate : undefined,
          endDate: actionType === "modify" ? endDate : undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        const errorMsg = extractApiError(data, "فشل في تسجيل قرار القائد");
        setError(errorMsg);
        showToast(errorMsg, "error");
        return;
      }

      showToast(data.message || "تم تسجيل قرار القائد بنجاح", "success");
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
      title={getTitle()}
      icon={getIcon()}
      onClose={onClose}
      overlayClassName="bg-black/40"
      panelClassName="max-h-[85vh] max-w-md border-(--app-border) shadow-depth-xl"
      bodyClassName="p-6 space-y-4"
      footer={
        <ModalActions
          submitText={loading ? "جاري الحفظ..." : "تأكيد وإصدار القرار"}
          submitVariant={actionType === "reject" ? "destructive" : "primary"}
          submitLoading={loading}
          cancelText="إلغاء"
          onCancel={onClose}
          form="commander-decision-form"
        />
      }
    >
      {error && (
        <div className="rounded-xl bg-(--app-error)/10 border border-(--app-error)/20 p-3 text-(--app-error) font-bold text-xs text-right">
          {error}
        </div>
      )}

      <form id="commander-decision-form" onSubmit={handleSubmit} className="space-y-4 text-right">
        <div className="p-3.5 bg-(--app-surface-container-low) rounded-xl border border-(--app-border) text-xs">
          <span className="font-bold text-(--app-muted-foreground)">الضابط: </span>
          <span className="font-extrabold text-(--app-foreground)">{officerLabel || officerName}</span>
        </div>

        {actionType === "modify" && (
          <div className="space-y-4 p-4 bg-blue-500/5 border border-blue-500/20 rounded-2xl">
            <div className="grid grid-cols-2 gap-3">
              <DateField
                id="mod-start"
                label="يوم بداية الإجازة"
                value={startDate}
                onChange={setStartDate}
                required
              />
              <DateField
                id="mod-end"
                label="يوم العودة"
                value={endDate}
                onChange={setEndDate}
                required
              />
            </div>

            {dayCount > 0 && (
              <div className="flex items-center justify-between p-2.5 bg-blue-500/10 rounded-xl text-xs font-bold text-blue-900">
                <span>فترة الإجازة الإجمالية:</span>
                <span className="text-sm font-black text-blue-700 font-mono">{dayCount} أيام</span>
              </div>
            )}
          </div>
        )}

        {actionType === "reject" && (
          <div className="space-y-1.5">
            <FormLabel>سبب عدم التصديق (اختياري)</FormLabel>
            <FormTextarea
              id="rej-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder="اكتب سبب رفض الطلب ليعود لأركان حرب..."
            />
          </div>
        )}

        {actionType === "other_orders" && (
          <div className="space-y-1.5">
            <FormLabel required>أوامر وتعليمات القائد</FormLabel>
            <FormTextarea
              id="ord-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder="سجل توجيهاتك أو الشروط المطلوبة قبل الإجازة..."
              required
            />
          </div>
        )}

        {actionType === "approve" && (
          <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-xs text-emerald-900 font-bold">
            سيتم التصديق فوراً على إجازة الضابط واعتمادها وتطبيقها تلقائياً على منظومة التمام اليومي في مواعيدها.
          </div>
        )}
      </form>
    </ModalShell>
  );
}
