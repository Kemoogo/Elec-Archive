"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ModalShell } from "@/components/ui/modal-shell";
import { ModalActions } from "@/components/ui/modal-actions";
import { PackagePlus } from "lucide-react";
import { useToast } from "@/components/ui/toast";
import { DateField } from "@/components/ui/date-field";
import { FormLabel, FormInput } from "@/components/ui/form-fields";
import { extractApiError } from "@/lib/utils";

interface RestockButtonProps {
  medicineId: string;
  medicineName: string;
}

export function RestockButton({ medicineId, medicineName }: RestockButtonProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="btn-action-success"
        title="توريد شحنة جديدة"
      >
        <PackagePlus className="w-4 h-4" />
      </button>
      {isOpen && (
        <RestockModal
          medicineId={medicineId}
          medicineName={medicineName}
          onClose={() => setIsOpen(false)}
        />
      )}
    </>
  );
}

function RestockModal({
  medicineId,
  medicineName,
  onClose,
}: {
  medicineId: string;
  medicineName: string;
  onClose: () => void;
}) {
  const router = useRouter();
  const { showToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    quantity: 1,
    expiryDate: new Date().toISOString().split("T")[0],
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate expiry date is in the future
    const expiry = new Date(form.expiryDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (expiry < today) {
      setError("تاريخ انتهاء الصلاحية يجب أن يكون في المستقبل");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/medical/medicines/restock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          medicineId,
          ...form,
        }),
      });

      const data = await res.json();
      if (!data.success) {
        const errMsg = extractApiError(data, "حدث خطأ أثناء توريد الكمية");
        setError(errMsg);
        showToast(errMsg, "error");
        setLoading(false);
        return;
      }

      showToast("تم توريد الكمية بنجاح", "success");
      router.refresh();
      onClose();
    } catch {
      setError("حدث خطأ في الخادم");
      setLoading(false);
    }
  };

  const footer = (
    <ModalActions className="sm:items-stretch w-full">
      <button
        type="submit"
        form="restock-form"
        className="btn-primary"
        disabled={loading}
      >
        {loading ? "جاري الحفظ..." : "حفظ التوريد"}
      </button>
      <button
        type="button"
        onClick={onClose}
        className="btn-secondary"
        disabled={loading}
      >
        إلغاء
      </button>
    </ModalActions>
  );

  return (
    <ModalShell
      title={`توريد ${medicineName}`}
      icon={<PackagePlus className="w-4 h-4" />}
      onClose={onClose}
      overlayClassName="bg-black/40"
      panelClassName="max-h-[85vh] max-w-sm border-(--app-border) shadow-depth-xl"
      bodyClassName="p-6 no-scrollbar"
      footer={footer}
    >
      <form id="restock-form" onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 bg-(--app-error)/10 border border-(--app-error)/20 rounded-xl text-(--app-error) text-xs font-bold">
            {error}
          </div>
        )}

        <div className="space-y-4 text-right">
          <div className="flex items-center justify-between gap-3">
            <FormLabel htmlFor="restock-quantity" required className="shrink-0">
              الكمية المضافة
            </FormLabel>
            <FormInput
              id="restock-quantity"
              type="number"
              min={1}
              value={form.quantity}
              onChange={(e) => setForm({ ...form, quantity: parseInt(e.target.value) || 1 })}
              required
              className="w-48 text-center"
            />
          </div>

          <div className="flex items-center justify-between gap-3">
            <DateField
              id="restock-expiryDate"
              label="تاريخ الصلاحية"
              value={form.expiryDate}
              onChange={(v) => setForm({ ...form, expiryDate: v })}
              required
              className="!flex !flex-row !items-center !justify-between !space-y-0 gap-3"
              containerClassName="w-48"
            />
          </div>
        </div>
      </form>
    </ModalShell>
  );
}
