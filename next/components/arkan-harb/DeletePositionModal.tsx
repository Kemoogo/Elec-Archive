"use client";

import React, { useState } from "react";
import { ModalShell } from "@/components/ui/modal-shell";
import { ModalActions } from "@/components/ui/modal-actions";
import { AlertTriangle, Briefcase, ShieldAlert } from "lucide-react";
import { RANK_LABELS, type OfficerRank } from "@/lib/db/models/Officer.shared";
import type { PositionRowData, OfficerInfo } from "./PositionAssignmentTable";

interface DeletePositionModalProps {
  isOpen: boolean;
  position: PositionRowData | null;
  loading: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

function getOfficerDisplay(officer?: OfficerInfo | null): string {
  if (!officer) return "شاغر (بدون تعيين)";
  if (officer.officerLabel) return officer.officerLabel;
  const rLabel = officer.rank ? RANK_LABELS[officer.rank as OfficerRank] || officer.rank : "";
  const arkan = officer.isArkanHarb ? " أ ح" : "";
  return rLabel ? `${rLabel}${arkan} / ${officer.fullName}` : officer.fullName;
}

export function DeletePositionModal({
  isOpen,
  position,
  loading,
  onClose,
  onConfirm,
}: DeletePositionModalProps) {
  if (!isOpen || !position) return null;

  return (
    <DeletePositionModalContent
      key={position.id}
      position={position}
      loading={loading}
      onClose={onClose}
      onConfirm={onConfirm}
    />
  );
}

function DeletePositionModalContent({
  position,
  loading,
  onClose,
  onConfirm,
}: Omit<DeletePositionModalProps, "isOpen"> & { position: PositionRowData }) {
  const [typedTitle, setTypedTitle] = useState("");

  const targetTitle = position.positionTitle.trim();
  const isMatch = typedTitle.trim() === targetTitle;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isMatch && !loading) {
      onConfirm();
    }
  };

  const hasPrimary = Boolean(position.primaryOfficer);
  const subsCount = position.substituteOfficers?.length || 0;

  return (
    <ModalShell
      title="تأكيد حذف الوظيفة من الهيكل التنظيمي"
      icon={<ShieldAlert className="w-4 h-4" />}
      titleVariant="danger"
      onClose={onClose}
      overlayClassName="bg-black/40"
      panelClassName="max-w-md border-red-500/30 shadow-depth-xl"
      bodyClassName="p-5 no-scrollbar space-y-4"
      footer={
        <ModalActions
          form="delete-position-form"
          submitText="تأكيد الحذف النهائي"
          submitVariant="destructive"
          submitLoading={loading}
          submitDisabled={!isMatch || loading}
          onCancel={onClose}
        />
      }
    >
      {/* 1. Danger Banner */}
      <div className="p-3.5 rounded-2xl bg-red-500/10 border border-red-500/20 text-right space-y-1">
        <div className="flex items-center gap-2 text-red-700 dark:text-red-400 font-black text-xs">
          <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
          <span>تحذير إداري وأمني: هذا الإجراء لا يمكن التراجع عنه</span>
        </div>
        <p className="text-[11px] text-red-600/90 dark:text-red-300 font-bold leading-relaxed">
          سيتم حذف تعريف الوظيفة نهائياً من الهيكل، وإلغاء تكليفات كافة الضباط المسكنين عليها حالياً.
        </p>
      </div>

      {/* 2. Position Details Card */}
      <div className="p-3.5 bg-(--app-surface-container) rounded-2xl border border-(--app-border) space-y-2 text-right">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Briefcase className="w-4 h-4 text-(--color-primary)" />
            <span className="text-xs font-bold text-(--app-muted-foreground)">الوظيفة:</span>
            <span className="text-xs font-black text-(--color-primary)">{position.positionTitle}</span>
          </div>
          <span className="text-[11px] font-bold px-2 py-0.5 rounded-lg bg-(--app-surface) border border-(--app-border)">
            {position.department}
          </span>
        </div>

        <div className="text-xs text-(--app-muted-foreground) space-y-1 pt-1 border-t border-(--app-border)/40">
          <div className="flex items-center justify-between">
            <span>الضابط الأساسي:</span>
            <span className={`font-bold ${hasPrimary ? "text-(--color-primary)" : "text-(--app-muted-foreground)"}`}>
              {getOfficerDisplay(position.primaryOfficer)}
            </span>
          </div>

          {!position.hasNoSubstitute && (
            <div className="flex items-center justify-between">
              <span>الضباط البدلاء:</span>
              <span className="font-bold text-(--app-foreground)">
                {subsCount > 0 ? `${subsCount} ضباط بدلاء` : "لا يوجد بدلاء"}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* 3. Double-check Confirmation Form */}
      <form id="delete-position-form" onSubmit={handleSubmit} className="space-y-2 text-right">
        <label htmlFor="confirm-pos-title" className="text-xs font-black text-(--app-foreground) block">
          لتأكيد الحذف، اكتب اسم الوظيفة{" "}
          <span className="text-red-600 select-all font-mono">&quot;{targetTitle}&quot;</span> أدناه:
        </label>

        <input
          id="confirm-pos-title"
          type="text"
          value={typedTitle}
          onChange={(e) => setTypedTitle(e.target.value)}
          placeholder={`اكتب "${targetTitle}" هنا`}
          autoComplete="off"
          className={`w-full px-3 py-2 bg-(--app-surface) border rounded-xl text-sm font-bold transition-all text-right ${
            typedTitle.length > 0
              ? isMatch
                ? "border-emerald-500 text-emerald-700 dark:text-emerald-400 focus:ring-emerald-500/20"
                : "border-red-400 text-red-600 focus:ring-red-500/20"
              : "border-(--app-border) text-(--app-foreground) focus:border-red-500 focus:ring-red-500/20"
          } focus:outline-none`}
        />

        {typedTitle.length > 0 && !isMatch && (
          <p className="text-[11px] font-bold text-red-500">
            الاسم المكتوب غير متطابق مع اسم الوظيفة.
          </p>
        )}
      </form>
    </ModalShell>
  );
}
