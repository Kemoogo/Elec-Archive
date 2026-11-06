"use client";

import React, { useState, useEffect, useMemo } from "react";
import { Plus, Layers, Trash2, MapPin, User } from "lucide-react";
import { ModalShell } from "@/components/ui/modal-shell";
import { ModalActions } from "@/components/ui/modal-actions";
import { CustomSelect, type CustomSelectOption } from "@/components/ui/custom-select";
import { ActionButton } from "@/components/officers/OfficersTable";
import { type ICustomRollcallTable } from "@/lib/db/models/DailyRollcall.shared";

export interface OfficerOptionItem {
  id: string;
  fullName: string;
  rank: string;
  rankLabel: string;
  militaryId?: string;
  seniorityNumber?: string;
  primaryPosition?: string;
  currentStatusLabel?: string;
  isExternalMissionOrCourse?: boolean;
}

interface CustomRollcallTableModalProps {
  isOpen: boolean;
  tableData?: ICustomRollcallTable | null;
  allOfficers: OfficerOptionItem[];
  onClose: () => void;
  onSave: (table: ICustomRollcallTable) => void;
}

interface OfficerRowState {
  officerId: string;
  task: string;
}

export function CustomRollcallTableModal({
  isOpen,
  tableData,
  allOfficers,
  onClose,
  onSave,
}: CustomRollcallTableModalProps) {
  const [name, setName] = useState("");
  const [isInsideUnit, setIsInsideUnit] = useState(false);
  const [officerRows, setOfficerRows] = useState<OfficerRowState[]>([]);
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (tableData) {
      setName(tableData.name || "");
      setIsInsideUnit(Boolean(tableData.isInsideUnit));
      const initialRows: OfficerRowState[] = (tableData.officerIds || []).map((id) => ({
        officerId: String(id),
        task: tableData.officerTasks?.[String(id)] || "",
      }));
      setOfficerRows(initialRows);
      setNotes(tableData.notes || "");
    } else {
      setName("");
      setIsInsideUnit(false);
      setOfficerRows([]);
      setNotes("");
    }
  }, [tableData, isOpen]);

  const isEditing = Boolean(tableData);

  const isDirty = useMemo(() => {
    if (!isEditing) {
      return (
        name.trim().length > 0 ||
        officerRows.length > 0 ||
        notes.trim().length > 0 ||
        isInsideUnit
      );
    }
    const initialName = (tableData?.name || "").trim();
    const initialInside = Boolean(tableData?.isInsideUnit);
    const initialNotes = (tableData?.notes || "").trim();
    const initialRows = (tableData?.officerIds || []).map((id) => ({
      officerId: String(id),
      task: tableData?.officerTasks?.[String(id)] || "",
    }));

    const nameChanged = name.trim() !== initialName;
    const insideChanged = isInsideUnit !== initialInside;
    const notesChanged = notes.trim() !== initialNotes;
    const rowsChanged =
      initialRows.length !== officerRows.length ||
      initialRows.some(
        (r, i) =>
          r.officerId !== officerRows[i]?.officerId ||
          r.task.trim() !== (officerRows[i]?.task || "").trim()
      );

    return nameChanged || insideChanged || notesChanged || rowsChanged;
  }, [isEditing, name, isInsideUnit, notes, officerRows, tableData]);

  if (!isOpen) return null;

  const handleAddOfficer = () => {
    setOfficerRows((prev) => [...prev, { officerId: "", task: "" }]);
  };

  const handleRemoveOfficer = (index: number) => {
    setOfficerRows((prev) => prev.filter((_, i) => i !== index));
  };

  const handleUpdateOfficerId = (index: number, officerId: string) => {
    setOfficerRows((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], officerId };
      return copy;
    });
  };

  const handleUpdateOfficerTask = (index: number, task: string) => {
    setOfficerRows((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], task };
      return copy;
    });
  };

  const getOfficerOptions = (currentIndex: number): CustomSelectOption[] => {
    const selectedElsewhere = new Set(
      officerRows
        .filter((_, i) => i !== currentIndex)
        .map((r) => r.officerId)
        .filter(Boolean)
    );

    return [
      { value: "", label: "-- اختر الضابط --" },
      ...allOfficers.map((off) => ({
        value: off.id,
        label: `${off.rankLabel} / ${off.fullName}`,
        description: off.seniorityNumber ? `أقدمية: ${off.seniorityNumber}` : undefined,
        badge: off.currentStatusLabel,
        disabled: selectedElsewhere.has(off.id),
      })),
    ];
  };

  const selectedCount = officerRows.filter((r) => r.officerId.trim()).length;

  const handleSave = () => {
    if (!name.trim() || !isDirty) return;

    // Filter valid rows
    const validRows = officerRows.filter((r) => r.officerId.trim());
    const officerIds: string[] = [];
    const officerTasks: Record<string, string> = {};

    for (const r of validRows) {
      if (!officerIds.includes(r.officerId)) {
        officerIds.push(r.officerId);
        if (r.task.trim()) {
          officerTasks[r.officerId] = r.task.trim();
        }
      }
    }

    onSave({
      id: tableData?.id || `custom-table-${Date.now()}`,
      name: name.trim(),
      isInsideUnit,
      officerIds,
      officerTasks,
      notes: notes.trim() || undefined,
    });
    onClose();
  };

  return (
    <ModalShell
      title={isEditing ? `تعديل جدول مخصص: ${tableData?.name}` : "إضافة جدول مخصص"}
      icon={<Layers className="w-4 h-4 text-(--color-primary)" />}
      onClose={onClose}
      overlayClassName="bg-black/40"
      panelClassName="max-w-2xl border-(--app-border) shadow-depth-xl"
      bodyClassName="p-5 space-y-4 text-right no-scrollbar max-h-[75vh]"
      footer={
        <ModalActions
          startSlot={
            <div className="text-xs font-bold text-(--app-muted-foreground)">
              تم تحديد: <span className="text-(--color-primary) font-black">{selectedCount}</span> ضابط
            </div>
          }
          submitText={isEditing ? "حفظ التعديلات" : "إضافة الجدول"}
          submitDisabled={!name.trim() || !isDirty}
          onConfirm={handleSave}
          onCancel={onClose}
        />
      }
    >
      <div className="space-y-4">
        {/* 1. اسم الجدول المخصص */}
        <div className="space-y-1.5">
          <label
            htmlFor="custom-table-name"
            className="text-xs font-bold text-(--app-muted-foreground) block mr-1"
          >
            اسم أو موقع الجدول المخصص <span className="text-(--app-error)">*</span>
          </label>
          <div className="relative">
            <input
              id="custom-table-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="مثال: المؤخرة، النوبتجية، مأمورية تأمين المعبر، نقطة المراقبة..."
              className="w-full px-3.5 py-2 bg-(--app-surface) border border-(--app-border) rounded-xl text-sm font-bold text-(--app-foreground) focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-right"
              required
            />
            <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-(--app-muted-foreground) pointer-events-none" />
          </div>
        </div>

        {/* 2. تصنيف التواجد (داخل الوحدة أو خارج الوحدة في إجمالي القوة) */}
        <div className="p-3.5 bg-(--app-surface-container) border border-(--app-border) rounded-xl space-y-2">
          <label className="flex items-center gap-2.5 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={isInsideUnit}
              onChange={(e) => setIsInsideUnit(e.target.checked)}
              className="w-4 h-4 rounded border-(--app-border) text-(--color-primary) focus:ring-blue-500/20 cursor-pointer"
            />
            <span className="text-xs font-black text-(--app-foreground)">
              احتساب تمام هذا الجدول (داخل الوحدة / موجود) في إجمالي القوة
            </span>
          </label>
          <p className="text-[11px] font-bold text-(--app-muted-foreground) pr-6 leading-relaxed">
            {isInsideUnit
              ? "✓ سيتم احتساب جميع ضباط هذا الجدول إجمالياً ضمن القوة الموجودة بالوحدة، مع احتفاظ كل ضابط بتمامه الداخلي."
              : "⚠ سيتم احتساب جميع ضباط هذا الجدول إجمالياً ضمن القوة الخارجة من الوحدة (مثل: المؤخرة / موقع خارجي)، مع احتفاظ كل ضابط بتمامه الداخلي (موجود / إجازة / مأمورية يومية)."}
          </p>
        </div>

        {/* 3. الضباط المخصصون والمهمة المكلف بها */}
        <div className="p-3.5 bg-(--app-surface-container)/40 rounded-2xl border border-(--app-border) space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-(--app-muted-foreground) flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-(--color-primary)" />
              <span>الضباط المخصصون للجدول</span>
            </label>
            <button
              type="button"
              onClick={handleAddOfficer}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-(--color-primary)/10 text-(--color-primary) border border-(--color-primary)/20 hover:bg-(--color-primary)/20 transition-all cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>إضافة ضابط</span>
            </button>
          </div>

          {officerRows.length === 0 ? (
            <p className="text-xs font-bold text-(--app-muted-foreground) py-3 text-center">
              لم يتم إضافة ضباط بعد. اضغط على &quot;إضافة ضابط&quot; للبدء.
            </p>
          ) : (
            <div className="space-y-2.5">
              {officerRows.map((row, idx) => (
                <div
                  key={idx}
                  className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 p-2.5 bg-(--app-surface) border border-(--app-border) rounded-xl"
                >
                  <div className="flex-1 min-w-[200px]">
                    <CustomSelect
                      value={row.officerId}
                      onChange={(val) => handleUpdateOfficerId(idx, val)}
                      options={getOfficerOptions(idx)}
                      placeholder="-- اختر الضابط --"
                    />
                  </div>
                  <div className="flex-1 min-w-[160px]">
                    <input
                      type="text"
                      value={row.task}
                      onChange={(e) => handleUpdateOfficerTask(idx, e.target.value)}
                      placeholder="المهمة المكلف بها..."
                      className="w-full px-3 py-2 bg-(--app-surface) border border-(--app-border) rounded-xl text-xs font-bold text-(--app-foreground) focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-right"
                    />
                  </div>
                  <div className="self-end sm:self-center shrink-0">
                    <ActionButton
                      icon={<Trash2 className="w-4 h-4" />}
                      color="btn-action-primary"
                      title="حذف الضابط من الجدول المخصص"
                      onClick={() => handleRemoveOfficer(idx)}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 4. ملاحظات إضافية */}
        <div className="space-y-1.5">
          <label
            htmlFor="custom-table-notes"
            className="text-xs font-bold text-(--app-muted-foreground) block mr-1"
          >
            ملاحظات أو توجيهات خاصة بالجدول (اختياري)
          </label>
          <input
            id="custom-table-notes"
            type="text"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="أي تعليمات أو ملاحظات إضافية تخص هذا التمام..."
            className="w-full px-3.5 py-2 bg-(--app-surface) border border-(--app-border) rounded-xl text-xs font-bold text-(--app-foreground) focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-right"
          />
        </div>
      </div>
    </ModalShell>
  );
}
