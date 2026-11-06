import React from "react";
import { FileText } from "lucide-react";
import { ModalShell, ModalBadge, ModalHeaderCard } from "@/components/ui/modal-shell";
import { ModalActions } from "@/components/ui/modal-actions";
import { formatDateDisplay } from "@/lib/utils/date-display";
import type { RollcallOfficerData } from "@/components/arkan-harb/RollcallView";

interface MissionDetailsModalProps {
  officer: RollcallOfficerData | null;
  onClose: () => void;
}

export function MissionDetailsModal({
  officer,
  onClose,
}: MissionDetailsModalProps) {
  if (!officer) return null;

  return (
    <ModalShell
      title="تفاصيل وبيانات المأمورية"
      icon={<FileText className="w-4 h-4 text-(--color-primary)" />}
      overlayClassName="bg-black/40"
      panelClassName="max-w-md border-(--app-border) shadow-depth-xl"
      bodyClassName="p-5 space-y-4 text-right no-scrollbar"
      onClose={onClose}
      footer={<ModalActions mode="view" onCancel={onClose} />}
    >
      <ModalHeaderCard
        icon={<FileText className="w-6 h-6 text-(--color-primary)" />}
        title={officer.missionTitle || "مأمورية رسمية"}
        subtitle={`الضابط: ${officer.rankLabel || officer.rank} / ${officer.fullName}`}
        badge={
          <ModalBadge>
            {officer.status === "daily_mission" ? "مأمورية يومية" : "مأمورية رسمية"}
          </ModalBadge>
        }
      />
      <div className="space-y-3 bg-(--app-surface-container) p-4 rounded-xl border border-(--app-border) text-xs">
        {officer.missionDestination && (
          <div className="flex justify-between items-center py-1 border-b border-(--app-border)/60">
            <span className="font-bold text-(--app-muted-foreground)">الجهة المقصودة:</span>
            <span className="font-black text-(--color-primary)">{officer.missionDestination}</span>
          </div>
        )}
        <div className="flex justify-between items-center py-1 border-b border-(--app-border)/60">
          <span className="font-bold text-(--app-muted-foreground)">الفترة والتاريخ:</span>
          <span className="font-mono font-bold text-(--color-primary)">
            {officer.missionStartDate ? formatDateDisplay(officer.missionStartDate) : "ـ"}
            {officer.missionEndDate ? ` حتى ${formatDateDisplay(officer.missionEndDate)}` : ""}
          </span>
        </div>
        {officer.primaryPositionTitle && (
          <div className="flex justify-between items-center py-1 border-b border-(--app-border)/60">
            <span className="font-bold text-(--app-muted-foreground)">الوظيفة المكلف بها:</span>
            <span className="font-bold text-(--app-foreground)">{officer.primaryPositionTitle}</span>
          </div>
        )}
        {(officer.note || officer.lockReason) && (
          <div className="pt-1">
            <span className="font-bold text-(--app-muted-foreground) block mb-1">
              الملاحظات وبيان العمليات:
            </span>
            <p className="font-bold text-(--app-foreground) bg-(--app-surface) p-2.5 rounded-lg border border-(--app-border)">
              {officer.note || officer.lockReason}
            </p>
          </div>
        )}
      </div>
    </ModalShell>
  );
}
