"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { useToast } from "@/components/ui/toast";
import { ModalActions } from "@/components/ui/modal-actions";
import { ModalShell } from "@/components/ui/modal-shell";
import { DateField } from "@/components/ui/date-field";
import { FormLabel, FormTextarea } from "@/components/ui/form-fields";
import { extractApiError } from "@/lib/utils";
import { RotateCcw } from "lucide-react";

interface OfficerSummary {
  id: string;
  rank: string;
  rankLabel: string;
  fullName: string;
  militaryId?: string;
}

export function OfficerReturnModal({ officer, trigger }: { officer: OfficerSummary; trigger?: React.ReactNode }) {
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
        const errorMsg = extractApiError(data, "فشل تسجيل العودة");
        throw new Error(errorMsg);
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
        <ModalShell
          title="تسجيل عودة للخدمة"
          icon={<RotateCcw className="w-4 h-4" />}
          onClose={() => setOpen(false)}
        >
          <div className="mb-6 p-4 bg-(--color-primary)/5 border border-(--color-primary)/10 shadow-sm rounded-2xl text-right flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-(--app-muted-foreground)">سيتم إعادة الضابط للحالة النشطة وتوثيق تاريخ العودة للخدمة.</p>
              <h4 className="text-sm font-extrabold text-(--color-primary) mt-0.5">{officer.rankLabel || officer.rank} / {officer.fullName}</h4>
            </div>
            {officer.militaryId && (
              <div className="px-3 py-1.5 bg-(--app-surface-container) border border-(--app-border) rounded-xl shadow-sm text-xs font-bold text-(--app-muted-foreground)">
                الرقم العسكري: {officer.militaryId}
              </div>
            )}
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
              <FormLabel htmlFor="return-notes">ملاحظات (اختياري)</FormLabel>
              <FormTextarea
                id="return-notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="أية ملاحظات إضافية..."
                focusVariant="cyan"
                className="h-24"
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
