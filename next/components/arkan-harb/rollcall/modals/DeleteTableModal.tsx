import React from "react";
import { Trash2 } from "lucide-react";
import { ModalShell } from "@/components/ui/modal-shell";
import { ModalActions } from "@/components/ui/modal-actions";

interface DeleteTableModalProps {
  tableName: string;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export function DeleteTableModal({
  tableName,
  isOpen,
  onClose,
  onConfirm,
}: DeleteTableModalProps) {
  if (!isOpen) return null;

  return (
    <ModalShell
      title={`تأكيد حذف ${tableName}`}
      titleVariant="danger"
      icon={<Trash2 className="w-4 h-4 text-(--app-error)" />}
      onClose={onClose}
      overlayClassName="bg-black/40"
      panelClassName="max-w-md border-(--app-border) shadow-depth-xl"
      bodyClassName="p-5 space-y-3 text-right"
      footer={
        <ModalActions
          submitText="حذف الجدول"
          submitVariant="destructive"
          onCancel={onClose}
          onConfirm={onConfirm}
        />
      }
    >
      <p className="text-sm font-bold text-(--app-foreground) leading-relaxed">
        هل أنت متأكد من حذف {tableName}؟
      </p>
      <p className="text-xs text-(--app-muted-foreground) leading-relaxed">
        سيتم إعادة جميع الضباط المخصصين في هذا الجدول إلى جداولهم الافتراضية تلقائياً دون أي فقدان في بياناتهم.
      </p>
    </ModalShell>
  );
}
