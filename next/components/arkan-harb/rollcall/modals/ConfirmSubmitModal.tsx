import React from "react";
import { Send } from "lucide-react";
import { ModalShell } from "@/components/ui/modal-shell";
import { ModalActions } from "@/components/ui/modal-actions";

interface ConfirmSubmitModalProps {
  isOpen: boolean;
  submitting: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export function ConfirmSubmitModal({
  isOpen,
  submitting,
  onClose,
  onConfirm,
}: ConfirmSubmitModalProps) {
  if (!isOpen) return null;

  return (
    <ModalShell
      title="تأكيد تسليم التمام النهائي"
      icon={<Send className="w-4 h-4 text-(--color-primary)" />}
      onClose={onClose}
      overlayClassName="bg-black/40"
      panelClassName="max-w-md border-(--app-border) shadow-depth-xl"
      bodyClassName="p-5 space-y-3 text-right"
      footer={
        <ModalActions
          submitText="تأكيد التسليم النهائي"
          submitVariant="primary"
          submitLoading={submitting}
          onCancel={onClose}
          onConfirm={onConfirm}
        />
      }
    >
      <p className="text-sm font-bold text-(--app-foreground) leading-relaxed">
        هل أنت متأكد من اعتماد وتسليم التمام النهائي لهذا اليوم؟
      </p>
      <p className="text-xs text-(--app-muted-foreground) leading-relaxed">
        عند الاعتماد، سيتم قفل السجلات ومنع التعديل المباشر، ولن يمكن استئناف التعديل إلا بإعادة فتح التمام بواسطة مسؤول النظام (Admin).
      </p>
    </ModalShell>
  );
}
