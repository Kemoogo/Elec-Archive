"use client";

import React, { useState } from "react";
import { ShieldAlert, ShieldCheck, CheckSquare, Square } from "lucide-react";
import { ModalShell } from "@/components/ui/modal-shell";
import { ModalActions } from "@/components/ui/modal-actions";
import { FormField, FormTextarea } from "@/components/ui/form-fields";

interface HistoricalGovernanceModalProps {
  mode: "update" | "delete";
  recordTitle: string;
  entityLabel: string;
  loading?: boolean;
  onCancel: () => void;
  onConfirm: (payload: { reason: string; confirmed: true }) => Promise<void> | void;
}

export function HistoricalGovernanceModal({
  mode,
  recordTitle,
  entityLabel,
  loading = false,
  onCancel,
  onConfirm,
}: HistoricalGovernanceModalProps) {
  const [reason, setReason] = useState("");
  const [acknowledged, setAcknowledged] = useState(false);
  const [error, setError] = useState("");

  const isDelete = mode === "delete";
  const trimmedReason = reason.trim();
  const isValid = acknowledged && trimmedReason.length >= 3;

  async function handleConfirmSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!acknowledged) {
      setError("يجب تحديد إقرار التأكيد المزدوج قبل المتابعة");
      return;
    }
    if (trimmedReason.length < 3) {
      setError("يرجى إدخال سبب واضح للتعديل أو الحذف (3 أحرف على الأقل)");
      return;
    }
    setError("");
    await onConfirm({ reason: trimmedReason, confirmed: true });
  }

  return (
    <ModalShell
      title={
        isDelete
          ? `تأكيد حذف ${entityLabel} من السجل التاريخي`
          : `تأكيد تعديل ${entityLabel} المحفوظ`
      }
      titleVariant={isDelete ? "danger" : "default"}
      icon={
        isDelete ? (
          <ShieldAlert className="w-4 h-4 text-(--color-primary)" />
        ) : (
          <ShieldCheck className="w-4 h-4 text-(--color-primary)" />
        )
      }
      onClose={onCancel}
      closeOnOverlayClick={!loading}
      overlayClassName="bg-black/40"
      panelClassName="max-w-lg"
      footer={
        <ModalActions
          mode="action"
          form="historical-governance-form"
          submitText={isDelete ? "تأكيد الحذف النهائي" : "تأكيد التعديل والحفظ"}
          submitVariant={isDelete ? "destructive" : "primary"}
          submitLoading={loading}
          submitDisabled={!isValid}
          cancelText="إلغاء"
          onCancel={onCancel}
        />
      }
    >
      <form
        id="historical-governance-form"
        onSubmit={handleConfirmSubmit}
        className="space-y-4"
        dir="rtl"
      >
        {/* Governance Banner — strict Sapphire Blue palette (no amber/orange/yellow) */}
        <div className="p-3.5 rounded-xl bg-(--color-primary)/5 border border-(--color-primary)/20 space-y-1.5">
          <p className="text-xs font-black text-(--color-primary)">
            حوكمة حماية البيانات التاريخية (إجراء مقتصر على مدير النظام فقط)
          </p>
          <p className="text-xs font-bold text-(--app-muted-foreground) leading-relaxed">
            {isDelete
              ? `أنت على وشك حذف السجل التاريخي "${recordTitle}" نهائياً مع إزالة الصور المحلية المرفقة به. سيتم توثيق العملية وسببها في سجل التدقيق.`
              : `أنت على وشك تعديل بيانات السجل التاريخي المحفوظ "${recordTitle}". سيتم توثيق التعديل وسببه كاملاً في سجل التدقيق.`}
          </p>
        </div>

        <FormField
          label={isDelete ? "سبب الحذف الإلزامي" : "سبب التعديل الإلزامي"}
          required
          error={error && trimmedReason.length < 3 ? error : undefined}
        >
          <FormTextarea
            value={reason}
            onChange={(e) => {
              setReason(e.target.value);
              if (error) setError("");
            }}
            placeholder={
              isDelete
                ? "اكتب السبب الرسمي لحذف هذا السجل من الأرشيف التاريخي..."
                : "اكتب السبب الرسمي لتعديل بيانات هذا السجل المحفوظ..."
            }
            rows={3}
            maxLength={500}
            disabled={loading}
          />
          <p className="text-[11px] font-bold text-(--app-muted-foreground) mt-1 mr-1">
            الحد الأدنى 3 أحرف — سيُحفظ هذا السبب بشكل دائم في سجل التدقيق (AuditLog).
          </p>
        </FormField>

        {/* Double confirmation checkbox */}
        <button
          type="button"
          onClick={() => {
            setAcknowledged((prev) => !prev);
            if (error) setError("");
          }}
          disabled={loading}
          className="w-full p-3 rounded-xl border border-(--app-border) bg-(--app-surface-container)/60 hover:bg-(--app-surface-container) transition-colors flex items-start gap-2.5 text-right cursor-pointer"
        >
          {acknowledged ? (
            <CheckSquare className="w-4 h-4 text-(--color-primary) shrink-0 mt-0.5" />
          ) : (
            <Square className="w-4 h-4 text-(--app-muted-foreground) shrink-0 mt-0.5" />
          )}
          <span className="text-xs font-bold text-(--app-foreground) leading-relaxed">
            {isDelete
              ? "أقرّ بمراجعة هذا السجل التاريخي وأتحمل المسؤولية الإدارية الكاملة عن حذفه نهائياً."
              : "أقرّ بمراجعة التعديلات المطلوبة وأتحمل المسؤولية الإدارية عن تحديث هذا السجل التاريخي."}
          </span>
        </button>

        {error && !acknowledged && trimmedReason.length >= 3 && (
          <p className="text-xs font-bold text-(--app-error) mr-1">{error}</p>
        )}
      </form>
    </ModalShell>
  );
}
