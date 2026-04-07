"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Save, CheckCircle2, AlertCircle, ClipboardList, Info, Loader2 } from "lucide-react";

interface RosterEntry {
  id: string;
  militaryId: string;
  fullName: string;
  rank: string;
  rankLabel: string;
}

interface EntryState {
  officerId: string;
  status: string;
  note: string;
}

interface RollcallSheetProps {
  date: string;
  roster: RosterEntry[];
  existingEntries: { officerId: string; status: string; note?: string }[];
  isDraft: boolean;
}

const STATUS_OPTIONS = [
  { value: "present", label: "حاضر", color: "bg-(--app-success)/10 text-(--app-success) border-(--app-success)/20 active:bg-(--app-success)" },
  { value: "absent", label: "غائب", color: "bg-(--app-error)/10 text-(--app-error) border-(--app-error)/20 active:bg-(--app-error)" },
  { value: "leave", label: "إجازة", color: "bg-(--app-warning)/10 text-(--app-warning) border-(--app-warning)/20 active:bg-(--app-warning)" },
  { value: "mission", label: "مأمورية", color: "bg-(--color-primary)/10 text-(--color-primary) border-(--color-primary)/20 active:bg-(--color-primary)" },
];

const DRAFT_STORAGE_KEY = "rollcall_draft_";

export function RollcallSheet({ date, roster, existingEntries, isDraft }: RollcallSheetProps) {
  const router = useRouter();
  const [entries, setEntries] = useState<Map<string, EntryState>>(() => {
    const map = new Map<string, EntryState>();
    for (const r of roster) {
      const existing = existingEntries.find((e) => e.officerId === r.id);
      map.set(r.id, {
        officerId: r.id,
        status: existing?.status ?? "",
        note: existing?.note ?? "",
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
          setEntries((prev) => {
            const next = new Map(prev);
            for (const entry of parsed) {
              if (next.has(entry.officerId)) {
                next.set(entry.officerId, entry);
              }
            }
            return next;
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
      const res = await fetch("/api/officers/rollcall", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...getPayload(), action: "save_draft" }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setError(data.error || "فشل في حفظ المسودة");
        return;
      }

      setSuccess("تم حفظ المسودة بنجاح");
      localStorage.removeItem(draftKey);
      router.refresh();
    } catch {
      setError("حدث خطأ في الاتصال");
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
      const res = await fetch("/api/officers/rollcall", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...getPayload(), action: "submit" }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setError(data.error || "فشل في تسليم التمام");
        return;
      }

      localStorage.removeItem(draftKey);
      router.refresh();
    } catch {
      setError("حدث خطأ في الاتصال");
    } finally {
      setSubmitting(false);
    }
  };

  const allFilled = Array.from(entries.values()).every((e) => e.status);
  const filledCount = Array.from(entries.values()).filter((e) => e.status).length;
  const progressPercent = (filledCount / roster.length) * 100;

  return (
    <div className="space-y-6">
      <div className="bg-(--app-surface) border border-(--app-border) rounded-xl p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
          <div className="space-y-4 flex-1">
             <div className="flex items-center gap-3">
              <div className="p-2 bg-(--app-surface-container) border border-(--app-border) rounded-lg">
                <ClipboardList className="h-5 w-5 text-(--color-primary)" />
              </div>
              <h2 className="text-lg font-semibold text-(--color-primary)">كشف التمام اليومي</h2>
            </div>
            
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

        <div className="overflow-x-auto rounded-lg bg-(--app-surface)">
          <table className="w-full text-right text-sm">
            <thead>
              <tr className="border-b border-(--app-border) text-sm text-(--app-muted-foreground)">
                <th className="p-4">البيانات العسكرية</th>
                <th className="p-4">الرتبة</th>
                <th className="p-4">الحالة</th>
                <th className="p-4">ملاحظات إضافية</th>
              </tr>
            </thead>
            <tbody>
              {roster.map((officer) => {
                const entry = entries.get(officer.id);
                return (
                  <tr key={officer.id} className="border-b border-(--app-border) transition hover:bg-white/10">
                    <td className="p-4">
                       <div className="flex flex-col">
                          <span className="text-(--color-primary) font-bold">{officer.fullName}</span>
                          <span className="text-xs font-mono text-(--app-muted-foreground)">{officer.militaryId}</span>
                       </div>
                    </td>
                    <td className="p-4">
                       <span className="text-(--app-muted-foreground)">
                        {officer.rankLabel}
                       </span>
                    </td>
                    <td className="p-4">
                      <div className="flex gap-1.5">
                        {STATUS_OPTIONS.map((opt) => (
                          <button
                            key={opt.value}
                            onClick={() => updateEntry(officer.id, "status", opt.value)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                              entry?.status === opt.value
                                ? `${opt.color}`
                                : "bg-(--app-surface-container) border border-(--app-border) text-(--app-muted-foreground) hover:text-(--app-muted-foreground) hover:bg-(--app-surface-container)"
                            }`}
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="relative">
                        <input
                          type="text"
                          value={entry?.note ?? ""}
                          onChange={(e) => updateEntry(officer.id, "note", e.target.value)}
                          placeholder="تنبيهات أو ملاحظات..."
                          className="w-full bg-(--app-surface-container) border border-(--app-border) rounded-lg px-3 py-2 text-xs text-(--color-primary) placeholder:text-(--app-muted-foreground)/30 focus:outline-none focus:ring-2 focus:ring-(--color-primary)/20"
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
      </div>
    </div>
  );
}
