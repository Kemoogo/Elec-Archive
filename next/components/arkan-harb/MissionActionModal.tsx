"use client";

import { useState } from "react";
import { ModalShell, ModalHeaderCard, ModalSection, ModalBadge } from "@/components/ui/modal-shell";
import { ModalActions } from "@/components/ui/modal-actions";
import { FormLabel, FormTextarea } from "@/components/ui/form-fields";
import { DateField } from "@/components/ui/date-field";
import { Clock, XCircle, AlertCircle, Compass, MapPin, Calendar } from "lucide-react";
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
      setError(isPostpone ? "يرجى إدخال سبب التأجيل" : "يرجى إدخال سبب إلغاء المأمورية");
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
      cancelText="إلغاء"
      onCancel={onClose}
    />
  );

  return (
    <ModalShell
      title={isPostpone ? "تأجيل المأمورية" : "إلغاء المأمورية"}
      icon={isPostpone ? <Clock className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
      titleVariant={isPostpone ? "default" : "danger"}
      overlayClassName="bg-black/40"
      panelClassName="max-w-lg border-(--app-border) shadow-depth-xl"
      bodyClassName="p-5 space-y-4 text-right no-scrollbar"
      onClose={onClose}
      footer={footer}
    >
      <form id="mission-action-form" onSubmit={handleSubmit} className="space-y-4 text-right">
        {error && (
          <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-600 text-xs font-bold flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Standard Top Header Card */}
        <ModalHeaderCard
          icon={<Compass className="w-6 h-6" />}
          title={mission.title}
          subtitle={
            <div className="space-y-0.5 mt-1">
              <p className="text-xs font-bold text-(--app-muted-foreground)">
                الضابط المكلف: <span className="text-(--color-primary) font-extrabold">{displayOfficer}</span>
              </p>
            </div>
          }
          badge={
            mission.destination ? (
              <ModalBadge icon={<MapPin className="w-3.5 h-3.5" />}>
                {mission.destination}
              </ModalBadge>
            ) : undefined
          }
        />

        {/* Standard Sapphire Notice for Cancellation */}
        {!isPostpone && (
          <div className="p-3.5 bg-(--color-primary)/5 border border-(--color-primary)/20 rounded-2xl flex items-start gap-2.5 text-right">
            <AlertCircle className="w-4 h-4 text-(--color-primary) shrink-0 mt-0.5" />
            <div className="text-xs font-bold text-(--color-primary) leading-relaxed">
              تنبيه: سيتم تحويل حالة المأمورية إلى <span className="font-black">&quot;ملغاة&quot;</span> وتوثيق سبب الإلغاء بالسجلات، مع إتاحة الضابط للعودة إلى قوائم الخدمة والتمام التلقائي.
            </div>
          </div>
        )}

        {/* Reason Field */}
        <div className="space-y-1.5">
          <FormLabel htmlFor="reason" required>
            {isPostpone ? "سبب التأجيل" : "سبب إلغاء المأمورية"}
          </FormLabel>
          <FormTextarea
            id="reason"
            required
            rows={3}
            placeholder={
              isPostpone
                ? "أدخل سبب تأجيل المأمورية والملاحظات..."
                : "أدخل سبب إلغاء المأمورية بالتفصيل..."
            }
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
        </div>

        {/* Postpone Dates Section */}
        {isPostpone && (
          <ModalSection
            variant="card"
            title="تعديل تواريخ المأمورية المؤجلة (اختياري)"
            badge={
              <ModalBadge icon={<Calendar className="w-3.5 h-3.5" />}>
                التواريخ
              </ModalBadge>
            }
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
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
          </ModalSection>
        )}
      </form>
    </ModalShell>
  );
}
