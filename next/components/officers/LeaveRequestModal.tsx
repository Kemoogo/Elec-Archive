"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { User, Calendar } from "lucide-react";
import { ModalShell } from "@/components/ui/modal-shell";
import { ModalActions } from "@/components/ui/modal-actions";
import { DateField } from "@/components/ui/date-field";
import { FormLabel, FormSelect, FormTextarea } from "@/components/ui/form-fields";
import { useToast } from "@/components/ui/toast";
import { extractApiError } from "@/lib/utils";
import { LEAVE_TYPE_LABELS, LEAVE_TYPE_DEFAULT_DAYS, type LeaveType } from "@/lib/db/models/Leave.shared";

export interface OfficerOption {
  id: string;
  fullName: string;
  militaryId: string;
  rank?: string;
  officerLabel?: string;
  defaultLeaveSystem?: string;
}

interface LeaveRequestModalProps {
  officers: OfficerOption[];
  preselectedOfficerId?: string;
  isOpen?: boolean;
  onClose?: () => void;
}

const LEAVE_SYSTEM_KEYS: LeaveType[] = [
  "field",
  "weekly_rest",
  "daily_sleep",
  "medical",
  "annual",
  "permission",
  "casual",
];

function formatISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function calculateEndDate(startDateStr: string, leaveType: LeaveType): string {
  const days = LEAVE_TYPE_DEFAULT_DAYS[leaveType] || 2;
  const [y, m, d] = startDateStr.split("-").map(Number);
  if (!y || !m || !d) return startDateStr;
  const endD = new Date(y, m - 1, d);
  endD.setDate(endD.getDate() + (days - 1));
  return formatISODate(endD);
}

