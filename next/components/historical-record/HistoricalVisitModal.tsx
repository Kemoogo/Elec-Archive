"use client";

import React, { useMemo, useState } from "react";
import { Calendar } from "lucide-react";
import { ModalShell } from "@/components/ui/modal-shell";
import { ModalActions } from "@/components/ui/modal-actions";
import { DateField } from "@/components/ui/date-field";
import { FormField, FormInput, FormTextarea } from "@/components/ui/form-fields";
import { useToast } from "@/components/ui/toast";
import { extractApiError } from "@/lib/utils";
import type { HistoricalVisitDTO } from "@/types/historical-record";
import { MultiPhotoPicker } from "./MultiPhotoPicker";
import { HistoricalGovernanceModal } from "./HistoricalGovernanceModal";

interface HistoricalVisitModalProps {
  visit?: HistoricalVisitDTO | null;
  onClose: () => void;
  onSaved: (visit: HistoricalVisitDTO, isEdit: boolean) => void;
}

export function HistoricalVisitModal({
  visit,
  onClose,
  onSaved,
}: HistoricalVisitModalProps) {
  const { showToast } = useToast();
  const isEdit = Boolean(visit);
  const formId = "historical-visit-form";

  const [title, setTitle] = useState(visit?.title ?? "");
  const [visitorName, setVisitorName] = useState(visit?.visitorName ?? "");
  const [visitDate, setVisitDate] = useState(visit?.visitDate ?? "");
  const [description, setDescription] = useState(visit?.description ?? "");
  const [keptPhotos, setKeptPhotos] = useState<string[]>(visit?.photos ?? []);
  const [newFiles, setNewFiles] = useState<File[]>([]);
  const [saving, setSaving] = useState(false);
  const [showGovernance, setShowGovernance] = useState(false);

  const isDirty = useMemo(() => {
    if (!visit) {
      return Boolean(
        title.trim() ||
          visitorName.trim() ||
          visitDate ||
          description.trim() ||
          newFiles.length > 0,
      );
    }
    const existingPhotos = visit.photos ?? [];
    const photosChanged =
      keptPhotos.length !== existingPhotos.length ||
      keptPhotos.some((p, i) => p !== existingPhotos[i]) ||
      newFiles.length > 0;
    return (
      title.trim() !== visit.title ||
      visitorName.trim() !== visit.visitorName ||
      visitDate !== visit.visitDate ||
      description.trim() !== (visit.description ?? "") ||
      photosChanged
    );
  }, [visit, title, visitorName, visitDate, description, keptPhotos, newFiles]);

  function handleToggleKeepPhoto(url: string) {
    setKeptPhotos((prev) =>
      prev.includes(url) ? prev.filter((p) => p !== url) : [...prev, url],
    );
  }

  function validateForm(): boolean {
    if (title.trim().length < 2) {
      showToast("يرجى إدخال عنوان الزيارة (حرفين على الأقل)", "error");
      return false;
    }
    if (visitorName.trim().length < 2) {
      showToast("يرجى إدخال اسم الزائر أو الوفد (حرفين على الأقل)", "error");
      return false;
    }
    if (!visitDate) {
      showToast("يرجى تحديد تاريخ الزيارة", "error");
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
      formData.append("visitorName", visitorName.trim());
      formData.append("visitDate", visitDate);
      formData.append("description", description.trim());
      for (const file of newFiles) {
        formData.append("photos", file);
      }

      const res = await fetch("/api/historical-record/visits", {
        method: "POST",
        body: formData,
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        showToast(extractApiError(json, "فشل تسجيل الزيارة"), "error");
        return;
      }
      showToast("تم تسجيل الزيارة التاريخية بنجاح", "success");
      onSaved(json.data as HistoricalVisitDTO, false);
    } catch {
      showToast("حدث خطأ أثناء الاتصال بالخادم", "error");
    } finally {
      setSaving(false);
    }
  }

  async function handleConfirmEdit(gov: { reason: string; confirmed: true }) {
    if (!visit) return;
    setSaving(true);
    try {
      const formData = new FormData();
      formData.append("title", title.trim());
      formData.append("visitorName", visitorName.trim());
      formData.append("visitDate", visitDate);
      formData.append("description", description.trim());
      formData.append("keepPhotos", JSON.stringify(keptPhotos));
      formData.append("reason", gov.reason);
      formData.append("confirmed", "true");
      for (const file of newFiles) {
        formData.append("newPhotos", file);
      }

      const res = await fetch(`/api/historical-record/visits/${visit.id}`, {
        method: "PATCH",
        body: formData,
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        showToast(extractApiError(json, "فشل تعديل الزيارة"), "error");
        return;
      }
      showToast("تم تعديل الزيارة التاريخية بنجاح", "success");
      setShowGovernance(false);
      onSaved(json.data as HistoricalVisitDTO, true);
    } catch {
      showToast("حدث خطأ أثناء الاتصال بالخادم", "error");
    } finally {
      setSaving(false);
    }
  }

  if (showGovernance && visit) {
    return (
      <HistoricalGovernanceModal
        mode="update"
        entityLabel="الزيارة التاريخية"
        recordTitle={visit.title}
        loading={saving}
        onCancel={() => setShowGovernance(false)}
        onConfirm={handleConfirmEdit}
      />
    );
  }

  return (
    <ModalShell
      title={isEdit ? "تعديل زيارة هامة محفوظة" : "تسجيل زيارة هامة جديدة"}
      icon={<Calendar className="w-4 h-4 text-(--color-primary)" />}
      onClose={onClose}
      closeOnOverlayClick={!saving}
      overlayClassName="bg-black/40"
      panelClassName="max-w-2xl"
      footer={
        <ModalActions
          mode="action"
          form={formId}
          submitText={isEdit ? "متابعة للتأكيد المزدوج" : "حفظ الزيارة"}
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
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField label="عنوان الزيارة" required>
            <FormInput
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="مثال: زيارة تفقدية للسيد قائد القوات"
              maxLength={200}
              disabled={saving}
            />
          </FormField>

          <DateField
            id="historical-visit-date"
            label="تاريخ الزيارة"
            value={visitDate}
            onChange={setVisitDate}
            required
            disabled={saving}
            showDayName
          />
        </div>

        <FormField label="اسم الزائر / الوفد الرسمي" required>
          <FormInput
            value={visitorName}
            onChange={(e) => setVisitorName(e.target.value)}
            placeholder="الرتبة / الصفة / الجهة الزائرة"
            maxLength={200}
            disabled={saving}
          />
        </FormField>

        <FormField label="تفاصيل الزيارة وأبرز التوجيهات">
          <FormTextarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="وصف مختصر لأهم وقائع الزيارة ونتائجها..."
            rows={3}
            maxLength={4000}
            disabled={saving}
          />
        </FormField>

        <MultiPhotoPicker
          existingPhotos={visit?.photos ?? []}
          keptPhotos={keptPhotos}
          onToggleKeepPhoto={isEdit ? handleToggleKeepPhoto : undefined}
          newFiles={newFiles}
          onNewFilesChange={setNewFiles}
          disabled={saving}
          label="صور الزيارة"
        />
      </form>
    </ModalShell>
  );
}
