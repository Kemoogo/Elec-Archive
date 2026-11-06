"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { ModalShell } from "@/components/ui/modal-shell";
import { ModalActions } from "@/components/ui/modal-actions";
import { PrimaryHeaderBtn } from "@/components/layout/ModernPageHeader";
import { DateField } from "@/components/ui/date-field";
import { FormLabel, FormTextarea } from "@/components/ui/form-fields";
import { CustomSelect } from "@/components/ui/custom-select";
import { useToast } from "@/components/ui/toast";
import { extractApiError } from "@/lib/utils";
import { LEAVE_TYPES, LEAVE_TYPE_LABELS } from "@/lib/db/models/Leave.shared";
import type { OfficerOption } from "@/types";

const LEAVE_TYPE_OPTIONS = LEAVE_TYPES.map((value) => ({
  value,
  label: LEAVE_TYPE_LABELS[value],
}));

export function LeaveAddModal({ officers }: { officers: OfficerOption[] }) {
  const router = useRouter();
  const { showToast } = useToast();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const initialForm = {
    officerId: "",
    category: "leave",
    type: "annual",
    startDate: "",
    endDate: "",
    reason: "",
  };

  const [form, setForm] = useState(initialForm);

  const handleOpen = () => {
    setForm(initialForm);
    setError("");
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
    setError("");
  };

   const handleCreate = async (e: React.FormEvent) => {
     e.preventDefault();
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
        const errorMsg = extractApiError(data, "فشل في إنشاء السجل");
        setError(errorMsg);
        return;
       }

       showToast("تم تسجيل السجل بنجاح", "success");
       setOpen(false);
       setForm({ officerId: "", category: "leave", type: "annual", startDate: "", endDate: "", reason: "" });
       router.refresh();
     } catch {
       setError("حدث خطأ في الاتصال");
       showToast("حدث خطأ في الاتصال بالخادم", "error");
     } finally {
       setLoading(false);
     }
   };

  return (
    <>
      <PrimaryHeaderBtn
        label="توثيق سجل جديد"
        icon={<Plus className="w-4 h-4" />}
        onClick={handleOpen}
      />

      {open && (
        <ModalShell
          title="إضافة سجل حركة جديد"
          icon={<Plus className="w-4 h-4" />}
          onClose={handleClose}
          footer={
            <ModalActions
              form="add-leave-form"
              submitText="حفظ السجل"
              submitLoading={loading}
              cancelText="إلغاء"
              onCancel={handleClose}
            />
          }
        >
          {error && (
            <div className="mb-4 rounded-lg bg-(--app-error)/10 border border-(--app-error)/20 p-4 text-(--app-error) font-bold text-sm text-right whitespace-pre-line leading-relaxed">
              {error}
            </div>
          )}

          <form id="add-leave-form" onSubmit={handleCreate} className="space-y-4 text-right">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <CustomSelect
                id="leave-officerId"
                label="الضابط المعني"
                value={form.officerId}
                onChange={(val) => setForm({ ...form, officerId: val })}
                options={officers.map((o) => ({
                  value: o.id,
                  label: `${o.officerLabel || (o.rank ? `${o.rank} / ${o.fullName}` : o.fullName)} (${o.militaryId})`,
                }))}
                placeholder="اختر ضابط من القائمة"
                required
              />
              <div className="space-y-1.5">
                <FormLabel required>الفئة الرئيسية</FormLabel>
                <div className="grid grid-cols-2 gap-2">
                   {["leave", "absence"].map((c) => (
                     <button
                       key={c}
                       type="button"
                       onClick={() => setForm({ ...form, category: c })}
                       className={`py-2 rounded-lg text-xs font-medium border transition-all ${
                         form.category === c
                           ? "bg-(--app-info)/10 border-(--app-info) text-(--app-info)"
                           : "bg-(--app-surface-container) border border-(--app-border) text-(--app-muted-foreground) hover:bg-(--app-surface-container)"
                       }`}
                     >
                       {c === "leave" ? "إجازة رسمية" : "غياب / انقطاع"}
                     </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="space-y-1.5">
              <FormLabel required>نوع الانتداب أو الإجازة</FormLabel>
              <div className="flex flex-wrap gap-2">
                {LEAVE_TYPE_OPTIONS.map((t) => (
                  <button
                    key={t.value}
                    type="button"
                    onClick={() => setForm({ ...form, type: t.value })}
                    className={`px-4 py-2 rounded-lg text-xs font-medium border transition-all ${
                      form.type === t.value
                        ? "bg-(--app-info)/10 border-(--app-info) text-(--app-info)"
                        : "bg-(--app-surface-container) border border-(--app-border) text-(--app-muted-foreground) hover:border-(--app-border)"
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <DateField
                id="startDate"
                label="تاريخ البدء"
                value={form.startDate}
                onChange={(v) => setForm({ ...form, startDate: v })}
                required
              />
              <DateField
                id="endDate"
                label="تاريخ الانتهاء المتوقع"
                value={form.endDate}
                onChange={(v) => setForm({ ...form, endDate: v })}
                required
              />
            </div>

            <div className="space-y-1.5">
              <FormLabel>السبب أو ملاحظات إضافية</FormLabel>
              <FormTextarea
                id="leave-reason"
                value={form.reason}
                onChange={(e) => setForm({ ...form, reason: e.target.value })}
                rows={2}
                placeholder="تفاصيل إضافية حول السجل..."
              />
            </div>
          </form>
        </ModalShell>
      )}
    </>
  );
}
