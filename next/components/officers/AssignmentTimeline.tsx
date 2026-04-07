"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { History, Plus, Save, X, AlertCircle, Briefcase, Award, Plane, Calendar, CheckCircle2, Clock, XCircle, LucideIcon } from "lucide-react";

interface AssignmentItem {
  id: string;
  type: string;
  typeLabel: string;
  title: string;
  description: string;
  effectiveDate: string;
  endDate: string;
  status: string;
  statusLabel: string;
}

interface AssignmentTimelineProps {
  assignments: AssignmentItem[];
  officerId: string;
  canEdit: boolean;
}

const TYPE_OPTIONS = [
  { value: "assignment", label: "تكليف", icon: Briefcase },
  { value: "promotion", label: "ترقية", icon: Award },
  { value: "mission", label: "مأمورية", icon: Plane },
];

const STATUS_CONFIG: Record<string, { color: string, icon: LucideIcon }> = {
  scheduled: { color: "bg-(--color-primary)/10 text-(--color-primary) border-(--color-primary)/20", icon: Clock },
  active: { color: "bg-(--app-success)/10 text-(--app-success) border-(--app-success)/20", icon: CheckCircle2 },
  completed: { color: "bg-(--app-surface-container) text-(--app-muted-foreground) border-(--app-border)", icon: CheckCircle2 },
  cancelled: { color: "bg-(--app-error)/10 text-(--app-error) border-(--app-error)/20", icon: XCircle },
};

