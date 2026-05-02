"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { useToast } from "@/components/ui/toast";
import { ModalActions } from "@/components/ui/modal-actions";
import { ModalShell } from "@/components/ui/modal-shell";
import { DateField } from "@/components/ui/date-field";

export function OfficerReturnModal({ officer, trigger }: { // eslint-disable-next-line @typescript-eslint/no-explicit-any
  officer: any; trigger?: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState("");
  
  const { showToast } = useToast();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch(`/api/officers/${officer.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          isInUnit: true,
          movement: {
            action: "return",
            date,
            notes
          }
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "فشل تسجيل العودة");
      }

      showToast("تم تسجيل عودة الضابط للخدمة بنجاح", "success");
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
        <ModalShell title="تسجيل عودة للخدمة" onClose={() => setOpen(false)}>
          <div className="mb-6 bg-cyan-50 border border-cyan-100 p-4 rounded-2xl text-right">
            <p className="text-xs font-bold text-cyan-800">سيتم إعادة الضابط للحالة النشطة وتوثيق تاريخ العودة.</p>
            <p className="text-xs text-cyan-600 mt-1">{officer.rankLabel || officer.rank} / {officer.fullName}</p>
          </div>
          
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* تاريخ العودة */}
            <DateField
              id="return-date"
              label="تاريخ العودة للخدمة"
              value={date}
              onChange={setDate}
              required
            />

            {/* ملاحظات */}
            <div className="space-y-1.5 text-right">
              <label htmlFor="return-notes" className="text-xs font-bold text-(--app-muted-foreground) block mr-1">ملاحظات (اختياري)</label>
              <textarea
                id="return-notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="أية ملاحظات إضافية..."
                className="w-full px-3 py-2 bg-(--app-surface) border border-(--app-border) rounded-xl text-sm font-medium text-(--app-muted-foreground) focus:outline-none focus:ring-cyan-500/20 focus:border-cyan-500 transition-all text-right resize-none h-24"
              />
            </div>
            
            <div className="pt-4">
              <ModalActions
                submitText="تأكيد العودة"
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
