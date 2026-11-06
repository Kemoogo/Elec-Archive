"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { useToast } from "@/components/ui/toast";
import { ModalActions } from "@/components/ui/modal-actions";
import { ModalShell, ModalHeaderCard, ModalBadge } from "@/components/ui/modal-shell";
import { DateField } from "@/components/ui/date-field";
import { FormLabel, FormTextarea } from "@/components/ui/form-fields";
import { extractApiError } from "@/lib/utils";
import { RotateCcw, User } from "lucide-react";

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

  const handleOpen = () => {
    setDate(new Date().toISOString().split("T")[0]);
    setNotes("");
    setOpen(true);
  };

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
      <div onClick={handleOpen} className="cursor-pointer inline-block">
        {trigger}
      </div>
      {open && (
        <ModalShell
          title="تسجيل عودة للخدمة"
          icon={<RotateCcw className="w-4 h-4" />}
          onClose={() => setOpen(false)}
          footer={
            <ModalActions
              form="officer-return-form"
              submitText="تأكيد العودة"
              submitLoading={loading}
              cancelText="إلغاء"
              onCancel={() => setOpen(false)}
            />
          }
        >
          <ModalHeaderCard
            icon={<User className="w-5 h-5" />}
            title={`${officer.rankLabel || officer.rank} / ${officer.fullName}`}
            subtitle="سيتم إعادة الضابط للحالة النشطة وتوثيق تاريخ العودة للخدمة."
            badge={
              officer.militaryId ? (
                <ModalBadge>
                  الرقم العسكري: {officer.militaryId}
                </ModalBadge>
              ) : undefined
            }
          />
          
          <form id="officer-return-form" onSubmit={handleSubmit} className="space-y-5">
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
                focusVariant="blue"
                className="h-24"
              />
            </div>
          </form>
        </ModalShell>
      )}
    </>
  );
}
