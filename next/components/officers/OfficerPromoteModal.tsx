"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { useToast } from "@/components/ui/toast";
import { ModalActions } from "@/components/ui/modal-actions";
import { ModalShell } from "@/components/ui/modal-shell";

const RANK_OPTIONS = [
  { value: "second_lieutenant", label: "ملازم" },
  { value: "first_lieutenant", label: "ملازم أول" },
  { value: "captain", label: "نقيب" },
  { value: "major", label: "رائد" },
  { value: "lieutenant_colonel", label: "مقدم" },
  { value: "colonel", label: "عقيد" },
  { value: "brigadier", label: "عميد" },
  { value: "major_general", label: "لواء" },
];

export interface OfficerPromoteModalProps {
  officer: {
    id: string;
    fullName: string;
    rank: string;
    rankLabel?: string;
  };
  trigger?: React.ReactNode;
}

export function OfficerPromoteModal({ officer, trigger }: OfficerPromoteModalProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const { showToast } = useToast();
  const [newRank, setNewRank] = useState(() => {
    const currentIdx = RANK_OPTIONS.findIndex((r) => r.value === officer.rank);
    if (currentIdx !== -1 && currentIdx < RANK_OPTIONS.length - 1) {
      return RANK_OPTIONS[currentIdx + 1].value;
    }
    return officer.rank;
  });
  const [effectiveDate, setEffectiveDate] = useState(new Date().toISOString().split("T")[0]);
  const [orderNumber, setOrderNumber] = useState("");
  const [notes, setNotes] = useState("");
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch("/api/arkan-harb/promotions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          officerId: officer.id,
          fromRank: officer.rank,
          toRank: newRank,
          effectiveDate,
          orderNumber: orderNumber || undefined,
          notes: notes || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "فشل تسجيل الترقية");
      }

      showToast("تم تسجيل الترقية بنجاح", "success");
      setOpen(false);
      router.refresh();
    } catch (err: unknown) {
      showToast((err as Error).message || "حدث خطأ غير متوقع", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div onClick={() => setOpen(true)} className="cursor-pointer inline-block">
        {trigger}
      </div>
      {open && (
        <ModalShell title="تسجيل ترقية" onClose={() => setOpen(false)}>
          <div className="mb-4 bg-amber-50 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/50 p-4 rounded-2xl text-right">
            <p className="text-sm font-bold text-amber-800 dark:text-amber-200">
              تسجيل ترقية جديدة للضابط وتحديث الرتبة الحالية.
            </p>
            <p className="text-sm text-amber-600 dark:text-amber-400 mt-1">
              {officer.rankLabel || officer.rank} / {officer.fullName}
            </p>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5 text-right">
                <label htmlFor="promote-rank" className="text-xs font-bold text-slate-600 block mr-1">
                  الرتبة الجديدة <span className="text-red-500">*</span>
                </label>
                <select
                  id="promote-rank"
                  value={newRank}
                  onChange={(e) => setNewRank(e.target.value)}
                  className="w-full px-3 py-2 bg-(--app-surface) border border-(--app-border) rounded-xl text-sm font-bold text-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all appearance-none"
                  required
                >
                  {RANK_OPTIONS.map((r) => (
                    <option key={r.value} value={r.value}>
                      {r.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5 text-right">
                <label htmlFor="effective-date" className="text-xs font-bold text-slate-600 block mr-1">
                  تاريخ السريان <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  id="effective-date"
                  value={effectiveDate}
                  onChange={(e) => setEffectiveDate(e.target.value)}
                  className="w-full px-3 py-2 bg-(--app-surface) border border-(--app-border) rounded-xl text-sm font-bold text-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all"
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5 text-right">
              <label htmlFor="order-number" className="text-xs font-bold text-slate-600 block mr-1">
                رقم الأمر / القرار
              </label>
              <input
                type="text"
                id="order-number"
                value={orderNumber}
                onChange={(e) => setOrderNumber(e.target.value)}
                placeholder="مثلاً: 123 لسنة 2024"
                className="w-full px-3 py-2 bg-(--app-surface) border border-(--app-border) rounded-xl text-sm font-bold text-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all text-right"
              />
            </div>

            <div className="space-y-1.5 text-right">
              <label htmlFor="notes" className="text-xs font-bold text-slate-600 block mr-1">
                ملاحظات إضافية
              </label>
              <textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                className="w-full px-3 py-2 bg-(--app-surface) border border-(--app-border) rounded-xl text-sm font-bold text-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all text-right resize-none"
              />
            </div>

            <div className="pt-2">
              <ModalActions
                submitText="حفظ الترقية"
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