export function LeaveRequestModal({
  officers,
  preselectedOfficerId,
  isOpen = false,
  onClose,
}: LeaveRequestModalProps) {
  const router = useRouter();
  const { showToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const todayStr = formatISODate(new Date());

  const initialOfficer = preselectedOfficerId
    ? officers.find((o) => o.id === preselectedOfficerId)
    : undefined;
  const initialType = (initialOfficer?.defaultLeaveSystem as LeaveType) || "field";

  const [form, setForm] = useState({
    officerId: preselectedOfficerId || "",
    category: "leave",
    type: initialType,
    startDate: todayStr,
    endDate: calculateEndDate(todayStr, initialType),
    lastReturnDate: "",
    presenceDurationDays: 0,
    actingOfficerId: "",
    isActingOfficerPresentConfirmed: true,
    reason: "",
  });

  const handleClose = () => {
    if (onClose) onClose();
  };

  const handleOfficerChange = (officerId: string) => {
    const off = officers.find((o) => o.id === officerId);
    const defType = (off?.defaultLeaveSystem as LeaveType) || "field";
    setForm((prev) => ({
      ...prev,
      officerId,
      type: defType,
      endDate: calculateEndDate(prev.startDate, defType),
    }));
  };

  const handleTypeChange = (newType: LeaveType) => {
    setForm((prev) => ({
      ...prev,
      type: newType,
      endDate: calculateEndDate(prev.startDate, newType),
    }));
  };

  const handleStartDateChange = (newStartDate: string) => {
    setForm((prev) => ({
      ...prev,
      startDate: newStartDate,
      endDate: calculateEndDate(newStartDate, prev.type),
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.officerId) {
      setError("يرجى اختيار الضابط أولاً");
      return;
    }
    if (!form.startDate || !form.endDate) {
      setError("يرجى تحديد تاريخي البداية والنهاية");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/arkan-harb/leaves", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        const errorMsg = extractApiError(data, "فشل في تقديم طلب الإجازة");
        setError(errorMsg);
        showToast(errorMsg, "error");
        return;
      }

      showToast("تم رفع طلب الإجازة بنجاح في انتظار تصديق القائد", "success");
      handleClose();
      router.refresh();
    } catch {
      setError("حدث خطأ في الاتصال بالخادم");
      showToast("حدث خطأ في الاتصال بالخادم", "error");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <ModalShell
      title="تقديم طلب إجازة للضابط"
      icon={<Calendar className="w-4 h-4" />}
      onClose={handleClose}
      overlayClassName="bg-black/40"
      panelClassName="max-h-[90vh] max-w-xl border-(--app-border) shadow-depth-xl"
      bodyClassName="p-6 space-y-4 no-scrollbar"
      footer={
        <ModalActions
          submitText={loading ? "جاري التقديم..." : "رفع الطلب للقائد"}
          submitLoading={loading}
          cancelText="إلغاء"
          onCancel={handleClose}
          form="leave-request-form"
        />
      }
    >
      {error && (
        <div className="rounded-xl bg-(--app-error)/10 border border-(--app-error)/20 p-3.5 text-(--app-error) font-bold text-xs text-right">
          {error}
        </div>
      )}

      <form id="leave-request-form" onSubmit={handleSubmit} className="space-y-4 text-right">
        {/* Officer Select */}
        <div className="space-y-1.5">
          <FormLabel htmlFor="req-officerId" required>الضابط المعني</FormLabel>
          <FormSelect
            id="req-officerId"
            value={form.officerId}
            onChange={(e) => handleOfficerChange(e.target.value)}
            required
            disabled={Boolean(preselectedOfficerId)}
          >
            <option value="">اختر الضابط من القوة</option>
            {officers.map((o) => (
              <option key={o.id} value={o.id}>
                {o.officerLabel || `${o.rank || ""} / ${o.fullName}`} (#{o.militaryId})
              </option>
            ))}
          </FormSelect>
        </div>

        {/* Leave System (7 Systems) */}
        <div className="space-y-1.5">
          <FormLabel required>نوع نظام الإجازة</FormLabel>
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
            {LEAVE_SYSTEM_KEYS.map((sys) => (
              <button
                key={sys}
                type="button"
                onClick={() => handleTypeChange(sys)}
                className={`py-2 px-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                  form.type === sys
                    ? "bg-(--color-primary) text-white border-(--color-primary) shadow-xs"
                    : "bg-(--app-surface-container) border border-(--app-border) text-(--app-muted-foreground) hover:bg-(--app-surface) hover:text-(--color-primary)"
                }`}
              >
                {LEAVE_TYPE_LABELS[sys]}
              </button>
            ))}
          </div>
        </div>

        {/* Dates: Start & End */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <DateField
            id="req-startDate"
            label="تاريخ البدء (افتراضي اليوم)"
            value={form.startDate}
            onChange={handleStartDateChange}
            required
          />
          <DateField
            id="req-endDate"
            label="تاريخ العودة المتوقع"
            value={form.endDate}
            onChange={(v) => setForm((prev) => ({ ...prev, endDate: v }))}
            required
          />
        </div>

        {/* Acting Officer & Confirmation Checkbox */}
        <div className="p-4 bg-(--app-surface-container-low) rounded-2xl border border-(--app-border) space-y-3">
          <div className="flex items-center gap-2 text-xs font-black text-(--color-primary)">
            <User className="w-4 h-4" />
            <span>القائم بالأعمال خلال فترة الإجازة</span>
          </div>

          <div className="space-y-1.5">
            <FormLabel htmlFor="req-actingOfficerId">اسم الضابط القائم بالأعمال</FormLabel>
            <FormSelect
              id="req-actingOfficerId"
              value={form.actingOfficerId}
              onChange={(e) => setForm((prev) => ({ ...prev, actingOfficerId: e.target.value }))}
            >
              <option value="">حدد الضابط البديل...</option>
              {officers
                .filter((o) => o.id !== form.officerId)
                .map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.officerLabel || `${o.rank || ""} / ${o.fullName}`} (#{o.militaryId})
                  </option>
                ))}
            </FormSelect>
          </div>

          <label className="flex items-center gap-2 cursor-pointer pt-1">
            <input
              type="checkbox"
              checked={form.isActingOfficerPresentConfirmed}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, isActingOfficerPresentConfirmed: e.target.checked }))
              }
              className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-(--app-border)"
            />
            <span className="text-xs font-bold text-(--app-foreground)">
              تأكيد أن القائم بالأعمال موجود ومتواجد بالوحدة
            </span>
          </label>
        </div>

        {/* Notes / Reason */}
        <div className="space-y-1.5">
          <FormLabel>ملاحظات إضافية أو مبررات الطلب</FormLabel>
          <FormTextarea
            id="req-reason"
            value={form.reason}
            onChange={(e) => setForm((prev) => ({ ...prev, reason: e.target.value }))}
            rows={2}
            placeholder="اكتب أية تفاصيل تفيد القائد في اتخاذ القرار..."
          />
        </div>
      </form>
    </ModalShell>
  );
}
