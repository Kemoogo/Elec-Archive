"use client";

import React, { useState } from "react";
import { ModalShell } from "@/components/ui/modal-shell";
import { ModalActions } from "@/components/ui/modal-actions";
import { useToast } from "@/components/ui/toast";
import { extractApiError } from "@/lib/utils";
import { compareOfficers } from "@/lib/officers/seniority";
import { RANK_LABELS, type OfficerRank } from "@/lib/db/models/Officer.shared";
import { Briefcase, User, Plus, Trash2, AlertCircle, AlertTriangle, ArrowDown } from "lucide-react";
import { CustomSelect, type CustomSelectOption } from "@/components/ui/custom-select";
import type { OfficerOption } from "@/types";

export interface PositionPlacementData {
  id: string;
  positionTitle: string;
  department: string;
  primaryOfficer?: OfficerOption | { _id?: string; id?: string; fullName: string; rank: string; militaryId?: string; isArkanHarb?: boolean; officerLabel?: string } | null;
  substituteOfficers?: (OfficerOption | { _id?: string; id?: string; fullName: string; rank: string; militaryId?: string; isArkanHarb?: boolean; officerLabel?: string })[];
  hasNoSubstitute?: boolean;
  orderNumber?: string;
  notes?: string;
}

interface PositionPlacementModalProps {
  isOpen: boolean;
  position: PositionPlacementData | null;
  officers: OfficerOption[];
  onClose: () => void;
  onSuccess: () => void;
}

function extractOfficerId(officer: unknown): string {
  if (!officer) return "";
  if (typeof officer === "string") return officer.trim();
  if (typeof officer === "object" && officer !== null) {
    const obj = officer as { _id?: unknown; id?: unknown };
    if (obj.id && String(obj.id) !== "undefined" && String(obj.id) !== "null") {
      return String(obj.id);
    }
    if (obj._id && String(obj._id) !== "undefined" && String(obj._id) !== "null") {
      return typeof obj._id === "object" && "_id" in (obj._id as object)
        ? String((obj._id as { _id: unknown })._id)
        : String(obj._id);
    }
  }
  return "";
}

function getOfficerDisplay(officer?: unknown): string {
  if (!officer) return "شاغر";
  if (typeof officer === "object" && officer !== null) {
    const off = officer as { fullName?: string; rank?: string; officerLabel?: string; isArkanHarb?: boolean };
    if (off.officerLabel) return off.officerLabel;
    const rLabel = off.rank ? RANK_LABELS[off.rank as OfficerRank] || off.rank : "";
    const arkan = off.isArkanHarb ? " أ ح" : "";
    return rLabel ? `${rLabel}${arkan} / ${off.fullName || ""}` : (off.fullName || "");
  }
  return String(officer);
}

