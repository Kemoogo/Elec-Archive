"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ModalShell } from "@/components/ui/modal-shell";
import { ModalActions } from "@/components/ui/modal-actions";
import { Settings2, AlertTriangle } from "lucide-react";
import { FormLabel, FormInput } from "@/components/ui/form-fields";
import { useToast } from "@/components/ui/toast";
import { extractApiError } from "@/lib/utils";

interface MedicineSummary {
  _id: string;
  name: string;
  unit: string;
  concentration: string;
  quantity: number;
  expiryDate: string;
  minThreshold: number;
}

interface EditMedicineButtonProps {
  medicine: MedicineSummary;
}

export function EditMedicineButton({ medicine }: EditMedicineButtonProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="btn-action-primary"
        title="تعديل البيانات"
      >
        <Settings2 className="w-4 h-4" />
      </button>
      {isOpen && (
        <EditMedicineModal
          medicine={medicine}
          onClose={() => setIsOpen(false)}
        />
      )}
    </>
  );
}

function EditMedicineModal({
  medicine,
  onClose,
}: {
  medicine: MedicineSummary;
  onClose: () => void;
}) {
  const router = useRouter();
  const { showToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    name: medicine.name,
    unit: medicine.unit,
    concentration: medicine.concentration,
    minThreshold: medicine.minThreshold,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch(`/api/medical/medicines/${medicine._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const data = await res.json();
      if (!data.success) {
        const errMsg = extractApiError(data, "حدث خطأ أثناء تحديث البيانات");
        setError(errMsg);
        showToast(errMsg, "error");
        setLoading(false);
        return;
      }

      showToast("تم تحديث بيانات الدواء بنجاح", "success");
      router.refresh();
      onClose();
    } catch {
      setError("حدث خطأ في الخادم");
      setLoading(false);
    }
  };

  const handleConfirmDelete = async () => {
    setShowDeleteConfirm(false);
    setDeleteLoading(true);
    setError("");

    try {
      const res = await fetch(`/api/medical/medicines/${medicine._id}`, {
        method: "DELETE",
      });

      const data = await res.json();
      if (!data.success) {
        const errMsg = extractApiError(data, "حدث خطأ أثناء حذف الدواء (قد يكون مرتبطاً بزيارات مسجلة)");
        setError(errMsg);
        showToast(errMsg, "error");
        setDeleteLoading(false);
        return;
      }

      showToast("تم حذف الدواء بنجاح", "success");
      router.refresh();
      onClose();
    } catch {
      setError("حدث خطأ في الخادم");
      setDeleteLoading(false);
    }
  };

  const footer = (
    <ModalActions
      form="edit-medicine-form"
      submitText="حفظ التعديلات"
      submitLoading={loading}
      submitDisabled={deleteLoading}
      destructiveText="حذف"
      destructiveLoading={deleteLoading}
      destructiveDisabled={loading}
      onDestructive={() => setShowDeleteConfirm(true)}
      onCancel={onClose}
    />
  );

  return (
    <>
      <ModalShell
      title={`تعديل بيانات: ${medicine.name}`}
      icon={<Settings2 className="w-4 h-4" />}
      onClose={onClose}
      overlayClassName="bg-black/40"
      panelClassName="max-h-[85vh] max-w-md border-(--app-border) shadow-depth-xl"
      bodyClassName="p-6 no-scrollbar"
      footer={footer}
    >
      <form id="edit-medicine-form" onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 bg-(--app-error)/10 border border-(--app-error)/20 rounded-xl text-(--app-error) text-xs font-bold">
            {error}
          </div>
        )}

        <div className="space-y-4 text-right">
          <div className="space-y-1.5">
            <FormLabel htmlFor="edit-name" required>اسم الدواء</FormLabel>
            <FormInput
              id="edit-name"
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <FormLabel htmlFor="edit-unit" required>الوحدة</FormLabel>
              <FormInput
                id="edit-unit"
                type="text"
                value={form.unit}
                onChange={(e) => setForm({ ...form, unit: e.target.value })}
                required
              />
            </div>

            <div className="space-y-1.5">
              <FormLabel htmlFor="edit-concentration">التركيز</FormLabel>
              <FormInput
                id="edit-concentration"
                type="text"
                value={form.concentration}
                onChange={(e) => setForm({ ...form, concentration: e.target.value })}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <FormLabel htmlFor="edit-minThreshold" required>الحد الأدنى</FormLabel>
            <FormInput
              id="edit-minThreshold"
              type="number"
              min={0}
              value={form.minThreshold}
              onChange={(e) => setForm({ ...form, minThreshold: parseInt(e.target.value) || 0 })}
              required
              className="text-center"
            />
          </div>
        </div>

        <div className="p-4 bg-(--app-info)/5 rounded-2xl border border-(--app-info)/20 mt-2">
          <p className="text-[10px] text-(--app-info) leading-relaxed font-bold">
            ملاحظة: لتعديل الكمية الحالية أو تاريخ الانتهاء، يرجى استخدام زر التوريد لإضافة شحنات جديدة، أو حذف الدواء وإعادة إدخاله إذا لم يتم استخدامه في أي زيارات بعد.
          </p>
        </div>
      </form>
    </ModalShell>

    {showDeleteConfirm && (
      <ModalShell
        title="تأكيد حذف الدواء"
        icon={<AlertTriangle className="w-4 h-4 text-(--app-error)" />}
        titleVariant="danger"
        onClose={() => setShowDeleteConfirm(false)}
        overlayClassName="bg-black/40"
        panelClassName="max-w-md border-(--app-border) shadow-depth-xl"
        bodyClassName="p-6 space-y-3"
        footer={
          <ModalActions
            submitText="تأكيد الحذف"
            submitVariant="destructive"
            submitLoading={deleteLoading}
            onConfirm={handleConfirmDelete}
            cancelText="إلغاء"
            onCancel={() => setShowDeleteConfirm(false)}
          />
        }
      >
        <div className="text-right space-y-2">
          <p className="text-sm font-bold text-(--app-foreground)">
            هل أنت متأكد من حذف هذا الدواء نهائياً؟
          </p>
          <p className="text-xs font-bold text-(--app-muted-foreground)">
            سيتم حذف الدواء ({medicine.name}) ولا يمكن التراجع عن هذا الإجراء.
          </p>
        </div>
      </ModalShell>
    )}
  </>
  );
}
