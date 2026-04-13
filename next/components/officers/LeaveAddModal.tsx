"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { ModalShell } from "@/components/ui/modal-shell";
import { ModalActions } from "@/components/ui/modal-actions";
import { PrimaryHeaderBtn } from "@/components/layout/ModernPageHeader";

const LEAVE_TYPE_OPTIONS = [
  { value: "annual", label: "سنوية" },
  { value: "sick", label: "مرضية" },
  { value: "emergency", label: "طارئة" },
  { value: "rest", label: "راحة" },
  { value: "overnight", label: "مبيت" },
  { value: "field", label: "ميدانية" },
  { value: "casual", label: "عارضة" },
];

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function LeaveAddModal({ officers }: { officers: any[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    officerId: "",
    category: "leave",
    type: "annual",
    startDate: "",
    endDate: "",
    reason: "",
  });

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
         setError(data.error || "فشل في إنشاء السجل");
         return;
       }

       setOpen(false);
       setForm({ officerId: "", category: "leave", type: "annual", startDate: "", endDate: "", reason: "" });
       router.refresh();
     } catch {
       setError("حدث خطأ في الاتصال");
     } finally {
       setLoading(false);
     }
   };

  return (
    <>
      <PrimaryHeaderBtn
        label="توثيق سجل جديد"
        icon={<Plus className="w-4 h-4" />}
        onClick={() => setOpen(true)}
      />

      {open && (
        <ModalShell title="إضافة سجل حركة جديد" onClose={() => setOpen(false)}>
          {error && (
            <div className="mb-4 rounded-lg bg-(--app-error)/10 border border-(--app-error)/20 p-4 text-(--app-error) font-bold text-sm text-right">
              {error}
            </div>
          )}

          <form onSubmit={handleCreate} className="space-y-4 text-right">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-xs font-medium text-(--app-muted-foreground) px-1">الضابط المعني *</label>
                <select
                  value={form.officerId}
                  onChange={(e) => setForm({ ...form, officerId: e.target.value })}
                  required
                  className="w-full rounded-lg bg-(--app-surface) border border-(--app-border) px-4 py-2.5 text-sm text-(--color-primary) focus:outline-none focus:ring-2 focus:ring-(--color-primary)/20"
                >
                  <option value="" className="bg-(--app-surface)">اختر ضابط من القائمة</option>
                  {officers.map((o) => (
                    <option key={o.id} value={o.id} className="bg-(--app-surface)">
                      {o.fullName} ({o.militaryId})
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-medium text-(--app-muted-foreground) px-1">الفئة الرئيسية *</label>
                <div className="grid grid-cols-2 gap-2">
                   {["leave", "absence"].map((c) => (
                     <button
                       key={c}
                       type="button"
                       onClick={() => setForm({ ...form, category: c })}
                       className={`py-2 rounded-lg text-xs font-medium border transition-all ${
                         form.category === c
                           ? "bg-blue-50 border-blue-500 text-blue-700"
                           : "bg-(--app-surface-container) border border-(--app-border) text-(--app-muted-foreground) hover:bg-(--app-surface-container)"
                       }`}
                     >
                       {c === "leave" ? "إجازة رسمية" : "غياب / انقطاع"}
                     </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-medium text-(--app-muted-foreground) px-1">نوع الانتداب أو الإجازة *</label>
              <div className="flex flex-wrap gap-2">
                {LEAVE_TYPE_OPTIONS.map((t) => (
                  <button
                    key={t.value}
                    type="button"
                    onClick={() => setForm({ ...form, type: t.value })}
                    className={`px-4 py-2 rounded-lg text-xs font-medium border transition-all ${
                      form.type === t.value
                        ? "bg-blue-50 border border-blue-500 text-blue-700"
                        : "bg-(--app-surface-container) border border-(--app-border) text-(--app-muted-foreground) hover:border-slate-300"
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-xs font-medium text-(--app-muted-foreground) px-1">تاريخ البدء *</label>
                <input
                  type="date"
                  value={form.startDate}
                  onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                  required
                  className="w-full rounded-lg bg-(--app-surface) border border-(--app-border) px-4 py-2 text-sm text-(--color-primary) focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-medium text-(--app-muted-foreground) px-1">تاريخ الانتهاء المتوقع *</label>
                <input
                  type="date"
                  value={form.endDate}
                  onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                  required
                  className="w-full rounded-lg bg-(--app-surface) border border-(--app-border) px-4 py-2 text-sm text-(--color-primary) focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-medium text-(--app-muted-foreground) px-1">السبب أو ملاحظات إضافية</label>
              <textarea
                value={form.reason}
                onChange={(e) => setForm({ ...form, reason: e.target.value })}
                className="w-full rounded-lg bg-(--app-surface) border border-(--app-border) px-4 py-2.5 text-sm text-(--color-primary) focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                rows={2}
                placeholder="تفاصيل إضافية حول السجل..."
              />
            </div>

            <div className="pt-4">
              <ModalActions
                submitText="حفظ السجل"
                submitLoading={loading}
                cancelText="إلغاء"
                onCancel={() => setOpen(false)}
              />
            </div>
          </form>
        </ModalShell>
      )}
    </>
  );
}
