"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Award, CheckSquare, ImagePlus, Shield, Square, Trash2, User } from "lucide-react";
import { ModalShell } from "@/components/ui/modal-shell";
import { ModalActions } from "@/components/ui/modal-actions";
import { CustomSelect, type CustomSelectOption } from "@/components/ui/custom-select";
import { DateField } from "@/components/ui/date-field";
import { FormField, FormInput, FormLabel, FormTextarea } from "@/components/ui/form-fields";
import { useToast } from "@/components/ui/toast";
import { validateHistoricalImageFile } from "@/lib/historical-record/client-files";
import { calculateCommandDuration } from "@/lib/historical-record/duration";
import { extractApiError } from "@/lib/utils";
import type {
  HistoricalCommanderDTO,
  HistoricalOfficerOptionDTO,
} from "@/types/historical-record";
import { HistoricalGovernanceModal } from "./HistoricalGovernanceModal";

interface HistoricalCommanderModalProps {
  commander?: HistoricalCommanderDTO | null;
  activeCurrentCommander: HistoricalCommanderDTO | null;
  onClose: () => void;
  onSaved: (saved: HistoricalCommanderDTO, isEdit: boolean) => void;
}

export function HistoricalCommanderModal({
  commander,
  activeCurrentCommander,
  onClose,
  onSaved,
}: HistoricalCommanderModalProps) {
  const { showToast } = useToast();
  const isEdit = Boolean(commander);
  const formId = "historical-commander-form";

  const [officerOptions, setOfficerOptions] = useState<HistoricalOfficerOptionDTO[]>([]);
  const [loadingOfficers, setLoadingOfficers] = useState(!isEdit);
  const [selectedOfficerId, setSelectedOfficerId] = useState(
    commander?.officerId ?? "",
  );

  // Admin-editable snapshot fields (in Edit mode)
  const [snapFullName, setSnapFullName] = useState(
    commander?.officerSnapshot.fullName ?? "",
  );
  const [snapMilitaryId, setSnapMilitaryId] = useState(
    commander?.officerSnapshot.militaryId ?? "",
  );
  const [snapRank, setSnapRank] = useState(
    commander?.officerSnapshot.rank ?? "",
  );
  const [snapSeniority, setSnapSeniority] = useState(
    commander?.officerSnapshot.seniorityNumber ?? "",
  );

  const [startDate, setStartDate] = useState(commander?.startDate ?? "");
  const [isCurrent, setIsCurrent] = useState(commander?.isCurrent ?? false);
  const [endDate, setEndDate] = useState(commander?.endDate ?? "");
  const [previousCommanderEndDate, setPreviousCommanderEndDate] = useState(
    commander?.startDate ?? "",
  );
  const [prevEndEditedManually, setPrevEndEditedManually] = useState(false);
  const [notes, setNotes] = useState(commander?.notes ?? "");

  const [customPhotoFile, setCustomPhotoFile] = useState<File | null>(null);
  const [removeExistingPhoto, setRemoveExistingPhoto] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showGovernance, setShowGovernance] = useState(false);

  const customPhotoPreview = useMemo(
    () => (customPhotoFile ? URL.createObjectURL(customPhotoFile) : null),
    [customPhotoFile],
  );

  useEffect(() => {
    return () => {
      if (customPhotoPreview) URL.revokeObjectURL(customPhotoPreview);
    };
  }, [customPhotoPreview]);

  useEffect(() => {
    if (isEdit) return;
    let cancelled = false;
    async function loadOfficers() {
      setLoadingOfficers(true);
      try {
        const res = await fetch("/api/historical-record/officers-options");
        const json = await res.json();
        if (!cancelled && res.ok && json.success) {
          setOfficerOptions(json.data as HistoricalOfficerOptionDTO[]);
        } else if (!cancelled) {
          showToast(extractApiError(json, "فشل تحميل قائمة الضباط"), "error");
        }
      } catch {
        if (!cancelled) {
          showToast("تعذر تحميل قائمة الضباط", "error");
        }
      } finally {
        if (!cancelled) setLoadingOfficers(false);
      }
    }
    void loadOfficers();
    return () => {
      cancelled = true;
    };
  }, [isEdit, showToast]);

  const needsPreviousClosure = useMemo(() => {
    if (!isCurrent || !activeCurrentCommander) return false;
    if (isEdit && commander && activeCurrentCommander.id === commander.id) {
      return false;
    }
    return true;
  }, [isCurrent, activeCurrentCommander, isEdit, commander]);

  const effectivePreviousCommanderEndDate = needsPreviousClosure
    ? prevEndEditedManually
      ? previousCommanderEndDate
      : startDate
    : "";

  const selectedOfficer = useMemo(
    () => officerOptions.find((o) => o.id === selectedOfficerId) ?? null,
    [officerOptions, selectedOfficerId],
  );

  const selectOptions: CustomSelectOption[] = useMemo(
    () =>
      officerOptions.map((o) => ({
        value: o.id,
        label: `${o.rankLabel} / ${o.fullName}`,
        description: `الرقم العسكري: ${o.militaryId}${o.seniorityNumber ? ` — الأقدمية: ${o.seniorityNumber}` : ""}`,
        badge: o.isInUnit ? "بالوحدة" : "سابق / مؤرشف",
      })),
    [officerOptions],
  );

  const liveDuration = useMemo(() => {
    if (!startDate) return "";
    if (!isCurrent && !endDate) return "";
    return calculateCommandDuration(startDate, endDate, isCurrent);
  }, [startDate, endDate, isCurrent]);

  const isDirty = useMemo(() => {
    if (!commander) {
      return Boolean(
        selectedOfficerId ||
          startDate ||
          endDate ||
          isCurrent ||
          notes.trim() ||
          customPhotoFile,
      );
    }
    return (
      snapFullName.trim() !== commander.officerSnapshot.fullName ||
      snapMilitaryId.trim() !== commander.officerSnapshot.militaryId ||
      snapRank.trim() !== commander.officerSnapshot.rank ||
      snapSeniority.trim() !== (commander.officerSnapshot.seniorityNumber ?? "") ||
      startDate !== commander.startDate ||
      isCurrent !== commander.isCurrent ||
      (!isCurrent && endDate !== (commander.endDate ?? "")) ||
      notes.trim() !== (commander.notes ?? "") ||
      customPhotoFile !== null ||
      removeExistingPhoto
    );
  }, [
    commander,
    selectedOfficerId,
    snapFullName,
    snapMilitaryId,
    snapRank,
    snapSeniority,
    startDate,
    isCurrent,
    endDate,
    notes,
    customPhotoFile,
    removeExistingPhoto,
  ]);

  function handleCustomPhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    const fileError = validateHistoricalImageFile(file, "صورة القائد");
    if (fileError) {
      showToast(fileError, "error");
      return;
    }
    setCustomPhotoFile(file);
    setRemoveExistingPhoto(false);
  }

  function validateForm(): boolean {
    if (!isEdit && !selectedOfficerId) {
      showToast("يرجى اختيار الضابط من القائمة الشاملة", "error");
      return false;
    }
    if (isEdit) {
      if (snapFullName.trim().length < 2) {
        showToast("الاسم الكامل للقائد مطلوب", "error");
        return false;
      }
      if (!snapMilitaryId.trim()) {
        showToast("الرقم العسكري مطلوب", "error");
        return false;
      }
      if (!snapRank.trim()) {
        showToast("الرتبة مطلوبة", "error");
        return false;
      }
    }
    if (!startDate) {
      showToast("يرجى تحديد تاريخ تولي القيادة", "error");
      return false;
    }
    if (!isCurrent) {
      if (!endDate) {
        showToast("يرجى تحديد تاريخ انتهاء القيادة أو تفعيل خيار (حتى الآن)", "error");
        return false;
      }
      if (endDate < startDate) {
        showToast("تاريخ انتهاء القيادة لا يمكن أن يسبق تاريخ تولي القيادة", "error");
        return false;
      }
    }
    if (needsPreviousClosure && activeCurrentCommander) {
      if (!effectivePreviousCommanderEndDate) {
        showToast("يرجى تحديد تاريخ انتهاء قيادة القائد الحالي السابق", "error");
        return false;
      }
      if (effectivePreviousCommanderEndDate < activeCurrentCommander.startDate) {
        showToast(
          "تاريخ انتهاء القائد الحالي السابق لا يمكن أن يسبق تاريخ بداية قيادته",
          "error",
        );
        return false;
      }
      if (effectivePreviousCommanderEndDate > startDate) {
        showToast(
          "تاريخ انتهاء القائد الحالي السابق يجب ألا يتجاوز تاريخ تولي القائد الجديد",
          "error",
        );
        return false;
      }
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
      formData.append("officerId", selectedOfficerId);
      formData.append("startDate", startDate);
      formData.append("isCurrent", String(isCurrent));
      if (!isCurrent && endDate) {
        formData.append("endDate", endDate);
      }
      if (needsPreviousClosure && effectivePreviousCommanderEndDate) {
        formData.append(
          "previousCommanderEndDate",
          effectivePreviousCommanderEndDate,
        );
      }
      formData.append("notes", notes.trim());
      if (customPhotoFile) {
        formData.append("photo", customPhotoFile);
      }

      const res = await fetch("/api/historical-record/commanders", {
        method: "POST",
        body: formData,
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        showToast(extractApiError(json, "فشل تسجيل القائد"), "error");
        return;
      }
      showToast("تم تسجيل القائد وحفظ اللقطة المستقلة بنجاح", "success");
      onSaved(json.data as HistoricalCommanderDTO, false);
    } catch {
      showToast("حدث خطأ أثناء الاتصال بالخادم", "error");
    } finally {
      setSaving(false);
    }
  }

  async function handleConfirmEdit(gov: { reason: string; confirmed: true }) {
    if (!commander) return;
    setSaving(true);
    try {
      const formData = new FormData();
      formData.append("startDate", startDate);
      formData.append("isCurrent", String(isCurrent));
      if (!isCurrent && endDate) {
        formData.append("endDate", endDate);
      }
      if (needsPreviousClosure && effectivePreviousCommanderEndDate) {
        formData.append(
          "previousCommanderEndDate",
          effectivePreviousCommanderEndDate,
        );
      }
      formData.append("notes", notes.trim());
      formData.append(
        "officerSnapshot",
        JSON.stringify({
          militaryId: snapMilitaryId.trim(),
          fullName: snapFullName.trim(),
          rank: snapRank.trim(),
          seniorityNumber: snapSeniority.trim(),
        }),
      );
      if (removeExistingPhoto) {
        formData.append("removePhoto", "true");
      }
      if (customPhotoFile) {
        formData.append("photo", customPhotoFile);
      }
      formData.append("reason", gov.reason);
      formData.append("confirmed", "true");

      const res = await fetch(
        `/api/historical-record/commanders/${commander.id}`,
        {
          method: "PATCH",
          body: formData,
        },
      );
      const json = await res.json();
      if (!res.ok || !json.success) {
        showToast(extractApiError(json, "فشل تعديل سجل القائد"), "error");
        return;
      }
      showToast("تم تحديث سجل القائد التاريخي بنجاح", "success");
      setShowGovernance(false);
      onSaved(json.data as HistoricalCommanderDTO, true);
    } catch {
      showToast("حدث خطأ أثناء الاتصال بالخادم", "error");
    } finally {
      setSaving(false);
    }
  }

  const displayedPhotoUrl =
    customPhotoPreview ??
    (removeExistingPhoto
      ? null
      : isEdit
        ? (commander?.photoUrl ?? null)
        : (selectedOfficer?.photoUrl ?? null));

  if (showGovernance && commander) {
    return (
      <HistoricalGovernanceModal
        mode="update"
        entityLabel="سجل القائد"
        recordTitle={`${snapRank || commander.officerSnapshot.rank} / ${snapFullName || commander.officerSnapshot.fullName}`}
        loading={saving}
        onCancel={() => setShowGovernance(false)}
        onConfirm={handleConfirmEdit}
      />
    );
  }

  return (
    <ModalShell
      title={isEdit ? "تعديل سجل قائد وحدة محفوظ" : "إضافة قائد مركز / وحدة جديد"}
        icon={<Award className="w-4 h-4 text-(--color-primary)" />}
        onClose={onClose}
        closeOnOverlayClick={!saving}
        overlayClassName="bg-black/40"
        panelClassName="max-w-2xl"
        footer={
          <ModalActions
            mode="action"
            form={formId}
            submitText={isEdit ? "متابعة للتأكيد المزدوج" : "حفظ القائد واللقطة"}
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
          {/* Officer selection in Add Mode vs Editable Snapshot fields in Admin-Edit Mode */}
          {!isEdit ? (
            <div className="space-y-3">
              <CustomSelect
                id="historical-commander-officer"
                label="اختيار الضابط من السجل الشامل (الحاليين والمؤرشفين)"
                value={selectedOfficerId}
                onChange={setSelectedOfficerId}
                options={selectOptions}
                placeholder={
                  loadingOfficers
                    ? "جاري تحميل سجل الضباط..."
                    : "ابحث واختر الضابط..."
                }
                searchable
                searchPlaceholder="ابحث بالاسم، الرقم العسكري، أو رقم الأقدمية..."
                disabled={loadingOfficers || saving}
                required
              />

              {selectedOfficer && (
                <div className="p-3 rounded-xl bg-(--color-primary)/5 border border-(--color-primary)/20 flex items-center gap-3">
                  <div className="w-14 h-14 rounded-xl overflow-hidden border border-(--app-border) bg-(--app-surface) flex items-center justify-center shrink-0">
                    {displayedPhotoUrl ? (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img
                        src={displayedPhotoUrl}
                        alt={selectedOfficer.fullName}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <Shield className="w-6 h-6 text-(--color-primary)/60" />
                    )}
                  </div>
                  <div className="text-xs space-y-0.5 flex-1 min-w-0">
                    <p className="font-black text-(--color-primary) truncate">
                      {selectedOfficer.rankLabel} / {selectedOfficer.fullName}
                    </p>
                    <p className="font-bold text-(--app-muted-foreground)">
                      الرقم العسكري: {selectedOfficer.militaryId}
                      {selectedOfficer.seniorityNumber
                        ? ` • الأقدمية: ${selectedOfficer.seniorityNumber}`
                        : ""}
                    </p>
                    <p className="text-[11px] font-bold text-(--app-muted-foreground)">
                      سيتم أخذ لقطة بيانات ثابتة ونسخ الصورة إلى السجل التاريخي المستقل.
                    </p>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="p-3.5 rounded-xl bg-(--app-surface-container)/60 border border-(--app-border) space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-xs font-black text-(--color-primary)">
                  بيانات اللقطة المستقلة المحفوظة (Snapshot)
                </p>
                {!commander?.officerId && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-(--color-primary)/10 text-(--color-primary)">
                    سجل مستقل
                  </span>
                )}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <FormField label="الرتبة وقت القيادة" required>
                  <FormInput
                    value={snapRank}
                    onChange={(e) => setSnapRank(e.target.value)}
                    disabled={saving}
                  />
                </FormField>
                <FormField label="الاسم الكامل" required>
                  <FormInput
                    value={snapFullName}
                    onChange={(e) => setSnapFullName(e.target.value)}
                    disabled={saving}
                  />
                </FormField>
                <FormField label="الرقم العسكري" required>
                  <FormInput
                    value={snapMilitaryId}
                    onChange={(e) => setSnapMilitaryId(e.target.value)}
                    disabled={saving}
                  />
                </FormField>
                <FormField label="رقم الأقدمية">
                  <FormInput
                    value={snapSeniority}
                    onChange={(e) => setSnapSeniority(e.target.value)}
                    disabled={saving}
                  />
                </FormField>
              </div>
            </div>
          )}

          {/* Command period & isCurrent */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-start">
            <DateField
              id="commander-start-date"
              label="تاريخ تولي القيادة"
              value={startDate}
              onChange={setStartDate}
              required
              disabled={saving}
              showDayName
            />

            <DateField
              id="commander-end-date"
              label="تاريخ انتهاء القيادة"
              value={isCurrent ? "" : endDate}
              onChange={setEndDate}
              required={!isCurrent}
              disabled={saving || isCurrent}
              showDayName
            />
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => setIsCurrent((prev) => !prev)}
              disabled={saving}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-(--app-border) bg-(--app-surface-container)/60 hover:bg-(--app-surface-container) text-xs font-bold text-(--color-primary) transition-colors cursor-pointer"
            >
              {isCurrent ? (
                <CheckSquare className="w-4 h-4 text-(--color-primary)" />
              ) : (
                <Square className="w-4 h-4 text-(--app-muted-foreground)" />
              )}
              <span>حتى الآن (القائد الحالي للوحدة)</span>
            </button>

            {liveDuration && (
              <div className="px-3 py-1.5 rounded-xl bg-(--color-primary)/10 text-(--color-primary) text-xs font-black">
                مدة القيادة المحسوبة: {liveDuration}
              </div>
            )}
          </div>

          {/* Inline atomic previous commander closure (Clarification Q1) */}
          {needsPreviousClosure && activeCurrentCommander && (
            <div className="p-3.5 rounded-xl bg-(--color-primary)/5 border border-(--color-primary)/25 space-y-3">
              <div className="space-y-1">
                <p className="text-xs font-black text-(--color-primary)">
                  إغلاق فترة القائد الحالي السابق تلقائياً عند الحفظ
                </p>
                <p className="text-xs font-bold text-(--app-muted-foreground)">
                  القائد الحالي المسجل: {activeCurrentCommander.officerSnapshot.rankLabel ?? activeCurrentCommander.officerSnapshot.rank} /{" "}
                  {activeCurrentCommander.officerSnapshot.fullName} (تولى القيادة في {activeCurrentCommander.startDate})
                </p>
              </div>
              <DateField
                id="previous-commander-end-date"
                label="تاريخ انتهاء قيادة القائد السابق (إلزامي)"
                value={effectivePreviousCommanderEndDate}
                onChange={(val) => {
                  setPrevEndEditedManually(true);
                  setPreviousCommanderEndDate(val);
                }}
                min={activeCurrentCommander.startDate}
                max={startDate || undefined}
                required
                disabled={saving}
                showDayName
              />
            </div>
          )}

          {/* Custom Photo Upload / Preview */}
          <div className="space-y-2">
            <FormLabel>
              صورة القائد في السجل التاريخي (اختيارية — تُنسخ تلقائياً من سجل الضباط إذا تُركت فارغة)
            </FormLabel>
            <div className="flex flex-wrap items-center gap-3">
              <div className="w-16 h-16 rounded-xl overflow-hidden border border-(--app-border) bg-(--app-surface-container) flex items-center justify-center shrink-0">
                {displayedPhotoUrl ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={displayedPhotoUrl}
                    alt="صورة القائد"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <User className="w-6 h-6 text-(--app-muted-foreground)" />
                )}
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <label className="btn-secondary text-xs inline-flex items-center gap-1.5 px-3 py-2 cursor-pointer">
                  <ImagePlus className="w-3.5 h-3.5 text-(--color-primary)" />
                  <span>
                    {customPhotoFile ? "تغيير الصورة المخصصة" : "رفع صورة مخصصة"}
                  </span>
                  <input
                    type="file"
                    accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
                    onChange={handleCustomPhotoChange}
                    disabled={saving}
                    className="hidden"
                  />
                </label>

                {customPhotoFile && (
                  <button
                    type="button"
                    onClick={() => setCustomPhotoFile(null)}
                    className="btn-secondary text-xs px-3 py-2 cursor-pointer"
                  >
                    إلغاء الصورة المختارة
                  </button>
                )}

                {isEdit && commander?.photoUrl && !customPhotoFile && (
                  <button
                    type="button"
                    onClick={() => setRemoveExistingPhoto((prev) => !prev)}
                    className="btn-secondary text-xs inline-flex items-center gap-1.5 px-3 py-2 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-(--color-primary)" />
                    <span>
                      {removeExistingPhoto ? "تراجع عن إزالة الصورة" : "إزالة الصورة المحفوظة"}
                    </span>
                  </button>
                )}
              </div>
            </div>
          </div>

          <FormField label="نبذة / ملاحظات عن فترة القيادة">
            <FormTextarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="إنجازات الفترة أو ملاحظات تاريخية موثقة..."
              rows={3}
              maxLength={4000}
              disabled={saving}
            />
          </FormField>
        </form>
      </ModalShell>
  );
}
