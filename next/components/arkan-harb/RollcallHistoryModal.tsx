"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { History, ArrowRight } from "lucide-react";
import { ModalShell } from "@/components/ui/modal-shell";
import { ModalActions } from "@/components/ui/modal-actions";
import { DateField } from "@/components/ui/date-field";
import { format } from "date-fns";

interface RollcallHistoryModalProps {
  isOpen: boolean;
  currentDate: string;
  onClose: () => void;
}

export function RollcallHistoryModal({
  isOpen,
  currentDate,
  onClose,
}: RollcallHistoryModalProps) {
  const router = useRouter();
  const [selectedDate, setSelectedDate] = useState(currentDate);

  useEffect(() => {
    if (isOpen) {
      setSelectedDate(currentDate);
    }
  }, [currentDate, isOpen]);

  if (!isOpen) return null;

  const todayStr = format(new Date(), "yyyy-MM-dd");
  const isViewingPast = currentDate !== todayStr;

  const handleNavigate = () => {
    if (!selectedDate) return;
    onClose();
    router.push(`/arkan-harb?tab=rollcall&date=${selectedDate}`);
  };

  const handleReturnToday = () => {
    onClose();
    router.push(`/arkan-harb?tab=rollcall&date=${todayStr}`);
  };

  return (
    <ModalShell
      title="سجل التمامات السابقة"
      icon={<History className="w-4 h-4 text-(--color-primary)" />}
      onClose={onClose}
      overlayClassName="bg-black/40"
      panelClassName="max-w-md border-(--app-border) shadow-depth-xl"
      bodyClassName="p-5 space-y-4 text-right"
      footer={
        <ModalActions
          mode="view"
          startSlot={
            isViewingPast ? (
              <button
                type="button"
                onClick={handleReturnToday}
                className="btn-secondary text-xs flex items-center gap-1.5 cursor-pointer"
              >
                <ArrowRight className="w-3.5 h-3.5" />
                <span>العودة لتمام اليوم</span>
              </button>
            ) : undefined
          }
          submitText="عرض التمام"
          submitDisabled={!selectedDate || selectedDate === currentDate}
          onConfirm={handleNavigate}
          onCancel={onClose}
        />
      }
    >
      <div className="space-y-3">
        <p className="text-xs font-bold text-(--app-muted-foreground)">
          يمكنك استعراض كشف التمام اليومي المعتمد أو المسودة لأي يوم سابق بتحديد التاريخ:
        </p>

        <div className="p-3 bg-(--app-surface-container) border border-(--app-border) rounded-xl space-y-2">
          <DateField
            id="history-rollcall-date"
            label="تاريخ التمام المطلوب استعراضه"
            value={selectedDate}
            onChange={setSelectedDate}
            max={todayStr}
            required
          />
        </div>

        {isViewingPast && (
          <div className="p-2.5 bg-(--color-primary)/5 border border-(--color-primary)/20 rounded-xl text-xs font-bold text-(--color-primary)">
            أنت تستعرض حالياً كشف تمام سابق ليوم: <span className="font-mono">{currentDate}</span>. للرجوع لكشف التمام الحالي اضغط على &quot;العودة لتمام اليوم&quot;.
          </div>
        )}
      </div>
    </ModalShell>
  );
}
