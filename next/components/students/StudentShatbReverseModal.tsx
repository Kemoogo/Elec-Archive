"use client";

import React, { useState } from "react";
import { ModalShell } from "@/components/ui/modal-shell";
import { ModalHeaderCard, ModalSection, ModalBadge } from "@/components/ui/modal-shell";
import { ModalActions } from "@/components/ui/modal-actions";
import { useToast } from "@/components/ui/toast";
import { RotateCcw, AlertCircle } from "lucide-react";
import { formatDateDisplay } from "@/lib/utils/date-display";
import type { IStudentListItem } from "@/types/student";

interface StudentShatbReverseModalProps {
  student: IStudentListItem | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  isAdmin?: boolean;
}

export function StudentShatbReverseModal({
  student,
  isOpen,
  onClose,
  onSuccess,
  isAdmin: _isAdmin = false,
}: StudentShatbReverseModalProps) {
  const { showToast } = useToast();
  const [reversalReason, setReversalReason] = useState("");
  const [loading, setLoading] = useState(false);

  if (!isOpen || !student) return null;

  const handleSubmit = async () => {
    if (!reversalReason.trim() || reversalReason.trim().length < 3) {
      showToast("سبب إلغاء الشطب مطلوب ومفصل", "error");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`/api/students/${student._id}/shatb-reverse`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reversalReason: reversalReason.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        showToast(data.error || "فشل إلغاء الشطب", "error");
        return;
      }

      showToast(data.message || "تم إلغاء الشطب وإعادة الطالب للقوة بنجاح", "success");
      onSuccess();
      onClose();
    } catch {
      showToast("خطأ أثناء الاتصال بالخادم", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <ModalShell
      title="إلغاء الشطب والعودة لقوة الطلبة"
      icon={<RotateCcw className="w-4 h-4" />}
      onClose={onClose}
      overlayClassName="bg-black/40"
      panelClassName="max-w-lg border-(--app-border) shadow-depth-xl"
      bodyClassName="p-5 space-y-4 no-scrollbar"
      footer={
        <ModalActions
          mode="action"
          submitText="تأكيد إلغاء الشطب"
          cancelText="إلغاء"
          onCancel={onClose}
          onConfirm={handleSubmit}
          submitLoading={loading}
          submitDisabled={loading || reversalReason.trim().length < 3}
        />
      }
    >
      <ModalHeaderCard
        icon={<RotateCcw className="w-6 h-6" />}
        title={student.fullName}
        subtitle={`الرقم العسكري: ${student.militaryNo || student.studentId} | المرحلة: ${student.mrhlaName || student.mrhla}`}
        badge={<ModalBadge icon={<AlertCircle className="w-3.5 h-3.5" />}>إلغاء شطب</ModalBadge>}
      />

      {/* Info Notice */}
      <div className="p-3 bg-(--color-primary)/5 border border-(--color-primary)/20 rounded-xl text-xs font-bold text-(--color-primary)">
        سيتم إعادة الطالب إلى قوة التدريب النشطة وإدراجه في كشوف التمام اليومي فور تأكيد الإلغاء.
      </div>

      {/* Previous Shatb Details */}
      <ModalSection title="بيانات أمر الشطب الصادر">
        <div className="space-y-2 text-xs">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <span className="font-bold text-(--app-muted-foreground) block">تاريخ الشطب:</span>
              <span className="font-mono font-bold text-(--app-foreground)">
                {student.shatbDate ? formatDateDisplay(student.shatbDate) : "—"}
              </span>
            </div>
            <div>
              <span className="font-bold text-(--app-muted-foreground) block">رقم الأمر:</span>
              <span className="font-bold text-(--app-foreground)">
                {student.shatbOrderNo || "—"}
              </span>
            </div>
          </div>
          <div>
            <span className="font-bold text-(--app-muted-foreground) block">السبب الأصلي:</span>
            <p className="text-(--app-foreground) bg-(--app-surface-container) p-2 rounded-lg border border-(--app-border)">
              {student.shatbReason || "—"}
            </p>
          </div>
        </div>
      </ModalSection>

      {/* Reversal Reason */}
      <ModalSection title="بيانات التصحيح والإلغاء">
        <div className="space-y-1.5">
          <label htmlFor="reversal-reason" className="text-xs font-bold text-(--app-muted-foreground) block mr-1">
            سبب وتصديق إلغاء الشطب *
          </label>
          <textarea
            id="reversal-reason"
            rows={3}
            placeholder="أدخل مبرر وتفاصيل إلغاء أمر الشطب وتصديق القائد..."
            value={reversalReason}
            onChange={(e) => setReversalReason(e.target.value)}
            className="w-full px-3 py-2 bg-(--app-surface) border border-(--app-border) rounded-xl text-xs font-bold text-(--app-foreground) focus:outline-none focus:ring-blue-500/20 focus:border-blue-500 transition-all text-right"
            required
          />
        </div>
      </ModalSection>
    </ModalShell>
  );
}
