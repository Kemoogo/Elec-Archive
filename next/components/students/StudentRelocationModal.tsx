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
import { CustomSelect, type CustomSelectOption } from "@/components/ui/custom-select";
import { useToast } from "@/components/ui/toast";
import { Truck, Layers, Users } from "lucide-react";
import type { IStudentListItem, IBatchClassification } from "@/types/student";
import { DEFAULT_BATCH_CLASSIFICATIONS } from "@/types/student";

interface StudentRelocationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  mrhla: string;
  mrhlaName?: string;
  selectedStudents?: IStudentListItem[];
  classifications?: IBatchClassification[];
}

export function StudentRelocationModal({
  isOpen,
  onClose,
  onSuccess,
  mrhla,
  mrhlaName,
  selectedStudents = [],
  classifications = DEFAULT_BATCH_CLASSIFICATIONS,
}: StudentRelocationModalProps) {
  const { showToast } = useToast();

  const hasSelectedStudents = selectedStudents.length > 0;
  const [relocationMode, setRelocationMode] = useState<"selected" | "classification">(
    hasSelectedStudents ? "selected" : "classification"
  );
  const [prevHasSelected, setPrevHasSelected] = useState(hasSelectedStudents);
  if (hasSelectedStudents !== prevHasSelected) {
    setPrevHasSelected(hasSelectedStudents);
    setRelocationMode(hasSelectedStudents ? "selected" : "classification");
  }

  const activeClassifications = classifications.length > 0 ? classifications : DEFAULT_BATCH_CLASSIFICATIONS;
  const [classificationId, setClassificationId] = useState<string>(
    activeClassifications[0]?.id || "sig-nco"
  );
  const [destination, setDestination] = useState("");
  const [date, setDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [orderNo, setOrderNo] = useState("");
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const classificationOptions: CustomSelectOption[] = activeClassifications.map((c) => ({
    value: c.id,
    label: c.name,
  }));

  const handleSubmit = async () => {
    if (!mrhla) {
      showToast("يرجى تحديد المرحلة التجنيدية أولاً", "error");
      return;
    }

    if (relocationMode === "selected" && selectedStudents.length === 0) {
      showToast("لم يتم تحديد أي جنود للترحيل", "error");
      return;
    }

    if (relocationMode === "classification" && !classificationId) {
      showToast("يرجى اختيار التصنيف المراد ترحيله", "error");
      return;
    }

    if (!destination.trim()) {
      showToast("الجهة المرحل إليها مطلوبة", "error");
      return;
    }

    if (!date) {
      showToast("تاريخ الترحيل مطلوب", "error");
      return;
    }

    if (!orderNo.trim()) {
      showToast("رقم أمر الترحيل مطلوب", "error");
      return;
    }

    setLoading(true);
    try {
      const payload: Record<string, unknown> = {
        mrhla,
        destination: destination.trim(),
        date,
        orderNo: orderNo.trim(),
        reason: reason.trim() || undefined,
      };

      if (relocationMode === "selected") {
        payload.studentIds = selectedStudents.map((s) => s._id);
      } else {
        payload.classificationId = classificationId;
      }

      const res = await fetch("/api/students/relocate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        showToast(data.error || "فشل تنفيذ حركة الترحيل", "error");
        return;
      }

      showToast(data.message || "تم تسجيل حركة الترحيل بنجاح", "success");
      onSuccess();
      onClose();
    } catch {
      showToast("خطأ أثناء الاتصال بالخادم", "error");
    } finally {
      setLoading(false);
    }
  };

  const singleStudent = selectedStudents.length === 1 ? selectedStudents[0] : null;

  return (
    <ModalShell
      title="تسجيل حركة ترحيل خارج الوحدة"
      icon={<Truck className="w-4 h-4" />}
      onClose={onClose}
      overlayClassName="bg-black/40"
      panelClassName="max-w-lg border-(--app-border) shadow-depth-xl"
      bodyClassName="p-5 space-y-4 no-scrollbar"
      footer={
        <ModalActions
          mode="action"
          submitText="تأكيد الترحيل"
          cancelText="إلغاء"
          onCancel={onClose}
          onConfirm={handleSubmit}
          submitLoading={loading}
          submitDisabled={loading}
        />
      }
    >
      <ModalHeaderCard
        icon={<Truck className="w-6 h-6" />}
        title={
          relocationMode === "selected" && singleStudent
            ? singleStudent.fullName
            : relocationMode === "selected"
              ? `ترحيل عدد (${selectedStudents.length}) جندي محدد`
              : "ترحيل تصنيف تخصصي كامل"
        }
        subtitle={
          relocationMode === "selected" && singleStudent
            ? `الرقم العسكري: ${singleStudent.militaryNo || singleStudent.studentId} | المرحلة: ${mrhlaName || mrhla}`
            : `المرحلة التجنيدية: ${mrhlaName || mrhla}`
        }
        badge={
          <ModalBadge icon={<Layers className="w-3.5 h-3.5" />}>
            حركة ترحيل
          </ModalBadge>
        }
      />

      <div className="p-3 bg-(--color-primary)/5 border border-(--color-primary)/20 rounded-xl text-xs font-bold text-(--color-primary)">
        يظل الجندي مسجلاً ضمن كشف الدفعة الأساسية مع تمييز حالته بـ (تم ترحيله)، ويتم استبعاده تلقائياً من حساب القوة الفعلية والتمام اليومي بالوحدة.
      </div>

      {/* Mode Switcher */}
      <div className="inline-flex w-full bg-(--app-surface-container) p-1 rounded-xl border border-(--app-border)">
        <button
          type="button"
          onClick={() => setRelocationMode("selected")}
          disabled={!hasSelectedStudents}
          className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer disabled:opacity-40 ${
            relocationMode === "selected"
              ? "bg-(--color-primary) text-white shadow-xs"
              : "text-(--app-muted-foreground) hover:text-(--color-primary)"
          }`}
        >
          <Users className="w-3.5 h-3.5" />
          <span>جنود محددين ({selectedStudents.length})</span>
        </button>
        <button
          type="button"
          onClick={() => setRelocationMode("classification")}
          className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
            relocationMode === "classification"
              ? "bg-(--color-primary) text-white shadow-xs"
              : "text-(--app-muted-foreground) hover:text-(--color-primary)"
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>ترحيل تصنيف كامل</span>
        </button>
      </div>

      <ModalSection title="بيانات أمر الترحيل والجهة">
        <div className="space-y-3">
          {relocationMode === "classification" && (
            <CustomSelect
              id="relocate-classification"
              label="التصنيف التخصصي المراد ترحيله"
              value={classificationId}
              onChange={setClassificationId}
              options={classificationOptions}
              placeholder="اختر التصنيف..."
              required
            />
          )}

          <div className="space-y-1.5">
            <label
              htmlFor="relocate-destination"
              className="text-xs font-bold text-(--app-muted-foreground) block mr-1"
            >
              الجهة المرحل إليها *
            </label>
            <input
              id="relocate-destination"
              type="text"
              placeholder="مثال: إدارة الإشارة / اللواء الأول إشارة..."
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
              className="w-full px-3 py-2 bg-(--app-surface) border border-(--app-border) rounded-xl text-xs font-bold text-(--app-foreground) focus:outline-none focus:ring-blue-500/20 focus:border-blue-500 transition-all text-right"
              required
            />
          </div>

          <DateField
            id="relocate-date"
            label="تاريخ الترحيل"
            value={date}
            onChange={setDate}
            required
          />

          <div className="space-y-1.5">
            <label
              htmlFor="relocate-order-no"
              className="text-xs font-bold text-(--app-muted-foreground) block mr-1"
            >
              رقم وتاريخ أمر الترحيل والتصديق *
            </label>
            <input
              id="relocate-order-no"
              type="text"
              placeholder="مثال: نشرة التوزيع والترحيل رقم 112 لسنة 2026..."
              value={orderNo}
              onChange={(e) => setOrderNo(e.target.value)}
              className="w-full px-3 py-2 bg-(--app-surface) border border-(--app-border) rounded-xl text-xs font-bold text-(--app-foreground) focus:outline-none focus:ring-blue-500/20 focus:border-blue-500 transition-all text-right"
              required
            />
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor="relocate-reason"
              className="text-xs font-bold text-(--app-muted-foreground) block mr-1"
            >
              ملاحظات / سبب الترحيل (اختياري)
            </label>
            <textarea
              id="relocate-reason"
              rows={2}
              placeholder="أي تفاصيل إضافية بخصوص حركة الترحيل..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full px-3 py-2 bg-(--app-surface) border border-(--app-border) rounded-xl text-xs font-bold text-(--app-foreground) focus:outline-none focus:ring-blue-500/20 focus:border-blue-500 transition-all text-right"
            />
          </div>
        </div>
      </ModalSection>
    </ModalShell>
  );
}
