"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Save, X, AlertCircle, CalendarRange, History, Loader2, CheckCircle2 } from "lucide-react";

interface LeaveItem {
  id: string;
  officerId: string;
  officerName: string;
  officerMilitaryId: string;
  category: string;
  categoryLabel: string;
  type: string;
  typeLabel: string;
  startDate: string;
  endDate: string;
  reason: string;
  status: string;
  statusLabel: string;
}

interface OfficerOption {
  id: string;
  fullName: string;
  militaryId: string;
}

interface LeaveRegisterProps {
  leaves: LeaveItem[];
  officers: OfficerOption[];
  canEdit: boolean;
}

const LEAVE_TYPE_OPTIONS = [
  { value: "annual", label: "سنوية" },
  { value: "sick", label: "مرضية" },
  { value: "emergency", label: "طارئة" },
  { value: "rest", label: "راحة" },
  { value: "overnight", label: "مبيت" },
  { value: "field", label: "ميدانية" },
  { value: "casual", label: "عارضة" },
];

const STATUS_TRANSITIONS: Record<string, string[]> = {
  draft: ["approved", "cancelled"],
  approved: ["closed", "cancelled"],
};

const STATUS_CONFIG: Record<string, string> = {
  draft: "bg-(--app-surface-container) border border-(--app-border) text-(--app-muted-foreground)",
  approved: "bg-(--app-success)/10 border border-(--app-success)/20 text-(--app-success) font-bold",
  closed: "bg-(--app-surface-container) border border-(--app-border) text-(--app-muted-foreground)/60",
  cancelled: "bg-(--app-error)/10 border border-(--app-error)/20 text-(--app-error)",
};

