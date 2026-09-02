"use client";

import { useState } from "react";
import { ModalShell } from "@/components/ui/modal-shell";
import { ModalActions } from "@/components/ui/modal-actions";
import { FormLabel, FormTextarea } from "@/components/ui/form-fields";
import { DateField } from "@/components/ui/date-field";
import { Clock, XCircle, AlertCircle } from "lucide-react";
import { useToast } from "@/components/ui/toast";
import { extractApiError } from "@/lib/utils";
import { type Mission } from "./MissionsTable";

interface MissionActionModalProps {
  mission: Mission | null;
  actionType: "postpone" | "cancel" | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function MissionActionModal({
  mission,
  actionType,
  isOpen,
  onClose,
  onSuccess,
}: MissionActionModalProps) {
  if (!isOpen || !mission || !actionType) return null;

  return (
    <MissionActionModalContent
      key={mission.id}
      mission={mission}
      actionType={actionType}
      onClose={onClose}
      onSuccess={onSuccess}
    />
  );
}

function MissionActionModalContent({
  mission,
  actionType,
  onClose,
  onSuccess,
}: Omit<MissionActionModalProps, "isOpen"> & {
  mission: Mission;
  actionType: "postpone" | "cancel";
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [reason, setReason] = useState(mission.statusReason || "");
  const [newStartDate, setNewStartDate] = useState(
    mission.startDate
      ? new Date(mission.startDate).toISOString().split("T")[0]
      : ""
  );
  const [newEndDate, setNewEndDate] = useState(
    mission.endDate
      ? new Date(mission.endDate).toISOString().split("T")[0]
      : ""
  );
  const { showToast } = useToast();

  const isPostpone = actionType === "postpone";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    if (!reason.trim()) {
      setError(isPostpone ? "يرجى إدخال سبب التأجيل" : "يرجى إدخال سبب الإلغاء");
      setLoading(false);
      return;
    }

    try {
      const payload: Record<string, unknown> = {
        status: isPostpone ? "postponed" : "cancelled",
        statusReason: reason.trim(),
      };

      if (isPostpone && newStartDate) {
        payload.startDate = newStartDate;
        payload.endDate = newEndDate || undefined;
      }

      const res = await fetch(`/api/arkan-harb/missions/${mission.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(
          extractApiError(data, isPostpone ? "فشل تأجيل المأمورية" : "فشل إلغاء المأمورية")
        );
      }

      showToast(
        isPostpone ? "تم تأجيل المأمورية بنجاح" : "تم إلغاء المأمورية بنجاح",
        "success"
      );
      onSuccess();
      onClose();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const displayOfficer =
    mission.officerLabel ||
    (mission.officerRankLabel
      ? `${mission.officerRankLabel} / ${mission.officerName}`
      : mission.officerName || "---");

  const footer = (
    <ModalActions
      form="mission-action-form"
      submitText={isPostpone ? "تأكيد التأجيل" : "تأكيد الإلغاء"}
      submitVariant={isPostpone ? "primary" : "destructive"}
      submitLoading={loading}
      onCancel={onClose}
    />
  );

  return (
    <ModalShell
      title={isPostpone ? "تأجيل المأمورية" : "إلغاء المأمورية"}
      icon={isPostpone ? <Clock className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
      titleVariant={isPostpone ? "warning" : "danger"}
      onClose={onClose}
      footer={footer}
      panelClassName="max-w-[440px]"
    >
      <form id="mission-action-form" onSubmit={handleSubmit} className="space-y-4 text-right">
        {error && (
          <div className="p-3 bg-(--app-error)/10 border border-(--app-error)/20 rounded-xl text-(--app-error) text-xs font-bold flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-800 space-y-1">
          <p className="text-xs font-bold text-slate-400">المأمورية المستهدفة:</p>
          <p className="text-sm font-black text-(--color-primary)">{mission.title}</p>
          <p className="text-xs font-bold text-slate-600 dark:text-slate-300">
            الضابط المعني: {displayOfficer}
          </p>
        </div>

        <div className="space-y-1.5">
          <FormLabel htmlFor="reason" required>
            {isPostpone ? "سبب التأجيل" : "سبب الإلغاء"}
          </FormLabel>
          <FormTextarea
            id="reason"
            required
            rows={3}
            placeholder={
              isPostpone
                ? "أدخل سبب تأجيل المأمورية..."
                : "أدخل سبب إلغاء المأمورية..."
            }
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
        </div>

        {isPostpone && (
          <div className="p-3 bg-purple-500/5 border border-purple-500/20 rounded-xl space-y-3">
            <p className="text-xs font-extrabold text-purple-700 dark:text-purple-300 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5" />
              تعديل تواريخ المأمورية المؤجلة (اختياري):
            </p>
            <div className="grid grid-cols-2 gap-3">
              <DateField
                id="newStartDate"
                label="تاريخ البداية الجديد"
                value={newStartDate}
                onChange={setNewStartDate}
              />
              <DateField
                id="newEndDate"
                label="تاريخ الانتهاء الجديد"
                value={newEndDate}
                onChange={setNewEndDate}
              />
            </div>
          </div>
        )}
      </form>
    </ModalShell>
  );
}
