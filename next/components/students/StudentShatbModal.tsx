"use client";

import React, { useState } from "react";
import { ModalShell } from "@/components/ui/modal-shell";
import { ModalHeaderCard, ModalSection, ModalBadge } from "@/components/ui/modal-shell";
import { ModalActions } from "@/components/ui/modal-actions";
import { DateField } from "@/components/ui/date-field";
import { useToast } from "@/components/ui/toast";
import { UserX, ShieldAlert } from "lucide-react";
import type { IStudentListItem } from "@/types/student";

interface StudentShatbModalProps {
  student: IStudentListItem | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function StudentShatbModal({
  student,
  isOpen,
  onClose,
  onSuccess,
}: StudentShatbModalProps) {
  const { showToast } = useToast();
  const [shatbDate, setShatbDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [shatbOrderNo, setShatbOrderNo] = useState("");
  const [shatbReason, setShatbReason] = useState("");
  const [loading, setLoading] = useState(false);

  if (!isOpen || !student) return null;

  const handleSubmit = async () => {
    if (!shatbDate) {
      showToast("تاريخ سريان الشطب مطلوب", "error");
      return;
    }
    if (!shatbOrderNo.trim()) {
      showToast("رقم وتاريخ أمر الشطب والتصديق مطلوب", "error");
      return;
    }
    if (!shatbReason.trim()) {
      showToast("سبب الشطب والتوزيع مطلوب", "error");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`/api/students/${student._id}/shatb`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          shatbDate,
          shatbOrderNo: shatbOrderNo.trim(),
          shatbReason: shatbReason.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        showToast(data.error || "فشل تنفيذ إجراء الشطب", "error");
        return;
      }

      showToast(data.message || "تم شطب الطالب وضمه لقوة الأفراد بنجاح", "success");
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
      title="شطب وضم لقوة الأفراد"
      icon={<UserX className="w-4 h-4" />}
      onClose={onClose}
      overlayClassName="bg-black/40"
      panelClassName="max-w-lg border-(--app-border) shadow-depth-xl"
      bodyClassName="p-5 space-y-4 no-scrollbar"
      footer={
        <ModalActions
          mode="action"
          submitText="تأكيد الشطب والضم"
          cancelText="إلغاء"
          onCancel={onClose}
          onConfirm={handleSubmit}
          submitLoading={loading}
          submitDisabled={loading}
        />
      }
    >
      <ModalHeaderCard
        icon={<UserX className="w-6 h-6" />}
        title={student.fullName}
        subtitle={`الرقم العسكري: ${student.militaryNo || student.studentId} | المرحلة: ${student.mrhlaName || student.mrhla}`}
        badge={<ModalBadge icon={<ShieldAlert className="w-3.5 h-3.5" />}>إجراء إداري</ModalBadge>}
      />

      <div className="p-3 bg-(--color-primary)/5 border border-(--color-primary)/20 rounded-xl text-xs font-bold text-(--color-primary)">
        سيتم استبعاد هذا الطالب فورياً من حسابات القوة الميدانية والتمام اليومي، ونقله إلى قوة الأفراد الدائمة بالوحدة.
      </div>

      <ModalSection title="بيانات أمر الشطب والتوزيع">
        <div className="space-y-3">
          <DateField
            id="shatb-date"
            label="تاريخ سريان الشطب"
            value={shatbDate}
            onChange={setShatbDate}
            required
          />

          <div className="space-y-1.5">
            <label htmlFor="shatb-order-no" className="text-xs font-bold text-(--app-muted-foreground) block mr-1">
              رقم وتاريخ أمر الشطب والتصديق *
            </label>
            <input
              id="shatb-order-no"
              type="text"
              placeholder="مثال: أمر قائد الجناح رقم 45/2026 بتصديق..."
              value={shatbOrderNo}
              onChange={(e) => setShatbOrderNo(e.target.value)}
              className="w-full px-3 py-2 bg-(--app-surface) border border-(--app-border) rounded-xl text-xs font-bold text-(--app-foreground) focus:outline-none focus:ring-blue-500/20 focus:border-blue-500 transition-all text-right"
              required
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="shatb-reason" className="text-xs font-bold text-(--app-muted-foreground) block mr-1">
              سبب الشطب والتوزيع على الأفراد *
            </label>
            <textarea
              id="shatb-reason"
              rows={3}
              placeholder="اكتب سبب الشطب ونقل التبعية..."
              value={shatbReason}
              onChange={(e) => setShatbReason(e.target.value)}
              className="w-full px-3 py-2 bg-(--app-surface) border border-(--app-border) rounded-xl text-xs font-bold text-(--app-foreground) focus:outline-none focus:ring-blue-500/20 focus:border-blue-500 transition-all text-right"
              required
            />
          </div>
        </div>
      </ModalSection>
    </ModalShell>
  );
}
