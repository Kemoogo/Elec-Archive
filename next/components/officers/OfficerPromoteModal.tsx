"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { useToast } from "@/components/ui/toast";
import { ModalActions } from "@/components/ui/modal-actions";
import { ModalShell } from "@/components/ui/modal-shell";
import { DateField } from "@/components/ui/date-field";
import { FormLabel, FormInput, FormTextarea } from "@/components/ui/form-fields";
import { CustomSelect } from "@/components/ui/custom-select";
import { extractApiError } from "@/lib/utils";
import { Award } from "lucide-react";

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
    militaryId?: string;
  };
  trigger?: React.ReactNode;
}

export function OfficerPromoteModal({ officer, trigger }: OfficerPromoteModalProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const { showToast } = useToast();

  const currentIdx = RANK_OPTIONS.findIndex((r) => r.value === officer.rank);
  const availableRanks =
    currentIdx !== -1 && currentIdx < RANK_OPTIONS.length - 1
      ? RANK_OPTIONS.slice(currentIdx + 1)
      : RANK_OPTIONS;
  const defaultNextRank =
    currentIdx !== -1 && currentIdx < RANK_OPTIONS.length - 1
      ? RANK_OPTIONS[currentIdx + 1].value
      : officer.rank;

  const [newRank, setNewRank] = useState(defaultNextRank);
  const [effectiveDate, setEffectiveDate] = useState(new Date().toISOString().split("T")[0]);
  const [orderNumber, setOrderNumber] = useState("");
  const [notes, setNotes] = useState("");
  const router = useRouter();

  const handleOpen = () => {
    setNewRank(defaultNextRank);
    setEffectiveDate(new Date().toISOString().split("T")[0]);
    setOrderNumber("");
    setNotes("");
    setOpen(true);
  };

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
        const errorMsg = extractApiError(data, "فشل تسجيل الترقية");
        throw new Error(errorMsg);
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
      <div onClick={handleOpen} className="cursor-pointer inline-block">
        {trigger}
      </div>
      {open && (
        <ModalShell
          title="تسجيل ترقية"
          icon={<Award className="w-4 h-4" />}
          onClose={() => setOpen(false)}
          footer={
            <ModalActions
              form="officer-promote-form"
              submitText="حفظ الترقية"
              submitLoading={loading}
              cancelText="إلغاء"
              onCancel={() => setOpen(false)}
            />
          }
        >
          <div className="mb-4 p-4 bg-(--color-primary)/5 border border-(--color-primary)/10 shadow-sm rounded-2xl text-right flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-(--app-muted-foreground)">تسجيل ترقية وتحديث رتبة الضابط</p>
              <h4 className="text-sm font-extrabold text-(--color-primary) mt-0.5">{officer.rankLabel || officer.rank} / {officer.fullName}</h4>
            </div>
            {officer.militaryId && (
              <div className="px-3 py-1.5 bg-(--app-surface-container) border border-(--app-border) rounded-xl shadow-sm text-xs font-bold text-(--app-muted-foreground)">
                الرقم العسكري: {officer.militaryId}
              </div>
            )}
          </div>
          <form id="officer-promote-form" onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
              <CustomSelect
                id="promote-rank"
                label="الرتبة الجديدة"
                value={newRank}
                onChange={setNewRank}
                options={availableRanks}
                placeholder="اختر الرتبة..."
                required
              />

              <DateField
                id="effective-date"
                label="تاريخ السريان"
                value={effectiveDate}
                onChange={setEffectiveDate}
                required
              />
            </div>

            <div className="space-y-1.5 text-right">
              <FormLabel htmlFor="order-number">
                رقم الأمر / القرار
              </FormLabel>
              <FormInput
                type="text"
                id="order-number"
                value={orderNumber}
                onChange={(e) => setOrderNumber(e.target.value)}
                placeholder="مثلاً: 123 لسنة 2024"
                focusVariant="blue"
              />
            </div>

            <div className="space-y-1.5 text-right">
              <FormLabel htmlFor="notes">
                ملاحظات إضافية
              </FormLabel>
              <FormTextarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                focusVariant="blue"
              />
            </div>
          </form>
        </ModalShell>
      )}
    </>
  );
}
