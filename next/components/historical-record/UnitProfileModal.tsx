"use client";

import React, { useEffect, useMemo, useState } from "react";
import { ImagePlus, Landmark, Shield, Trash2 } from "lucide-react";
import { ModalShell } from "@/components/ui/modal-shell";
import { ModalActions } from "@/components/ui/modal-actions";
import { DateField } from "@/components/ui/date-field";
import { FormField, FormInput, FormLabel, FormTextarea } from "@/components/ui/form-fields";
import { useToast } from "@/components/ui/toast";
import { validateHistoricalImageFile } from "@/lib/historical-record/client-files";
import { extractApiError } from "@/lib/utils";
import type { UnitHistoricalProfileDTO } from "@/types/historical-record";
import { HistoricalGovernanceModal } from "./HistoricalGovernanceModal";

interface UnitProfileModalProps {
  profile: UnitHistoricalProfileDTO | null;
  onClose: () => void;
  onSaved: (profile: UnitHistoricalProfileDTO) => void;
}

export function UnitProfileModal({
  profile,
  onClose,
  onSaved,
}: UnitProfileModalProps) {
  const { showToast } = useToast();
  const isUpdate = Boolean(profile);
  const formId = "unit-profile-form";

  const [unitName, setUnitName] = useState(profile?.unitName ?? "");
  const [foundingDate, setFoundingDate] = useState(
    profile?.foundingDate ?? "",
  );
  const [affiliation, setAffiliation] = useState(profile?.affiliation ?? "");
  const [location, setLocation] = useState(profile?.location ?? "");
  const [motto, setMotto] = useState(profile?.motto ?? "");
  const [mission, setMission] = useState(profile?.mission ?? "");

  const [emblemFile, setEmblemFile] = useState<File | null>(null);
  const [removeEmblem, setRemoveEmblem] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showGovernance, setShowGovernance] = useState(false);

  const emblemPreview = useMemo(
    () => (emblemFile ? URL.createObjectURL(emblemFile) : null),
    [emblemFile],
  );

  useEffect(() => {
    return () => {
      if (emblemPreview) URL.revokeObjectURL(emblemPreview);
    };
  }, [emblemPreview]);

  const isDirty = useMemo(() => {
    if (!profile) {
      return Boolean(
        unitName.trim() ||
          foundingDate ||
          affiliation.trim() ||
          location.trim() ||
          motto.trim() ||
          mission.trim() ||
          emblemFile,
      );
    }
    return (
      unitName.trim() !== profile.unitName ||
      foundingDate !== (profile.foundingDate ?? "") ||
      affiliation.trim() !== (profile.affiliation ?? "") ||
      location.trim() !== (profile.location ?? "") ||
      motto.trim() !== (profile.motto ?? "") ||
      mission.trim() !== (profile.mission ?? "") ||
      emblemFile !== null ||
      removeEmblem
    );
  }, [
    profile,
    unitName,
    foundingDate,
    affiliation,
    location,
    motto,
    mission,
    emblemFile,
    removeEmblem,
  ]);

  function handleEmblemSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    const fileError = validateHistoricalImageFile(file, "شعار الوحدة");
    if (fileError) {
      showToast(fileError, "error");
      return;
    }
    setEmblemFile(file);
    setRemoveEmblem(false);
  }

  async function sendPutRequest(gov?: { reason: string; confirmed: true }) {
    setSaving(true);
    try {
      const formData = new FormData();
      formData.append("unitName", unitName.trim());
      formData.append("foundingDate", foundingDate);
      formData.append("affiliation", affiliation.trim());
      formData.append("location", location.trim());
      formData.append("motto", motto.trim());
      formData.append("mission", mission.trim());
      formData.append("removeEmblem", String(removeEmblem));
      if (emblemFile) {
        formData.append("emblem", emblemFile);
      }
      if (gov) {
        formData.append("reason", gov.reason);
        formData.append("confirmed", "true");
      }

      const res = await fetch("/api/historical-record/unit-profile", {
        method: "PUT",
        body: formData,
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        showToast(extractApiError(json, "فشل حفظ بطاقة معلومات الوحدة"), "error");
        return;
      }
      showToast(
        isUpdate
          ? "تم تحديث بطاقة معلومات الوحدة بنجاح"
          : "تم تأسيس بطاقة معلومات الوحدة بنجاح",
        "success",
      );
      setShowGovernance(false);
      onSaved(json.data as UnitHistoricalProfileDTO);
    } catch {
      showToast("حدث خطأ أثناء الاتصال بالخادم", "error");
    } finally {
      setSaving(false);
    }
  }

  async function handleFormSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (unitName.trim().length < 2) {
      showToast("يرجى إدخال الاسم الرسمي للوحدة (حرفين على الأقل)", "error");
      return;
    }
    if (isUpdate) {
      setShowGovernance(true);
      return;
    }
    await sendPutRequest();
  }

  const displayedEmblem =
    emblemPreview ?? (removeEmblem ? null : (profile?.emblemUrl ?? null));

  if (showGovernance && profile) {
    return (
      <HistoricalGovernanceModal
        mode="update"
        entityLabel="بطاقة معلومات الوحدة"
        recordTitle={unitName.trim() || profile.unitName}
        loading={saving}
        onCancel={() => setShowGovernance(false)}
        onConfirm={sendPutRequest}
      />
    );
  }

  return (
    <ModalShell
      title={
        isUpdate
          ? "تعديل البطاقة التعريفية للوحدة"
          : "تأسيس البطاقة التعريفية للوحدة"
      }
      icon={<Landmark className="w-4 h-4 text-(--color-primary)" />}
      onClose={onClose}
      closeOnOverlayClick={!saving}
      overlayClassName="bg-black/40"
      panelClassName="max-w-2xl"
      footer={
        <ModalActions
          mode="action"
          form={formId}
          submitText={
            isUpdate ? "متابعة للتأكيد المزدوج" : "حفظ البطاقة التعريفية"
          }
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
          <FormField label="الاسم الرسمي للوحدة" required>
            <FormInput
              value={unitName}
              onChange={(e) => setUnitName(e.target.value)}
              placeholder="مثال: مركز تدريب الحرب الإلكترونية..."
              maxLength={200}
              disabled={saving}
            />
          </FormField>

          <DateField
            id="unit-founding-date"
            label="تاريخ النشأة / التأسيس"
            value={foundingDate}
            onChange={setFoundingDate}
            disabled={saving}
            showDayName
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField label="التبعية التنظيمية">
            <FormInput
              value={affiliation}
              onChange={(e) => setAffiliation(e.target.value)}
              placeholder="مثال: إدارة الحرب الإلكترونية..."
              maxLength={200}
              disabled={saving}
            />
          </FormField>

          <FormField label="الموقع / التمركز">
            <FormInput
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="موقع تمركز الوحدة..."
              maxLength={200}
              disabled={saving}
            />
          </FormField>
        </div>

        <FormField label="الشعار النصي للوحدة">
          <FormInput
            value={motto}
            onChange={(e) => setMotto(e.target.value)}
            placeholder="الشعار الرسمي أو الكلمة المأثورة للوحدة..."
            maxLength={300}
            disabled={saving}
          />
        </FormField>

        <FormField label="المهمة الرئيسية للوحدة">
          <FormTextarea
            value={mission}
            onChange={(e) => setMission(e.target.value)}
            placeholder="وصف الدور والمهام العملياتية والتدريبية للوحدة..."
            rows={3}
            maxLength={2000}
            disabled={saving}
          />
        </FormField>

        {/* Emblem Upload */}
        <div className="space-y-2">
          <FormLabel>
            شعار / صورة الوحدة (JPG / PNG / WebP — حتى 10 ميجابايت)
          </FormLabel>
          <div className="flex flex-wrap items-center gap-3">
            <div className="w-16 h-16 rounded-xl overflow-hidden border border-(--app-border) bg-(--app-surface-container) flex items-center justify-center shrink-0">
              {displayedEmblem ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={displayedEmblem}
                  alt="شعار الوحدة"
                  className="w-full h-full object-contain"
                />
              ) : (
                <Shield className="w-7 h-7 text-(--color-primary)/60" />
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <label className="btn-secondary text-xs inline-flex items-center gap-1.5 px-3 py-2 cursor-pointer">
                <ImagePlus className="w-3.5 h-3.5 text-(--color-primary)" />
                <span>{emblemFile ? "تغيير الشعار" : "رفع شعار الوحدة"}</span>
                <input
                  type="file"
                  accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
                  onChange={handleEmblemSelected}
                  disabled={saving}
                  className="hidden"
                />
              </label>

              {emblemFile && (
                <button
                  type="button"
                  onClick={() => setEmblemFile(null)}
                  className="btn-secondary text-xs px-3 py-2 cursor-pointer"
                >
                  إلغاء الملف المحدد
                </button>
              )}

              {profile?.emblemUrl && !emblemFile && (
                <button
                  type="button"
                  onClick={() => setRemoveEmblem((prev) => !prev)}
                  className="btn-secondary text-xs inline-flex items-center gap-1.5 px-3 py-2 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5 text-(--color-primary)" />
                  <span>
                    {removeEmblem ? "تراجع عن الإزالة" : "إزالة الشعار الحالي"}
                  </span>
                </button>
              )}
            </div>
          </div>
        </div>
      </form>
    </ModalShell>
  );
}
