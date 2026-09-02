"use client";

import React, { useState } from "react";
import { ModalShell } from "@/components/ui/modal-shell";
import { ModalActions } from "@/components/ui/modal-actions";
import { useToast } from "@/components/ui/toast";
import { extractApiError } from "@/lib/utils";
import { ShieldAlert, AlertTriangle, Users } from "lucide-react";

interface UnassignAllModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function UnassignAllModal({ isOpen, onClose, onSuccess }: UnassignAllModalProps) {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  async function handleConfirm() {
    try {
      setLoading(true);
      const res = await fetch("/api/arkan-harb/positions/unassign-all", {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) {
        showToast(extractApiError(data, "فشل في إلغاء التكليفات"), "error");
        return;
      }
      showToast(data.message || "تم تفريغ كافة التكليفات بنجاح", "success");
      onSuccess();
      onClose();
    } catch {
      showToast("حدث خطأ أثناء الاتصال بالخادم", "error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <ModalShell
      title="تأكيد تفريغ كافة التكليفات"
      icon={<ShieldAlert className="w-4 h-4" />}
      titleVariant="danger"
      onClose={onClose}
      overlayClassName="bg-black/40"
      panelClassName="max-w-md border-red-500/30 shadow-depth-xl"
      bodyClassName="p-5 space-y-4 no-scrollbar text-right"
      footer={
        <ModalActions
          submitText="تأكيد تفريغ الجميع"
          submitVariant="destructive"
          submitLoading={loading}
          onConfirm={handleConfirm}
          onCancel={onClose}
        />
      }
    >
      {/* 1. Danger Banner */}
      <div className="p-3.5 rounded-2xl bg-red-500/10 border border-red-500/20 text-right space-y-1">
        <div className="flex items-center gap-2 text-red-700 dark:text-red-400 font-black text-xs">
          <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
          <span>تحذير إداري: تفريغ شامل لهيكل التسكين والتكليف</span>
        </div>
        <p className="text-[11px] text-red-600/90 dark:text-red-300 font-bold leading-relaxed">
          هل أنت متأكد من رغبتك في تفريغ كافة تكليفات الضباط من جميع الوظائف بالهيكل الإداري؟
        </p>
      </div>

      {/* 2. Impact Details Card */}
      <div className="p-3.5 bg-(--app-surface-container) rounded-2xl border border-(--app-border) space-y-2 text-right">
        <div className="flex items-center gap-2 pb-1.5 border-b border-(--app-border)/40 text-xs font-black text-(--color-primary)">
          <Users className="w-4 h-4 text-(--color-primary) shrink-0" />
          <span>الآثار المترتبة على هذا الإجراء:</span>
        </div>
        <ul className="space-y-1.5 text-xs text-(--app-muted-foreground) font-bold">
          <li className="flex items-start gap-1.5">
            <span className="text-red-500 font-black">•</span>
            <span>ستصبح جميع الوظائف في الهيكل شاغرة (بدون ضابط أساسي وبدون بدلاء).</span>
          </li>
          <li className="flex items-start gap-1.5">
            <span className="text-blue-600 dark:text-blue-400 font-black">•</span>
            <span>سيتم الاحتفاظ بكافة مسميات وهيكل الوظائف دون حذف.</span>
          </li>
          <li className="flex items-start gap-1.5">
            <span className="text-emerald-600 dark:text-emerald-400 font-black">•</span>
            <span>يتم أرشفة وتوثيق انتهاء التكليفات تلقائياً في السجل التاريخي.</span>
          </li>
        </ul>
      </div>
    </ModalShell>
  );
}
