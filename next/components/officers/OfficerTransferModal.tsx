"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { useToast } from "@/components/ui/toast";
import { ModalActions } from "@/components/ui/modal-actions";
import { ModalShell } from "@/components/ui/modal-shell";
import { DateField } from "@/components/ui/date-field";
import { FormLabel, FormSelect, FormTextarea } from "@/components/ui/form-fields";
import { extractApiError } from "@/lib/utils";

import { 
  MOVEMENT_LABELS, 
  MOVEMENT_TYPES, 
  type MovementType 
} from "@/lib/db/models/ServiceHistory.shared";

const MOVEMENT_OPTIONS = MOVEMENT_TYPES
  .filter(t => t !== 'join' && t !== 'return')
  .map(t => ({ value: t, label: MOVEMENT_LABELS[t] }));

interface OfficerSummary {
  id: string;
  rank: string;
  rankLabel: string;
  fullName: string;
}

export function OfficerTransferModal({ officer, trigger }: { officer: OfficerSummary; trigger?: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [action, setAction] = useState<MovementType>("transfer");
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
          isInUnit: false,
          movement: {
            action,
            date,
            notes
          }
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        const errorMsg = extractApiError(data, "فشل تسجيل الحركة");
        throw new Error(errorMsg);
      }

      showToast("تم تسجيل حركة مغادرة الضابط بنجاح", "success");
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
        <ModalShell title="تسجيل مغادرة / إنهاء خدمة" onClose={() => setOpen(false)}>
          <div className="mb-6 bg-(--app-warning)/10 border border-(--app-warning)/20 p-4 rounded-2xl text-right">
            <p className="text-xs font-bold text-(--app-warning)">سيتم تسجيل الضابط كخارج الوحدة وتوثيق السبب في السجل المهني.</p>
            <p className="text-xs text-(--app-warning) mt-1">{officer.rankLabel || officer.rank} / {officer.fullName}</p>
          </div>
          
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
              {/* تاريخ الحركة */}
              <DateField
                id="movement-date"
                label="تاريخ الحركة"
                value={date}
                onChange={setDate}
                required
              />

              {/* نوع الإجراء */}
              <div className="space-y-1.5 text-right">
                <FormLabel htmlFor="transfer-status" required>نوع الإجراء</FormLabel>
                <FormSelect
                  id="transfer-status"
                  value={action}
                  onChange={(e) => setAction(e.target.value as MovementType)}
                  focusVariant="orange"
                >
                  {MOVEMENT_OPTIONS.map((r) => (
                    <option key={r.value} value={r.value}>{r.label}</option>
                  ))}
                </FormSelect>
              </div>
            </div>

            {/* ملاحظات / السبب */}
            <div className="space-y-1.5 text-right">
              <FormLabel htmlFor="movement-notes">ملاحظات إضافية (اختياري)</FormLabel>
              <FormTextarea
                id="movement-notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="تفاصيل إضافية حول سبب الحركة..."
                focusVariant="orange"
                className="h-24"
              />
            </div>
            
            <div className="pt-4">
              <ModalActions
                submitText="تأكيد وتسجيل"
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