export function AssignmentTimeline({ assignments, officerId, canEdit }: AssignmentTimelineProps) {
  const router = useRouter();
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    type: "assignment",
    title: "",
    description: "",
    effectiveDate: "",
    endDate: "",
  });

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/officers/assignments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, officerId }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setError(data.error || "فشل في إنشاء السجل");
        return;
      }

      setShowForm(false);
      setForm({ type: "assignment", title: "", description: "", effectiveDate: "", endDate: "" });
      router.refresh();
    } catch {
      setError("حدث خطأ في الاتصال");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-(--app-surface) border border-(--app-border) rounded-xl p-6">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-(--app-surface-container) border border-(--app-border) rounded-lg">
            <History className="h-5 w-5 text-(--color-primary)" />
          </div>
          <h2 className="text-lg font-semibold text-(--color-primary)">السجل المهني</h2>
        </div>
        
        {canEdit && !showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 bg-(--app-surface-container) text-(--color-primary) border border-(--app-border) px-4 py-2 rounded-lg font-bold text-sm hover:bg-(--app-surface-container)"
          >
            <Plus className="h-4 w-4" />
            إضافة سجل
          </button>
        )}
      </div>

      {showForm && (
        <div className="mb-6 rounded-lg bg-(--app-surface-container) border border-(--app-border) p-4">
          <div className="flex items-center justify-between mb-4">
             <h3 className="text-lg font-semibold text-(--color-primary)">توثيق سجل جديد</h3>
             <button onClick={() => setShowForm(false)} className="text-(--app-muted-foreground) hover:text-(--color-primary) p-1 transition-colors">
               <X className="h-5 w-5" />
             </button>
          </div>
          
          {error && (
            <div className="mb-4 rounded-lg bg-(--app-error)/10 border border-(--app-error)/20 p-4 text-(--app-error) flex items-center gap-3">
              <AlertCircle className="h-5 w-5 shrink-0" />
              <p className="text-sm font-bold">{error}</p>
            </div>
          )}

          <form onSubmit={handleCreate} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-xs font-medium text-(--app-muted-foreground) px-1">النوع *</label>
                <select
                  value={form.type}
                  onChange={(e) => setForm({ ...form, type: e.target.value })}
                  className="w-full rounded-lg bg-(--app-surface) border border-(--app-border) px-4 py-2.5 text-sm text-(--color-primary) focus:outline-none focus:ring-2 focus:ring-(--color-primary)/20"
                >
                  {TYPE_OPTIONS.map((t) => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-medium text-(--app-muted-foreground) px-1">العنوان *</label>
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  required
                  placeholder="مثال: ترقية استثنائية"
                  className="w-full rounded-lg bg-(--app-surface) border border-(--app-border) px-4 py-2.5 text-sm text-(--color-primary) focus:outline-none focus:ring-2 focus:ring-(--color-primary)/20"
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <label className="text-xs font-medium text-(--app-muted-foreground) px-1">التفاصيل والوصف</label>
              <textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                className="w-full rounded-lg bg-(--app-surface) border border-(--app-border) px-4 py-2.5 text-sm text-(--color-primary) focus:outline-none focus:ring-2 focus:ring-(--color-primary)/20"
                rows={2}
                placeholder="تفاصيل إضافية حول السجل..."
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-xs font-medium text-(--app-muted-foreground) px-1">تاريخ السريان *</label>
                <input
                  type="date"
                  value={form.effectiveDate}
                  onChange={(e) => setForm({ ...form, effectiveDate: e.target.value })}
                  required
                  className="w-full rounded-lg bg-(--app-surface) border border-(--app-border) px-4 py-2.5 text-sm text-(--color-primary) focus:outline-none focus:ring-2 focus:ring-(--color-primary)/20"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-medium text-(--app-muted-foreground) px-1">تاريخ الانتهاء</label>
                <input
                  type="date"
                  value={form.endDate}
                  onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                  className="w-full rounded-lg bg-(--app-surface) border border-(--app-border) px-4 py-2.5 text-sm text-(--color-primary) focus:outline-none focus:ring-2 focus:ring-(--color-primary)/20"
                />
              </div>
            </div>

            <div className="flex gap-4 pt-2">
              <button
                type="submit"
                disabled={loading}
                className="flex-1 flex items-center justify-center gap-2 btn-primary py-3 rounded-lg font-bold transition-all disabled:opacity-50"
              >
                {loading ? <Clock className="h-5 w-5 animate-spin" /> : <Save className="h-5 w-5" />}
                {loading ? "جاري الحفظ..." : "توثيق السجل"}
              </button>
            </div>
          </form>
        </div>
      )}

      {assignments.length === 0 ? (
        <div className="text-center py-8 bg-(--app-surface-container) rounded-lg border border-dashed border-(--app-border)">
          <Clock className="h-12 w-12 text-(--app-muted-foreground)/20 mx-auto mb-4" />
          <p className="text-(--app-muted-foreground) font-bold">لا يوجد سجل تاريخي متوفر</p>
        </div>
      ) : (
        <div className="relative space-y-4 pr-4 border-r border-(--app-border)">
          {assignments.map((a) => {
            const status = STATUS_CONFIG[a.status] || STATUS_CONFIG.completed;
            const typeOption = TYPE_OPTIONS.find(t => t.value === a.type) || TYPE_OPTIONS[0];
            const TypeIcon = typeOption.icon;
            const StatusIcon = status.icon;

            return (
              <div key={a.id} className="relative group pr-4">
                <div className="absolute top-1 -right-[11px] h-4 w-4 rounded-full bg-(--color-primary) border-2 border-(--app-surface)" />
                
                <div className="bg-(--app-surface-container) border border-(--app-border) rounded-lg p-4 transition-all group-hover:bg-(--app-surface-container)">
                  <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                    <div className="space-y-3 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="p-1 px-2.5 bg-(--app-surface-container) rounded-lg text-(--color-primary) text-xs font-medium flex items-center gap-1.5 border border-(--app-border)">
                          <TypeIcon className="h-3 w-3" />
                          {a.typeLabel}
                        </span>
                        <span className={`px-2.5 py-1 rounded-lg text-xs font-medium border flex items-center gap-1.5 ${status.color}`}>
                          <StatusIcon className="h-3 w-3" />
                          {a.statusLabel}
                        </span>
                      </div>
                      
                      <div className="space-y-1">
                        <h4 className="text-base font-semibold text-(--color-primary)">{a.title}</h4>
                        {a.description && (
                          <p className="text-sm text-(--app-muted-foreground) leading-relaxed max-w-2xl">{a.description}</p>
                        )}
                      </div>
                    </div>

                    <div className="text-left shrink-0">
                      <div className="flex items-center gap-2 text-(--app-muted-foreground) font-mono text-xs bg-(--app-surface-container) px-3 py-1.5 rounded-lg border border-(--app-border)">
                        <Calendar className="h-3 w-3" />
                        <span>{new Date(a.effectiveDate).toLocaleDateString("ar-EG")}</span>
                        {a.endDate && (
                          <>
                            <span className="opacity-30">―</span>
                            <span>{new Date(a.endDate).toLocaleDateString("ar-EG")}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
