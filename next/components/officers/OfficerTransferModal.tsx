"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { useToast } from "@/components/ui/toast";
import { ModalActions } from "@/components/ui/modal-actions";
import { ModalShell } from "@/components/ui/modal-shell";

const STATUS_OPTIONS = [
  { value: "inactive", label: "غير نشط / نقل" },
  { value: "retired", label: "متقاعد / إنهاء خدمة" },
];

export function OfficerTransferModal({ officer, trigger }: { // eslint-disable-next-line @typescript-eslint/no-explicit-any
  officer: any; trigger?: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [newStatus, setNewStatus] = useState("inactive");
  const { showToast } = useToast();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch(`/api/officers/${officer.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ employmentStatus: newStatus }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "فشل تحديث الحالة");
      }

      showToast("تم نقل / إنهاء خدمة الضابط بنجاح", "success");
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
        <ModalShell title="نقل / إنهاء خدمة" onClose={() => setOpen(false)}>
          <div className="mb-4 bg-orange-50 dark:bg-orange-950/20 border border-orange-100 dark:border-orange-900/50 p-3 rounded-2xl text-right">
            <p className="text-xs font-bold text-orange-800 dark:text-orange-200">سيتم تغيير حالة الضابط إلى غير نشط أو متقاعد.</p>
            <p className="text-xs text-orange-600 dark:text-orange-400 mt-1">{officer.rankLabel || officer.rank} / {officer.fullName}</p>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5 text-right">
              <label htmlFor="transfer-status" className="text-xs font-bold text-slate-600 block mr-1">الإجراء <span className="text-red-500">*</span></label>
              <select
                id="transfer-status"
                value={newStatus}
                onChange={(e) => setNewStatus(e.target.value)}
                className="w-full px-3 py-2 bg-(--app-surface) border border-(--app-border) rounded-xl text-sm font-bold text-slate-500 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all appearance-none"
              >
                {STATUS_OPTIONS.map((r) => (
                  <option key={r.value} value={r.value}>{r.label}</option>
                ))}
              </select>
            </div>
            
            <div className="pt-4">
              <ModalActions
                submitText="تأكيد النقل"
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
