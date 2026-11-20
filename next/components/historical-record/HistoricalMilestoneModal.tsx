"use client";

import React, { useMemo, useState } from "react";
import { Flag } from "lucide-react";
import { ModalShell } from "@/components/ui/modal-shell";
import { ModalActions } from "@/components/ui/modal-actions";
import { CustomSelect, type CustomSelectOption } from "@/components/ui/custom-select";
import { DateField } from "@/components/ui/date-field";
import { FormField, FormInput, FormTextarea } from "@/components/ui/form-fields";
import { useToast } from "@/components/ui/toast";
import { extractApiError } from "@/lib/utils";
import {
  UNIT_MILESTONE_CATEGORIES,
  UNIT_MILESTONE_CATEGORY_LABELS,
  type UnitHistoricalMilestoneDTO,
  type UnitMilestoneCategory,
} from "@/types/historical-record";
import { MultiPhotoPicker } from "./MultiPhotoPicker";
import { HistoricalGovernanceModal } from "./HistoricalGovernanceModal";

interface HistoricalMilestoneModalProps {
  milestone?: UnitHistoricalMilestoneDTO | null;
  onClose: () => void;
  onSaved: (milestone: UnitHistoricalMilestoneDTO, isEdit: boolean) => void;
}

const CATEGORY_OPTIONS: CustomSelectOption[] = UNIT_MILESTONE_CATEGORIES.map(
  (cat) => ({
    value: cat,
    label: UNIT_MILESTONE_CATEGORY_LABELS[cat],
  }),
);

