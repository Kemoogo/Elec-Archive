import React from "react";
import { Unlock } from "lucide-react";
import { ModalShell } from "@/components/ui/modal-shell";
import { ModalActions } from "@/components/ui/modal-actions";

interface ConfirmReopenModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export function ConfirmReopenModal({
  isOpen,
  onClose,
  onConfirm,
}: ConfirmReopenModalProps) {
  if (!isOpen) return null;

  return (
    <ModalShell
      title="تأكيد إعادة فتح كشف التمام"
      icon={<Unlock className="w-4 h-4 text-(--color-primary)" />}
      onClose={onClose}
      overlayClassName="bg-black/40"
      panelClassName="max-w-md border-(--app-border) shadow-depth-xl"
      bodyClassName="p-5 space-y-3 text-right"
      footer={
        <ModalActions
          submitText="إعادة الفتح للتعديل"
          submitVariant="primary"
          onCancel={onClose}
          onConfirm={onConfirm}
        />
      }
    >
      <p className="text-sm font-bold text-(--app-foreground) leading-relaxed">
        هل أنت متأكد من إعادة فتح كشف التمام المعتمد للتعديل؟
      </p>
      <p className="text-xs text-(--app-muted-foreground) leading-relaxed">
        سيتم إعادة تحويل حالة التمام إلى مسودة قابلة للتعديل وتحديث الملاحظات قبل إعادة اعتماده مجدداً.
      </p>
    </ModalShell>
  );
}
