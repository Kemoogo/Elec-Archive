"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Save, CheckCircle2, AlertCircle, Info, Loader2 } from "lucide-react";
import { SectionWrapper } from "@/components/ui/section-wrapper";
import { useToast } from "@/components/ui/toast";
import { extractApiError } from "@/lib/utils";

interface RosterEntry {
  id: string;
  militaryId: string;
  fullName: string;
  rank: string;
  rankLabel: string;
  suggestedStatus?: string;
  reason?: string;
  relatedId?: string;
}

interface EntryState {
  officerId: string;
  status: string;
  note: string;
  wasSuggested?: boolean;
}

interface RollcallSheetProps {
  date: string;
  roster: RosterEntry[];
  existingEntries: { officerId: string; status: string; note?: string }[];
  isDraft: boolean;
}

const STATUS_OPTIONS = [
  { value: "present", label: "داخل الوحدة", color: "bg-emerald-500/10 text-emerald-700 border-emerald-500/20" },
  { value: "daily_mission", label: "مأمورية يومية", color: "bg-blue-500/10 text-blue-700 border-blue-500/20" },
  { value: "clinic", label: "عيادة", color: "bg-teal-500/10 text-teal-700 border-teal-500/20" },
  { value: "leave", label: "إجازة", color: "bg-amber-500/10 text-amber-700 border-amber-500/20" },
  { value: "external_mission", label: "مأمورية خارجية", color: "bg-indigo-500/10 text-indigo-700 border-indigo-500/20" },
  { value: "course", label: "فرقة", color: "bg-purple-500/10 text-purple-700 border-purple-500/20" },
  { value: "rest", label: "راحة", color: "bg-sky-500/10 text-sky-700 border-sky-500/20" },
  { value: "absent", label: "غياب", color: "bg-red-500/10 text-red-700 border-red-500/20" },
  { value: "attached", label: "ملحق", color: "bg-orange-500/10 text-orange-700 border-orange-500/20" },
  { value: "hospital", label: "مستشفى", color: "bg-rose-500/10 text-rose-700 border-rose-500/20" },
  { value: "custom_out", label: "سبب آخر", color: "bg-slate-500/10 text-slate-700 border-slate-500/20" },
];

const DRAFT_STORAGE_KEY = "rollcall_draft_";