function PositionPlacementModalContent({
  position,
  officers,
  onClose,
  onSuccess,
}: Omit<PositionPlacementModalProps, "isOpen">) {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(false);

  const sortedOfficers = React.useMemo(() => {
    return [...officers].sort((a, b) => compareOfficers(a, b));
  }, [officers]);

  const primaryOfficerOptions: CustomSelectOption[] = React.useMemo(() => {
    return [
      { value: "", label: "-- بدون تعيين (وظيفة شاغرة) --" },
      ...sortedOfficers.map((off) => ({
        value: off.id,
        label: off.officerLabel || `${off.rank} / ${off.fullName}`,
      })),
    ];
  }, [sortedOfficers]);

  const initialPrimaryId = position ? extractOfficerId(position.primaryOfficer) : "";
  const initialSubIds = position
    ? (position.substituteOfficers || [])
        .map(extractOfficerId)
        .filter((id) => id !== "")
    : [];

  const [primaryOfficerId, setPrimaryOfficerId] = useState<string>(initialPrimaryId);
  const [substituteOfficerIds, setSubstituteOfficerIds] = useState<string[]>(initialSubIds);
  const [orderNumber, setOrderNumber] = useState(position?.orderNumber || "");
  const [notes, setNotes] = useState(position?.notes || "");
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  if (!position) return null;

  function handleAddSubstitute() {
    setSubstituteOfficerIds((prev) => [...prev, ""]);
  }

  function handleUpdateSubstitute(index: number, officerId: string) {
    setSubstituteOfficerIds((prev) => {
      const next = [...prev];
      next[index] = officerId;
      return next;
    });
  }

  function handleRemoveSubstitute(index: number) {
    setSubstituteOfficerIds((prev) => prev.filter((_, i) => i !== index));
  }

  async function executeSave() {
    const officerMap = new Map(officers.map((o) => [o.id, o]));
    const cleanSubstitutes = position?.hasNoSubstitute
      ? []
      : Array.from(new Set(substituteOfficerIds.filter((id) => id && id.trim() !== "")))
          .sort((a, b) => compareOfficers(officerMap.get(a), officerMap.get(b)));

    try {
      setLoading(true);
      const payload: Record<string, unknown> = {
        primaryOfficerId: primaryOfficerId.trim() || null,
        substituteOfficerIds: cleanSubstitutes,
        orderNumber: orderNumber.trim() || undefined,
        notes: notes.trim() || undefined,
      };

      const res = await fetch(`/api/arkan-harb/positions/${position!.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        showToast(extractApiError(data, "فشل حفظ التسكين"), "error");
        return;
      }

      showToast("تم تحديث تسكين الوظيفة وتكليف الضباط بنجاح", "success");
      onSuccess();
      onClose();
    } catch {
      showToast("حدث خطأ أثناء حفظ التسكين", "error");
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const cleanSubstitutes = position?.hasNoSubstitute
      ? []
      : Array.from(new Set(substituteOfficerIds.filter((id) => id && id.trim() !== "")));

    if (!position?.hasNoSubstitute && primaryOfficerId && cleanSubstitutes.includes(primaryOfficerId)) {
      showToast("لا يمكن تعيين نفس الضابط كـ أساسي وبديل لنفس الوظيفة في نفس الوقت", "error");
      return;
    }

    // Check if replacing or removing an existing primary officer
    if (initialPrimaryId && primaryOfficerId !== initialPrimaryId) {
      setShowConfirmModal(true);
      return;
    }

    await executeSave();
  }

  const getSubstituteOptions = (currentIdx: number): CustomSelectOption[] => {
    return [
      { value: "", label: "-- اختر ضابطاً بديلاً --" },
      ...sortedOfficers.map((off) => ({
        value: off.id,
        label: `${off.officerLabel || `${off.rank} / ${off.fullName}`}${off.id === primaryOfficerId ? " (الضابط الأساسي)" : ""}`,
        disabled:
          off.id === primaryOfficerId ||
          substituteOfficerIds.some((s, i) => i !== currentIdx && s === off.id),
      })),
    ];
  };

  return (
    <ModalShell
      title={`تسكين وتكليف الوظيفة: ${position.positionTitle}`}
      icon={<Briefcase className="w-4 h-4" />}
      onClose={onClose}
      overlayClassName="bg-black/40"
      panelClassName="max-w-xl border-(--app-border) shadow-depth-xl"
      bodyClassName="p-5 space-y-4 no-scrollbar"
      footer={
        <ModalActions
          form="placement-form"
          submitText="حفظ التسكين"
          submitLoading={loading}
          onCancel={onClose}
        />
      }
    >
      {/* بطاقة معلومات الوظيفة */}
      <div className="p-4 bg-(--color-primary)/5 border border-(--color-primary)/10 shadow-sm rounded-2xl flex items-center justify-between text-right">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-(--color-primary)/10 flex items-center justify-center text-(--color-primary) border border-(--color-primary)/20">
            <Briefcase className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-sm font-black text-(--color-primary)">
              {position.positionTitle}
            </h4>
            <div className="flex items-center gap-2 text-xs font-bold text-(--app-muted-foreground) mt-0.5">
              <span>الفرع: {position.department || "عام"}</span>
            </div>
          </div>
        </div>
        {position.hasNoSubstitute && (
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-(--app-surface-container) border border-(--app-border) rounded-xl shadow-sm">
            <AlertCircle className="w-3.5 h-3.5 text-(--app-muted-foreground) shrink-0" />
            <span className="text-xs font-bold text-(--app-muted-foreground)">وظيفة بدون بديل</span>
          </div>
        )}
      </div>

      <form id="placement-form" onSubmit={handleSubmit} className="space-y-4 text-right">
        {/* 1. الضابط الأساسي */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label
              htmlFor="pos-primary"
              className="text-xs font-bold text-(--app-muted-foreground) block mr-1"
            >
              الضابط الأساسي المكلف
            </label>
            {primaryOfficerId && (
              <button
                type="button"
                onClick={() => setPrimaryOfficerId("")}
                className="text-[11px] font-bold text-(--color-primary) hover:underline cursor-pointer"
              >
                تفريغ التسكين (شاغر)
              </button>
            )}
          </div>
          <CustomSelect
            id="pos-primary"
            value={primaryOfficerId}
            onChange={setPrimaryOfficerId}
            options={primaryOfficerOptions}
            placeholder="-- بدون تعيين (وظيفة شاغرة) --"
          />

          {/* تنبيه استبدال الضابط الأساسي الحالي */}
          {initialPrimaryId && primaryOfficerId && primaryOfficerId !== initialPrimaryId && (
            <div className="p-2.5 bg-(--app-surface-container) border border-(--app-border) rounded-xl flex items-center gap-2 text-xs font-bold text-(--app-muted-foreground) animate-in fade-in duration-200">
              <AlertTriangle className="w-4 h-4 text-(--color-primary) shrink-0" />
              <span>
                تنبيه: سيتم استبدال الضابط الأساسي الحالي <span className="font-extrabold text-(--app-foreground)">({getOfficerDisplay(position.primaryOfficer)})</span> عند الحفظ.
              </span>
            </div>
          )}

          {/* تنبيه تفريغ الوظيفة وجعلها شاغرة */}
          {initialPrimaryId && !primaryOfficerId && (
            <div className="p-2.5 bg-(--app-surface-container) border border-(--app-border) rounded-xl flex items-center gap-2 text-xs font-bold text-(--app-muted-foreground) animate-in fade-in duration-200">
              <AlertCircle className="w-4 h-4 text-(--color-primary) shrink-0" />
              <span>
                تنبيه: سيتم إلغاء تسكين الضابط <span className="font-extrabold text-(--app-foreground)">({getOfficerDisplay(position.primaryOfficer)})</span> وجعل الوظيفة شاغرة.
              </span>
            </div>
          )}
        </div>

        {/* 2. الضباط البدلاء */}
        {!position.hasNoSubstitute && (
          <div className="p-3.5 bg-(--app-surface-container)/30 rounded-2xl border border-(--app-border) space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-(--app-muted-foreground) flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-(--color-primary)" />
                <span>الضباط البدلاء</span>
              </label>
              <button
                type="button"
                onClick={handleAddSubstitute}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-(--color-primary)/10 text-(--color-primary) border border-(--color-primary)/20 hover:bg-(--color-primary)/20 transition-all cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>إضافة بديل</span>
              </button>
            </div>

            {substituteOfficerIds.length === 0 ? (
              <p className="text-xs font-bold text-(--app-muted-foreground) py-2 text-center">
                لا يوجد ضباط بدلاء محددين لهذه الوظيفة.
              </p>
            ) : (
              <div className="space-y-2">
                {substituteOfficerIds.map((subId, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <div className="flex-1">
                      <CustomSelect
                        value={subId}
                        onChange={(val) => handleUpdateSubstitute(idx, val)}
                        options={getSubstituteOptions(idx)}
                        placeholder="-- اختر ضابطاً بديلاً --"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveSubstitute(idx)}
                      className="p-2 rounded-xl text-slate-500 hover:text-(--color-primary) hover:bg-(--color-primary)/10 border border-transparent hover:border-(--app-border) transition-all cursor-pointer shrink-0"
                      title="حذف هذا البديل"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* 3. رقم أمر التكليف والملاحظات */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label
              htmlFor="place-order"
              className="text-xs font-bold text-(--app-muted-foreground) block mr-1"
            >
              رقم أمر التكليف
            </label>
            <input
              id="place-order"
              type="text"
              value={orderNumber}
              onChange={(e) => setOrderNumber(e.target.value)}
              placeholder="مثال: أمر إداري 124/2026"
              className="w-full px-3 py-2 bg-(--app-surface) border border-(--app-border) rounded-xl text-sm font-bold text-(--app-foreground) focus:outline-none focus:ring-blue-500/20 focus:border-blue-500 transition-all text-right"
            />
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor="place-notes"
              className="text-xs font-bold text-(--app-muted-foreground) block mr-1"
            >
              ملاحظات
            </label>
            <input
              id="place-notes"
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="أي ملاحظات إضافية..."
              className="w-full px-3 py-2 bg-(--app-surface) border border-(--app-border) rounded-xl text-sm font-bold text-(--app-foreground) focus:outline-none focus:ring-blue-500/20 focus:border-blue-500 transition-all text-right"
            />
          </div>
        </div>
      </form>

      {/* Confirmation Modal for Primary Officer Replacement */}
      {showConfirmModal && (
        <ModalShell
          title={primaryOfficerId ? "تأكيد استبدال الضابط الأساسي" : "تأكيد تفريغ الوظيفة"}
          icon={<AlertTriangle className="w-4 h-4 text-(--color-primary)" />}
          onClose={() => setShowConfirmModal(false)}
          overlayClassName="bg-black/40"
          panelClassName="max-w-md border-(--app-border) shadow-depth-xl z-[70]"
          bodyClassName="p-5 space-y-4 text-right"
          footer={
            <ModalActions
              submitText={primaryOfficerId ? "تأكيد الاستبدال والتسكين" : "تأكيد تفريغ الوظيفة"}
              submitVariant={primaryOfficerId ? "primary" : "destructive"}
              submitLoading={loading}
              onConfirm={() => {
                setShowConfirmModal(false);
                executeSave();
              }}
              onCancel={() => setShowConfirmModal(false)}
            />
          }
        >
          {/* Position Info Banner */}
          <div className="p-3 bg-(--app-surface-container) border border-(--app-border) rounded-xl flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Briefcase className="w-4 h-4 text-(--color-primary) shrink-0" />
              <span className="text-xs font-bold text-(--app-muted-foreground)">الوظيفة:</span>
              <span className="text-xs font-black text-(--app-foreground)">{position.positionTitle}</span>
            </div>
            <span className="text-[11px] font-bold text-(--app-muted-foreground)">فرع / {position.department}</span>
          </div>

          {/* Officers Transition Flow */}
          <div className="space-y-2">
            {/* Current Officer */}
            <div className="p-3 bg-(--app-surface) border border-(--app-border) rounded-xl flex items-center justify-between shadow-xs">
              <div className="flex flex-col text-right">
                <span className="text-[10px] font-bold text-red-600 dark:text-red-400">الضابط الحالي:</span>
                <span className="text-xs font-black text-(--app-foreground) mt-0.5">
                  {getOfficerDisplay(position.primaryOfficer)}
                </span>
              </div>
              <span className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-red-500/10 text-red-700 dark:text-red-400 border border-red-500/20">
                إنهاء التكليف
              </span>
            </div>

            {primaryOfficerId && (
              <>
                <div className="flex items-center justify-center -my-0.5 text-(--app-muted-foreground)">
                  <ArrowDown className="w-3.5 h-3.5" />
                </div>

                {/* New Officer */}
                <div className="p-3 bg-(--app-surface) border border-blue-500/30 rounded-xl flex items-center justify-between shadow-xs">
                  <div className="flex flex-col text-right">
                    <span className="text-[10px] font-bold text-(--color-primary)">الضابط الجديد:</span>
                    <span className="text-xs font-black text-(--color-primary) mt-0.5">
                      {getOfficerDisplay(officers.find((o) => o.id === primaryOfficerId))}
                    </span>
                  </div>
                  <span className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-blue-500/10 text-blue-700 dark:text-blue-400 border border-blue-500/20">
                    ضابط أساسي
                  </span>
                </div>
              </>
            )}
          </div>

          {/* Notice Note */}
          <div className="flex items-start gap-2 p-2.5 bg-(--app-surface-container)/60 rounded-xl border border-(--app-border)/60 text-[11px] font-bold text-(--app-muted-foreground)">
            <AlertTriangle className="w-3.5 h-3.5 text-(--color-primary) shrink-0 mt-0.5" />
            <p className="leading-relaxed">
              {primaryOfficerId
                ? "سيتم إنهاء تكليف الضابط الحالي كضابط أساسي تلقائياً وأرشفة فترته السابقة في السجل التاريخي للوظيفة."
                : "سيتم إلغاء تكليف الضابط الحالي وجعل الوظيفة شاغرة مع أرشفة فترته في السجل التاريخي."}
            </p>
          </div>
        </ModalShell>
      )}
    </ModalShell>
  );
}

export function PositionPlacementModal(props: PositionPlacementModalProps) {
  if (!props.isOpen) return null;
  return <PositionPlacementModalContent key={props.position?.id || "placement"} {...props} />;
}
