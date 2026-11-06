import React, { useState } from "react";
import { FileText } from "lucide-react";
import { ModalShell, ModalBadge, ModalHeaderCard } from "@/components/ui/modal-shell";
import { ModalActions } from "@/components/ui/modal-actions";
import type { RollcallOfficerData } from "@/components/arkan-harb/RollcallView";

interface OfficerNoteModalProps {
  officer: RollcallOfficerData | null;
  initialNote: string;
  isOpen: boolean;
  onClose: () => void;
  onSave: (officerId: string, noteText: string) => void;
  onDelete: (officerId: string) => void;
}

export function OfficerNoteModal({
  officer,
  initialNote,
  isOpen,
  onClose,
  onSave,
  onDelete,
}: OfficerNoteModalProps) {
  const [noteText, setNoteText] = useState(initialNote);
  const [prevInitial, setPrevInitial] = useState(initialNote);

  if (prevInitial !== initialNote) {
    setPrevInitial(initialNote);
    setNoteText(initialNote);
  }

  if (!isOpen || !officer) return null;

  return (
    <ModalShell
      title="ملاحظات الضابط في التمام"
      icon={<FileText className="w-4 h-4" />}
      panelClassName="max-w-md border-(--app-border) shadow-depth-xl"
      bodyClassName="p-5 space-y-4 text-right no-scrollbar"
      onClose={onClose}
      footer={
        <ModalActions
          destructiveText={initialNote.trim().length > 0 ? "حذف الملاحظة" : undefined}
          onDestructive={initialNote.trim().length > 0 ? () => onDelete(officer.id) : undefined}
          submitText="حفظ"
          onConfirm={() => onSave(officer.id, noteText.trim())}
          onCancel={onClose}
        />
      }
    >
      <ModalHeaderCard
        icon={<FileText className="w-6 h-6 text-(--color-primary)" />}
        title={`${officer.rankLabel || officer.rank} / ${officer.fullName}`}
        subtitle={
          officer.primaryPositionTitle
            ? `الوظيفة: ${officer.primaryPositionTitle}`
            : officer.militaryId
              ? `الرقم العسكري: ${officer.militaryId}`
              : undefined
        }
        badge={<ModalBadge>{noteText ? "تعديل ملاحظة" : "إضافة ملاحظة"}</ModalBadge>}
      />
      <div className="space-y-1.5">
        <label className="text-xs font-bold text-(--app-muted-foreground) block mr-1">
          نص الملاحظة
        </label>
        <textarea
          autoFocus
          rows={4}
          value={noteText}
          onChange={(e) => setNoteText(e.target.value)}
          placeholder="اكتب الملاحظة هنا..."
          className="w-full bg-(--app-surface) border border-(--app-border) rounded-xl p-3 text-xs font-bold text-(--color-primary) focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-right resize-none"
        />
      </div>
    </ModalShell>
  );
}
