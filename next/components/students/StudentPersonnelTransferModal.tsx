"use client";

import React, { useState } from "react";
import {
  ModalShell,
  ModalHeaderCard,
  ModalSection,
  ModalBadge,
} from "@/components/ui/modal-shell";
import { ModalActions } from "@/components/ui/modal-actions";
import { DateField } from "@/components/ui/date-field";
import { useToast } from "@/components/ui/toast";
import { UserPlus, ShieldCheck } from "lucide-react";
import type { IStudentListItem } from "@/types/student";

interface StudentPersonnelTransferModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  mrhla: string;
  mrhlaName?: string;
  selectedStudents: IStudentListItem[];
}

export function StudentPersonnelTransferModal({
  isOpen,
  onClose,
  onSuccess,
  mrhla,
  mrhlaName,
  selectedStudents,
}: StudentPersonnelTransferModalProps) {
  const { showToast } = useToast();
  const [transferDate, setTransferDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [orderNo, setOrderNo] = useState("");
  const [assignedRole, setAssignedRole] = useState("");
  const [loading, setLoading] = useState(false);

  if (!isOpen || selectedStudents.length === 0) return null;

  const singleStudent = selectedStudents.length === 1 ? selectedStudents[0] : null;

  const handleSubmit = async () => {
    if (!mrhla) {
      showToast("يرجى تحديد المرحلة التجنيدية أولاً", "error");
      return;
    }

    if (!transferDate) {
      showToast("تاريخ النقل لقوة الأفراد مطلوب", "error");
      return;
    }

    if (!orderNo.trim()) {
      showToast("رقم وتاريخ أمر النقل مطلوب", "error");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/students/transfer-personnel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mrhla,
          studentIds: selectedStudents.map((s) => s._id),
          transferDate,
          orderNo: orderNo.trim(),
          assignedRole: assignedRole.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        showToast(data.error || "فشل تنفيذ حركة النقل لقوة الأفراد", "error");
        return;
      }

      showToast(data.message || "تم النقل إلى قوة أفراد الوحدة بنجاح", "success");
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
      title="نقل وتسكين إلى قوة أفراد الوحدة"
      icon={<UserPlus className="w-4 h-4" />}
      onClose={onClose}
      overlayClassName="bg-black/40"
      panelClassName="max-w-lg border-(--app-border) shadow-depth-xl"
      bodyClassName="p-5 space-y-4 no-scrollbar"
      footer={
        <ModalActions
          mode="action"
          submitText="تأكيد النقل لقوة الأفراد"
          cancelText="إلغاء"
          onCancel={onClose}
          onConfirm={handleSubmit}
          submitLoading={loading}
          submitDisabled={loading}
        />
      }
    >
      <ModalHeaderCard
        icon={<UserPlus className="w-6 h-6" />}
        title={
          singleStudent
            ? singleStudent.fullName
            : `نقل عدد (${selectedStudents.length}) جندي إلى قوة الأفراد`
        }
        subtitle={
          singleStudent
            ? `الرقم العسكري: ${singleStudent.militaryNo || singleStudent.studentId} | المرحلة: ${mrhlaName || mrhla}`
            : `المرحلة التجنيدية: ${mrhlaName || mrhla}`
        }
        badge={
          <ModalBadge icon={<ShieldCheck className="w-3.5 h-3.5" />}>
            ضم لقوة الأفراد
          </ModalBadge>
        }
      />

      <div className="p-3 bg-(--color-primary)/5 border border-(--color-primary)/20 rounded-xl text-xs font-bold text-(--color-primary)">
        يظل الجندي مسجلاً ضمن كشف الدفعة الأساسية مع تمييز حالته بـ (انتقل إلى قوة الأفراد)، ويتم استبعاده من تمام الطلبة المستجدين وإدراجه ضمن قوة أفراد الوحدة الدائمة.
      </div>

      <ModalSection title="بيانات أمر النقل والتسكين الداخلي">
        <div className="space-y-3">
          <DateField
            id="transfer-personnel-date"
            label="تاريخ النقل لقوة الأفراد"
            value={transferDate}
            onChange={setTransferDate}
            required
          />

          <div className="space-y-1.5">
            <label
              htmlFor="transfer-personnel-order-no"
              className="text-xs font-bold text-(--app-muted-foreground) block mr-1"
            >
              رقم وتاريخ أمر النقل والتصديق *
            </label>
            <input
              id="transfer-personnel-order-no"
              type="text"
              placeholder="مثال: أمر الوحدة اليومي رقم 85 لسنة 2026..."
              value={orderNo}
              onChange={(e) => setOrderNo(e.target.value)}
              className="w-full px-3 py-2 bg-(--app-surface) border border-(--app-border) rounded-xl text-xs font-bold text-(--app-foreground) focus:outline-none focus:ring-blue-500/20 focus:border-blue-500 transition-all text-right"
              required
            />
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor="transfer-personnel-role"
              className="text-xs font-bold text-(--app-muted-foreground) block mr-1"
            >
              الوظيفة / التسكين بالوحدة (اختياري)
            </label>
            <input
              id="transfer-personnel-role"
              type="text"
              placeholder="مثال: حكمدار / سائق / كاتب سرية..."
              value={assignedRole}
              onChange={(e) => setAssignedRole(e.target.value)}
              className="w-full px-3 py-2 bg-(--app-surface) border border-(--app-border) rounded-xl text-xs font-bold text-(--app-foreground) focus:outline-none focus:ring-blue-500/20 focus:border-blue-500 transition-all text-right"
            />
          </div>
        </div>
      </ModalSection>
    </ModalShell>
  );
}
