"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ModalShell } from "@/components/ui/modal-shell";
import { ModalActions } from "@/components/ui/modal-actions";
import { PrimaryHeaderBtn } from "@/components/layout/ModernPageHeader";
import { Plus } from "lucide-react";
import { DateField } from "@/components/ui/date-field";
import { FormField, FormInput } from "@/components/ui/form-fields";
import { useToast } from "@/components/ui/toast";
import { extractApiError } from "@/lib/utils";

export function NewMedicineButton() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <PrimaryHeaderBtn
        label="إضافة دواء"
        icon={<Plus className="w-4 h-4" />}
        onClick={() => setIsOpen(true)}
      />
      {isOpen && <NewMedicineModal onClose={() => setIsOpen(false)} />}
    </>
  );
}

export function NewMedicineModal({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const { showToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    name: "",
    unit: "",
    concentration: "",
    quantity: 1,
    expiryDate: new Date().toISOString().split('T')[0],
    minThreshold: 10,
  });

  const handleSubmit = async (e: React.FormEvent, exitAfterSave: boolean) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/medical/medicines", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const data = await res.json();
      if (!data.success) {
        const errorMsg = extractApiError(data, "حدث خطأ أثناء إضافة الدواء");
        setError(errorMsg);
        showToast(errorMsg, "error");
        setLoading(false);
        return;
      }

      showToast("تم إضافة الدواء بنجاح", "success");
      router.refresh();

      if (exitAfterSave) {
        onClose();
      } else {
        setForm({
          name: "",
          unit: "",
          concentration: "",
          quantity: 1,
          expiryDate: new Date().toISOString().split('T')[0],
          minThreshold: 10,
        });
        setLoading(false);
      }
    } catch {
      setError("حدث خطأ في الخادم");
      setLoading(false);
    }
  };

  const footer = (
    <ModalActions className="sm:items-stretch w-full">
      <button
        type="submit"
        form="medicine-form"
        className="btn-primary flex-1 justify-center"
        disabled={loading}
      >
        حفظ وخروج
      </button>
      <button
        type="button"
        onClick={(e) => handleSubmit(e as unknown as React.FormEvent, false)}
        className="btn-secondary flex-1 justify-center"
        disabled={loading}
      >
        حفظ
      </button>
      <button
        type="button"
        onClick={onClose}
        className="btn-secondary flex-1 justify-center border-transparent"
        disabled={loading}
      >
        إلغاء
      </button>
    </ModalActions>
  );

  return (
    <ModalShell
      title={
        <span className="text-base font-semibold text-(--color-primary)">
          إضافة دواء جديد
        </span>
      }
      onClose={onClose}
      overlayClassName="bg-black/40"
      panelClassName="max-h-[85vh] max-w-xl border-(--app-border) shadow-depth-xl"
      bodyClassName="p-6 no-scrollbar"
      footer={footer}
    >
      <form id="medicine-form" onSubmit={(e) => handleSubmit(e, true)} className="space-y-4">
        {error && (
          <div className="p-3 bg-(--app-error)/10 border border-(--app-error)/20 rounded-xl text-(--app-error) text-xs font-bold">
            {error}
          </div>
        )}

        <div className="space-y-4 text-right">
          <FormField label="اسم الدواء" required>
            <FormInput
              id="medicine-name"
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
              placeholder="مثال: باراسيتامول"
            />
          </FormField>

          <div className="grid grid-cols-2 gap-3">
            <FormField label="الوحدة" required>
              <FormInput
                id="medicine-unit"
                type="text"
                value={form.unit}
                onChange={(e) => setForm({ ...form, unit: e.target.value })}
                required
                placeholder="شريط، شراب، أمبول..."
              />
            </FormField>

            <FormField label="التركيز">
              <FormInput
                id="medicine-concentration"
                type="text"
                value={form.concentration}
                onChange={(e) => setForm({ ...form, concentration: e.target.value })}
                placeholder="مثال: 500مج"
              />
            </FormField>
          </div>

          <FormField label="الكمية المضافة" required>
            <FormInput
              id="medicine-quantity"
              type="number"
              min={0}
              value={form.quantity}
              onChange={(e) => setForm({ ...form, quantity: parseInt(e.target.value) || 0 })}
              required
              className="text-center"
            />
          </FormField>

          <div className="grid grid-cols-2 gap-3">
            <DateField
              id="medicine-expiryDate"
              label="تاريخ انتهاء الصلاحية"
              value={form.expiryDate}
              onChange={(v) => setForm({ ...form, expiryDate: v })}
              required
            />

            <FormField label="الحد الأدنى للتنبيه" required>
              <FormInput
                id="medicine-minThreshold"
                type="number"
                min={0}
                value={form.minThreshold}
                onChange={(e) => setForm({ ...form, minThreshold: parseInt(e.target.value) || 0 })}
                required
                className="text-center"
              />
            </FormField>
          </div>
        </div>
      </form>
    </ModalShell>
  );
}