export function RollcallSheet({ date, roster, existingEntries, isDraft }: RollcallSheetProps) {
  const router = useRouter();
  const { showToast } = useToast();
  const [entries, setEntries] = useState<Map<string, EntryState>>(() => {
    const map = new Map<string, EntryState>();
    for (const r of roster) {
      const existing = existingEntries.find((e) => e.officerId === r.id);
      
      // If it's a new rollcall (status: "not_found" in parent), use suggestions
      const isNew = existingEntries.length === 0;
      const initialStatus = isNew ? (r.suggestedStatus ?? "") : (existing?.status ?? "");
      const initialNote = isNew ? (r.reason ?? "") : (existing?.note ?? "");

      map.set(r.id, {
        officerId: r.id,
        status: initialStatus,
        note: initialNote,
        wasSuggested: isNew && !!r.suggestedStatus,
      });
    }
    return map;
  });
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const draftKey = `${DRAFT_STORAGE_KEY}${date}`;

  useEffect(() => {
    if (existingEntries.length === 0) {
      const saved = localStorage.getItem(draftKey);
      if (saved) {
        try {
          const parsed = JSON.parse(saved) as EntryState[];
          // نستخدم requestAnimationFrame لنقل تحديث الحالة خارج نطاق الـ Effect المتزامن لتجنب Re-render المتتالي
          requestAnimationFrame(() => {
            setEntries((prev) => {
              const next = new Map(prev);
              for (const entry of parsed) {
                if (next.has(entry.officerId)) {
                  next.set(entry.officerId, entry);
                }
              }
              return next;
            });
          });
        } catch {
        }
      }
    }
  }, [draftKey, existingEntries.length]);

  useEffect(() => {
    const data = Array.from(entries.values());
    localStorage.setItem(draftKey, JSON.stringify(data));
  }, [entries, draftKey]);

  const updateEntry = useCallback((officerId: string, field: "status" | "note", value: string) => {
    setEntries((prev) => {
      const next = new Map(prev);
      const entry = next.get(officerId);
      if (entry) {
        next.set(officerId, { ...entry, [field]: value });
      }
      return next;
    });
  }, []);

  const getPayload = useCallback(() => {
    return {
      date,
      entries: Array.from(entries.values()).map((e) => ({
        officerId: e.officerId,
        status: e.status,
        note: e.note || undefined,
      })),
    };
  }, [date, entries]);

  const handleSaveDraft = async () => {
    setSaving(true);
    setError("");
    setSuccess("");

    try {
      const res = await fetch("/api/arkan-harb/rollcall", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...getPayload(), action: "save_draft" }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        const errorMsg = extractApiError(data, "فشل في حفظ المسودة");
        setError(errorMsg);
        return;
      }

      showToast("تم حفظ المسودة بنجاح", "success");
      setSuccess("تم حفظ المسودة بنجاح");
      localStorage.removeItem(draftKey);
      router.refresh();
    } catch {
      setError("حدث خطأ في الاتصال");
      showToast("حدث خطأ في الاتصال بالخادم", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleSubmit = async () => {
    const allFilled = Array.from(entries.values()).every((e) => e.status);
    if (!allFilled) {
      setError("يجب تحديد حالة كل ضابط قبل التسليم");
      return;
    }

    if (!confirm("هل أنت متأكد من تسليم التمام؟ لن يمكن التعديل بعد التسليم.")) {
      return;
    }

    setSubmitting(true);
    setError("");
    setSuccess("");

    try {
      const res = await fetch("/api/arkan-harb/rollcall", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...getPayload(), action: "submit" }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        const errorMsg = extractApiError(data, "فشل في تسليم التمام");
        setError(errorMsg);
        showToast(errorMsg, "error");
        return;
      }

      showToast("تم تسليم التمام بنجاح", "success");
      localStorage.removeItem(draftKey);
      router.refresh();
    } catch {
      setError("حدث خطأ في الاتصال");
      showToast("حدث خطأ في الاتصال بالخادم", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const allFilled = Array.from(entries.values()).every((e) => e.status);
  const filledCount = Array.from(entries.values()).filter((e) => e.status).length;
  const progressPercent = (filledCount / roster.length) * 100;

  return (
    <div className="space-y-6">
      <SectionWrapper>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
          <div className="space-y-4 flex-1">
            
            <div className="space-y-2">
               <div className="flex items-center justify-between text-xs font-medium text-(--app-muted-foreground) px-1">
                 <span>نسبة الإنجاز</span>
                 <span>{filledCount} من {roster.length} ضابط</span>
               </div>
               <div className="h-2 w-full bg-(--app-surface-container) rounded-full overflow-hidden border border-(--app-border)">
                 <div 
                   className="h-full bg-(--color-primary) transition-all"
                   style={{ width: `${progressPercent}%` }}
                 />
               </div>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
             {existingEntries.length > 0 && isDraft && (
                <div className="px-3 py-1.5 bg-(--app-warning)/10 text-(--app-warning) border border-(--app-warning)/20 text-xs font-medium rounded-full flex items-center gap-2">
                  <Info className="h-3 w-3" />
                  مسودة مؤرشفة
                </div>
             )}
          </div>
        </div>

        {error && (
          <div className="mb-4 rounded-lg bg-(--app-error)/10 border border-(--app-error)/20 p-4 text-(--app-error) flex items-center gap-3">
            <AlertCircle className="h-5 w-5 shrink-0" />
            <p className="text-sm font-bold">{error}</p>
          </div>
        )}
        
        {success && (
          <div className="mb-4 rounded-lg bg-(--app-success)/10 border border-(--app-success)/20 p-4 text-(--app-success) flex items-center gap-3">
            <CheckCircle2 className="h-5 w-5 shrink-0" />
            <p className="text-sm font-bold">{success}</p>
          </div>
        )}

        <div className="overflow-x-auto rounded-2xl border border-(--app-border) bg-(--app-surface)">
          <table className="w-full text-right text-sm">
            <thead className="bg-(--color-primary) dark:bg-(--color-primary)/10 text-white dark:text-(--color-primary) border-b border-(--app-border) text-xs font-bold">
              <tr>
                <th className="px-4 py-3 text-center w-10">م</th>
                <th className="px-5 py-3 text-center w-28">الرتبة</th>
                <th className="px-5 py-3 text-right">الاسم والبيانات العسكرية</th>
                <th className="px-5 py-3 text-center">التمام والموقع الحقيقي</th>
                <th className="px-5 py-3 text-right">ملاحظات وتفاصيل التمام</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-(--app-border)/40">
              {roster.map((officer, index) => {
                const entry = entries.get(officer.id);
                return (
                  <tr key={officer.id} className="border-b border-(--app-border)/40 transition hover:bg-(--app-surface-container)">
                    <td className="px-4 py-3 text-center font-mono text-xs font-bold text-(--app-muted-foreground)">
                      {index + 1}
                    </td>
                    <td className="px-5 py-3 text-center">
                       <span className="text-xs font-extrabold text-(--app-muted-foreground)">
                        {officer.rankLabel}
                       </span>
                    </td>
                    <td className="px-5 py-3">
                       <div className="flex flex-col text-right">
                          <span className="text-sm font-extrabold text-(--app-foreground)">{officer.fullName}</span>
                          <span className="text-xs font-mono text-(--app-muted-foreground)">عسكري: #{officer.militaryId}</span>
                       </div>
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex flex-col items-center gap-1">
                        <div className="flex gap-1.5 flex-wrap justify-center">
                          {STATUS_OPTIONS.map((opt) => (
                            <button
                              key={opt.value}
                              onClick={() => updateEntry(officer.id, "status", opt.value)}
                              className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                                entry?.status === opt.value
                                  ? `${opt.color} shadow-xs`
                                  : "bg-(--app-surface-container) border border-(--app-border) text-(--app-muted-foreground) hover:text-(--color-primary) hover:bg-(--app-surface)"
                              }`}
                            >
                              {opt.label}
                            </button>
                          ))}
                        </div>
                        {entry?.wasSuggested && officer.reason && (
                          <div className="flex items-center gap-1.5 text-[10px] font-medium text-(--app-success) mt-1 px-1">
                            <div className="w-1.5 h-1.5 rounded-full bg-(--app-success) animate-pulse" />
                            <span>اقتراح ذكي: {officer.reason}</span>
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="relative">
                        <input
                          type="text"
                          value={entry?.note ?? ""}
                          onChange={(e) => updateEntry(officer.id, "note", e.target.value)}
                          placeholder="تنبيهات أو ملاحظات..."
                          className="w-full bg-(--app-surface-container) border border-(--app-border) rounded-lg px-3 py-2 text-xs text-(--color-primary) placeholder:text-(--app-muted-foreground)/30 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                        />
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="flex flex-col md:flex-row gap-4 mt-6 border-t border-(--app-border) pt-6">
          <button
            onClick={handleSaveDraft}
            disabled={saving}
            className="flex-1 flex items-center justify-center gap-2 btn-secondary py-3 rounded-lg font-bold border border-(--app-border) hover:bg-(--app-surface-container) transition-all disabled:opacity-50"
          >
            {saving ? <Loader2 className="h-5 w-5 animate-spin" /> : <Save className="h-5 w-5" />}
            {saving ? "جاري الحفظ..." : "حفظ مسودة مؤقتة"}
          </button>
          
          <button
            onClick={handleSubmit}
            disabled={submitting || !allFilled}
            className="flex-1 flex items-center justify-center gap-2 btn-primary py-3 rounded-lg font-bold transition-all disabled:opacity-50"
          >
            {submitting ? <Loader2 className="h-5 w-5 animate-spin" /> : <CheckCircle2 className="h-5 w-5" />}
            {submitting ? "جاري التسليم..." : "تسليم التمام النهائي"}
          </button>
        </div>
      </SectionWrapper>
    </div>
  );
}
