"use client";

import React from "react";
import { ModalShell } from "@/components/ui/modal-shell";
import { ModalActions } from "@/components/ui/modal-actions";
import { Printer } from "lucide-react";
import { TravelOrderSheet } from "./TravelOrderSheet";
import type { Mission } from "./MissionsTable";

interface TravelOrderModalProps {
  mission: Mission | null;
  isOpen: boolean;
  onClose: () => void;
  unitName?: string;
}

export function TravelOrderModal({
  mission,
  isOpen,
  onClose,
  unitName = "قيادة الوحدة العسكرية",
}: TravelOrderModalProps) {
  if (!isOpen || !mission) return null;

  const handlePrint = () => {
    window.print();
  };

  const footer = (
    <ModalActions
      mode="view"
      submitText="طباعة أمر التحرك العسكري (A4)"
      onConfirm={handlePrint}
      onCancel={onClose}
    />
  );

  return (
    <ModalShell
      title={`أمر تحرك عسكري - ${mission.title}`}
      icon={<Printer className="w-4 h-4 text-(--color-primary)" />}
      overlayClassName="bg-black/40"
      panelClassName="max-w-4xl border-(--app-border) shadow-depth-xl"
      bodyClassName="p-4 sm:p-6 overflow-y-auto max-h-[80vh] no-scrollbar"
      onClose={onClose}
      footer={footer}
    >
      <div className="space-y-4">
        <div className="p-3 bg-(--color-primary)/5 border border-(--color-primary)/20 rounded-xl flex items-center justify-between text-xs font-bold text-(--color-primary)">
          <span>نموذج أمر تحرك وخط سير عسكري رسمي معتمد للطباعة على ورق A4</span>
          <span className="font-mono text-xs">{mission.travelOrderNumber || "مسودة أمر تحرك"}</span>
        </div>

        <TravelOrderSheet
          mission={mission}
          unitName={unitName}
        />
      </div>
    </ModalShell>
  );
}