export function LeaveRegister({ leaves, officers, canEdit }: LeaveRegisterProps) {
  const router = useRouter();
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [statusErrors, setStatusErrors] = useState<Record<string, string>>({});

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
      const res = await fetch("/api/officers/leaves", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setError(data.error || "فشل في إنشاء السجل");
        return;
      }

      setShowForm(false);
      setForm({ officerId: "", category: "leave", type: "annual", startDate: "", endDate: "", reason: "" });
      router.refresh();
    } catch {
      setError("حدث خطأ في الاتصال");
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (leaveId: string, newStatus: string) => {
    setStatusErrors((prev) => ({ ...prev, [leaveId]: "" }));
    try {
      const res = await fetch(`/api/officers/leaves/${leaveId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setStatusErrors((prev) => ({ ...prev, [leaveId]: data.error || "فشل في تحديث الحالة" }));
        return;
      }

      router.refresh();
    } catch {
      setStatusErrors((prev) => ({ ...prev, [leaveId]: "حدث خطأ في الاتصال" }));
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
         <div className="flex items-center gap-3">
           <div className="p-2 bg-(--app-surface-container) border border-(--app-border) rounded-lg">
             <CalendarRange className="h-5 w-5 text-(--color-primary)" />
           </div>
           <h2 className="text-lg font-semibold text-(--color-primary)">سجل الإجازات والغياب</h2>
        </div>
        
        {canEdit && !showForm && (
           <button
             onClick={() => setShowForm(true)}
             className="flex items-center gap-2 btn-primary px-6 py-2.5 rounded-lg font-bold"
           >
             <Plus className="h-4 w-4" />
             توثيق سجل جديد
           </button>
        )}
      </div>

      {showForm && (
        <div className="bg-(--app-surface) border border-(--app-border) rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
               <History className="h-5 w-5 text-(--color-primary)" />
               <h3 className="text-lg font-semibold text-(--color-primary)">إضافة سجل حركة جديد</h3>
            </div>
            <button onClick={() => setShowForm(false)} className="p-2 hover:bg-(--app-surface-container) rounded-full transition-colors">
              <X className="h-5 w-5 text-(--app-muted-foreground)" />
            </button>
          </div>

          {error && (
            <div className="mb-4 rounded-lg bg-(--app-error)/10 border border-(--app-error)/20 p-4 text-(--app-error) flex items-center gap-3">
              <AlertCircle className="h-5 w-5 shrink-0" />
              <p className="text-sm font-bold">{error}</p>
            </div>
          )}

          <form onSubmit={handleCreate} className="space-y-4">
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
                       className={`py-2.5 rounded-lg text-xs font-medium border transition-all ${
                         form.category === c
                           ? "bg-(--color-primary)/20 border-(--color-primary) text-(--color-primary)"
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
                        ? "bg-(--app-surface-container) border border-(--color-primary) text-(--color-primary)"
                        : "bg-(--app-surface-container) border border-(--app-border) text-(--app-muted-foreground) hover:text-(--app-muted-foreground)"
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
                  className="w-full rounded-lg bg-(--app-surface) border border-(--app-border) px-4 py-2.5 text-sm text-(--color-primary) focus:outline-none focus:ring-2 focus:ring-(--color-primary)/20"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-medium text-(--app-muted-foreground) px-1">تاريخ الانتهاء المتوقع *</label>
                <input
                  type="date"
                  value={form.endDate}
                  onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                  required
                  className="w-full rounded-lg bg-(--app-surface) border border-(--app-border) px-4 py-2.5 text-sm text-(--color-primary) focus:outline-none focus:ring-2 focus:ring-(--color-primary)/20"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-medium text-(--app-muted-foreground) px-1">السبب أو ملاحظات إضافية</label>
              <textarea
                value={form.reason}
                onChange={(e) => setForm({ ...form, reason: e.target.value })}
                className="w-full rounded-lg bg-(--app-surface) border border-(--app-border) px-4 py-2.5 text-sm text-(--color-primary) focus:outline-none focus:ring-2 focus:ring-(--color-primary)/20"
                rows={2}
                placeholder="تفاصيل إضافية حول السجل..."
              />
            </div>

            <div className="flex gap-4 pt-4">
              <button
                type="submit"
                disabled={loading}
                className="flex-1 flex items-center justify-center gap-2 btn-primary py-3 rounded-lg font-bold transition-all disabled:opacity-50"
              >
                {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Save className="h-5 w-5" />}
                {loading ? "جاري الحفظ..." : "حفظ السجل"}
              </button>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="px-6 rounded-lg bg-(--app-surface-container) text-(--color-primary) py-3 font-bold border border-(--app-border) hover:bg-(--app-surface-container) transition-all"
              >
                إلغاء
              </button>
            </div>
          </form>
        </div>
      )}

      {leaves.length === 0 ? (
        <div className="rounded-lg bg-(--app-surface) p-8 text-center text-(--app-muted-foreground)">
          لا توجد سجلات مؤرشفة في النظام
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg bg-(--app-surface)">
          <table className="w-full text-right">
            <thead>
              <tr className="border-b border-(--app-border) text-sm text-(--app-muted-foreground)">
                <th className="p-4">الضابط</th>
                <th className="p-4">التصنيف</th>
                <th className="p-4">النوع</th>
                <th className="p-4">الفترة الزمنية</th>
                <th className="p-4">الحالة الإدارية</th>
              </tr>
            </thead>
            <tbody>
              {leaves.map((leave) => (
                <tr key={leave.id} className="border-b border-(--app-border) transition hover:bg-white/10">
                  <td className="p-4">
                     <div className="flex flex-col">
                        <span className="text-(--color-primary) font-medium">{leave.officerName}</span>
                        <span className="text-sm font-mono text-(--app-muted-foreground)">{leave.officerMilitaryId}</span>
                     </div>
                  </td>
                  <td className="p-4">
                     <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium border ${leave.category === "leave" ? "bg-(--color-primary)/10 border-(--color-primary)/20 text-(--color-primary)" : "bg-(--app-error)/10 border-(--app-error)/20 text-(--app-error)"}`}>
                      {leave.categoryLabel}
                     </span>
                  </td>
                  <td className="p-4 text-(--app-muted-foreground)">{leave.typeLabel}</td>
                  <td className="p-4 text-mono text-sm text-(--app-muted-foreground)">
                     <div className="flex items-center gap-2">
                       <span>{new Date(leave.startDate).toLocaleDateString("ar-EG")}</span>
                       <span className="opacity-30">―</span>
                       <span>{new Date(leave.endDate).toLocaleDateString("ar-EG")}</span>
                     </div>
                  </td>
                  <td className="p-4">
                    <div className="flex flex-col">
                      {canEdit && STATUS_TRANSITIONS[leave.status] ? (
                        <div className="relative inline-block w-full max-w-[140px]">
                          <select
                            value={leave.status}
                            onChange={(e) => handleStatusChange(leave.id, e.target.value)}
                            className={`w-full rounded-lg border px-3 py-1.5 text-xs font-medium appearance-none cursor-pointer focus:outline-none ${STATUS_CONFIG[leave.status] || STATUS_CONFIG.draft}`}
                          >
                            <option value={leave.status} className="bg-(--app-surface)">{leave.statusLabel}</option>
                            {STATUS_TRANSITIONS[leave.status].map((s) => (
                              <option key={s} value={s} className="bg-(--app-surface) text-(--color-primary)">
                                {s === "approved" ? "اعتماد السجل" : s === "closed" ? "إغلاق السجل" : "إلغاء السجل"}
                              </option>
                            ))}
                          </select>
                        </div>
                      ) : (
                        <div className={`px-4 py-1.5 rounded-full text-xs font-medium border flex items-center justify-center gap-2 ${STATUS_CONFIG[leave.status] || STATUS_CONFIG.draft}`}>
                          {leave.status === "approved" && <CheckCircle2 className="h-3 w-3" />}
                          {leave.statusLabel}
                        </div>
                      )}
                      {statusErrors[leave.id] && (
                        <p className="mt-1 text-xs text-(--app-error)">{statusErrors[leave.id]}</p>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