export function HistoricalMilestoneModal({
  milestone,
  onClose,
  onSaved,
}: HistoricalMilestoneModalProps) {
  const { showToast } = useToast();
  const isEdit = Boolean(milestone);
  const formId = "historical-milestone-form";

  const [title, setTitle] = useState(milestone?.title ?? "");
  const [milestoneDate, setMilestoneDate] = useState(
    milestone?.milestoneDate ?? "",
  );
  const [category, setCategory] = useState<UnitMilestoneCategory>(
    milestone?.category ?? "founding",
  );
  const [description, setDescription] = useState(milestone?.description ?? "");
  const [keptPhotos, setKeptPhotos] = useState<string[]>(
    milestone?.photos ?? [],
  );
  const [newFiles, setNewFiles] = useState<File[]>([]);
  const [saving, setSaving] = useState(false);
  const [showGovernance, setShowGovernance] = useState(false);

  const isDirty = useMemo(() => {
    if (!milestone) {
      return Boolean(
        title.trim() || milestoneDate || description.trim() || newFiles.length > 0,
      );
    }
    const existingPhotos = milestone.photos ?? [];
    const photosChanged =
      keptPhotos.length !== existingPhotos.length ||
      keptPhotos.some((p, idx) => p !== existingPhotos[idx]) ||
      newFiles.length > 0;
    return (
      title.trim() !== milestone.title ||
      milestoneDate !== milestone.milestoneDate ||
      category !== milestone.category ||
      description.trim() !== (milestone.description ?? "") ||
      photosChanged
    );
  }, [
    milestone,
    title,
    milestoneDate,
    category,
    description,
    keptPhotos,
    newFiles,
  ]);

  function handleToggleKeepPhoto(url: string) {
    setKeptPhotos((prev) =>
      prev.includes(url) ? prev.filter((p) => p !== url) : [...prev, url],
    );
  }

  function validateForm(): boolean {
    if (title.trim().length < 2) {
      showToast("يرجى إدخال عنوان المحطة التاريخية (حرفين على الأقل)", "error");
      return false;
    }
    if (!milestoneDate) {
      showToast("يرجى تحديد تاريخ الحدث", "error");
      return false;
    }
    return true;
  }

  async function handleFormSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validateForm()) return;

    if (isEdit) {
      setShowGovernance(true);
      return;
    }

    setSaving(true);
    try {
      const formData = new FormData();
      formData.append("title", title.trim());
      formData.append("milestoneDate", milestoneDate);
      formData.append("category", category);
      formData.append("description", description.trim());
      for (const file of newFiles) {
        formData.append("photos", file);
      }

      const res = await fetch("/api/historical-record/milestones", {
        method: "POST",
        body: formData,
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        showToast(extractApiError(json, "فشل تسجيل المحطة التاريخية"), "error");
        return;
      }
      showToast("تم إضافة المحطة التاريخية بنجاح", "success");
      onSaved(json.data as UnitHistoricalMilestoneDTO, false);
    } catch {
      showToast("حدث خطأ أثناء الاتصال بالخادم", "error");
    } finally {
      setSaving(false);
    }
  }

  async function handleConfirmEdit(gov: { reason: string; confirmed: true }) {
    if (!milestone) return;
    setSaving(true);
    try {
      const formData = new FormData();
      formData.append("title", title.trim());
      formData.append("milestoneDate", milestoneDate);
      formData.append("category", category);
      formData.append("description", description.trim());
      formData.append("keepPhotos", JSON.stringify(keptPhotos));
      formData.append("reason", gov.reason);
      formData.append("confirmed", "true");
      for (const file of newFiles) {
        formData.append("newPhotos", file);
      }

      const res = await fetch(
        `/api/historical-record/milestones/${milestone.id}`,
        {
          method: "PATCH",
          body: formData,
        },
      );
      const json = await res.json();
      if (!res.ok || !json.success) {
        showToast(extractApiError(json, "فشل تعديل المحطة التاريخية"), "error");
        return;
      }
      showToast("تم تعديل المحطة التاريخية بنجاح", "success");
      setShowGovernance(false);
      onSaved(json.data as UnitHistoricalMilestoneDTO, true);
    } catch {
      showToast("حدث خطأ أثناء الاتصال بالخادم", "error");
    } finally {
      setSaving(false);
    }
  }

  if (showGovernance && milestone) {
    return (
      <HistoricalGovernanceModal
        mode="update"
        entityLabel="المحطة التاريخية"
        recordTitle={milestone.title}
        loading={saving}
        onCancel={() => setShowGovernance(false)}
        onConfirm={handleConfirmEdit}
      />
    );
  }

  return (
    <ModalShell
      title={isEdit ? "تعديل محطة تاريخية محفوظة" : "إضافة محطة تاريخية للوحدة"}
      icon={<Flag className="w-4 h-4 text-(--color-primary)" />}
      onClose={onClose}
      closeOnOverlayClick={!saving}
      overlayClassName="bg-black/40"
      panelClassName="max-w-2xl"
      footer={
        <ModalActions
          mode="action"
          form={formId}
          submitText={isEdit ? "متابعة للتأكيد المزدوج" : "حفظ المحطة"}
          submitLoading={saving}
          isDirty={isDirty}
          cancelText="إلغاء"
          onCancel={onClose}
        />
      }
    >
      <form
        id={formId}
        onSubmit={handleFormSubmit}
        className="space-y-4"
        dir="rtl"
      >
        <FormField label="عنوان الحدث / المحطة التاريخية" required>
          <FormInput
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="مثال: افتتاح المنظومة الرقمية / حصول الوحدة على وسام التميز"
            maxLength={200}
            disabled={saving}
          />
        </FormField>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <DateField
            id="milestone-date"
            label="تاريخ الحدث"
            value={milestoneDate}
            onChange={setMilestoneDate}
            required
            disabled={saving}
            showDayName
          />

          <CustomSelect
            id="milestone-category"
            label="تصنيف المحطة"
            value={category}
            onChange={(val) => setCategory(val as UnitMilestoneCategory)}
            options={CATEGORY_OPTIONS}
            disabled={saving}
            required
          />
        </div>

        <FormField label="تفاصيل الحدث وأهميته التاريخية">
          <FormTextarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="شرح موثق لأهم تفاصيل المحطة وأثرها..."
            rows={3}
            maxLength={4000}
            disabled={saving}
          />
        </FormField>

        <MultiPhotoPicker
          existingPhotos={milestone?.photos ?? []}
          keptPhotos={keptPhotos}
          onToggleKeepPhoto={isEdit ? handleToggleKeepPhoto : undefined}
          newFiles={newFiles}
          onNewFilesChange={setNewFiles}
          disabled={saving}
          label="صور توثيقية (اختيارية)"
        />
      </form>
    </ModalShell>
  );
}
