"use client";

import React, { useState, useEffect } from "react";
import { ModalShell } from "@/components/ui/modal-shell";
import { ModalActions } from "@/components/ui/modal-actions";
import { useToast } from "@/components/ui/toast";
import { extractApiError } from "@/lib/utils";
import { Briefcase } from "lucide-react";
import { CustomSelect } from "@/components/ui/custom-select";

interface DynamicBranch {
  _id: string;
  name: string;
  order?: number;
}

export interface PositionDefinitionData {
  id?: string;
  positionTitle: string;
  department: string;
  hasNoSubstitute?: boolean;
  notes?: string;
}

interface PositionDetailModalProps {
  isOpen: boolean;
  position: PositionDefinitionData | null;
  departments: string[];
  onClose: () => void;
  onSuccess: () => void;
}

function PositionDetailModalContent({
  position,
  departments,
  onClose,
  onSuccess,
}: Omit<PositionDetailModalProps, "isOpen">) {
  const { showToast } = useToast();
  const isEditing = Boolean(position && position.id);
  const [loading, setLoading] = useState(false);

  const [positionTitle, setPositionTitle] = useState(position?.positionTitle || "");
  const [department, setDepartment] = useState(position?.department || (departments[0] || "القيادة"));
  const [hasNoSubstitute, setHasNoSubstitute] = useState<boolean>(Boolean(position?.hasNoSubstitute));
  const [notes, setNotes] = useState(position?.notes || "");

  const [dynamicBranches, setDynamicBranches] = useState<DynamicBranch[]>([]);

  useEffect(() => {
    async function loadBranches() {
      try {
        const branchesRes = await fetch("/api/branches");
        const branchesData = await branchesRes.json();

        const fetchedBranches =
          branchesData.success && Array.isArray(branchesData.branches) ? branchesData.branches : [];

        setDynamicBranches(fetchedBranches);

        if (!position && fetchedBranches.length > 0) {
          setDepartment((prev) => prev || fetchedBranches[0].name);
        }
      } catch {
        // Fallback to static departments list
      }
    }
    loadBranches();
  }, [position]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!positionTitle.trim()) {
      showToast("يرجى إدخال اسم الوظيفة", "error");
      return;
    }
    if (!department.trim()) {
      showToast("يرجى اختيار الفرع التابع له", "error");
      return;
    }

    try {
      setLoading(true);
      const payload: Record<string, unknown> = {
        positionTitle: positionTitle.trim(),
        department: department.trim(),
        hasNoSubstitute: Boolean(hasNoSubstitute),
        notes: notes.trim() || undefined,
      };

      const url = isEditing
        ? `/api/arkan-harb/positions/${position!.id}`
        : "/api/arkan-harb/positions";
      const method = isEditing ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        showToast(extractApiError(data, "فشل حفظ الوظيفة"), "error");
        return;
      }

      showToast(isEditing ? "تم تحديث بيانات الوظيفة بنجاح" : "تم إضافة الوظيفة بنجاح", "success");
      onSuccess();
      onClose();
    } catch {
      showToast("حدث خطأ أثناء حفظ البيانات", "error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <ModalShell
      title={isEditing ? `تعديل بيانات الوظيفة: ${positionTitle || "..."}` : "إضافة وظيفة جديدة للهيكل"}
      icon={<Briefcase className="w-4 h-4" />}
      onClose={onClose}
      overlayClassName="bg-black/40"
      panelClassName="max-w-lg border-(--app-border) shadow-depth-xl"
      bodyClassName="p-6 no-scrollbar"
      footer={
        <ModalActions
          form="position-def-form"
          submitText={isEditing ? "حفظ التعديلات" : "إضافة الوظيفة"}
          submitLoading={loading}
          onCancel={onClose}
        />
      }
    >
      <form id="position-def-form" onSubmit={handleSubmit} className="space-y-4 text-right">
        {/* 1. اسم الوظيفة / المسمى + Checkbox وظيفة بدون بديل */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label
              htmlFor="pos-title"
              className="text-xs font-bold text-(--app-muted-foreground) block mr-1"
            >
              اسم الوظيفة / المسمى <span className="text-red-500">*</span>
            </label>
            <label
              htmlFor="pos-no-substitute"
              className="flex items-center gap-1.5 text-xs font-bold text-(--app-muted-foreground) cursor-pointer select-none bg-(--app-surface-container) px-2.5 py-1 rounded-xl border border-(--app-border) shadow-sm hover:bg-(--app-surface) transition-colors"
            >
              <input
                type="checkbox"
                id="pos-no-substitute"
                checked={hasNoSubstitute}
                onChange={(e) => setHasNoSubstitute(e.target.checked)}
                className="w-3.5 h-3.5 rounded border-(--app-border) text-blue-600 focus:ring-blue-500 cursor-pointer accent-blue-600"
              />
              <span>وظيفة بدون بديل</span>
            </label>
          </div>
          <input
            id="pos-title"
            type="text"
            value={positionTitle}
            onChange={(e) => setPositionTitle(e.target.value)}
            placeholder="مثال: قائد المركز، رئيس فرع التعليم، إلخ..."
            className="w-full px-3 py-2 bg-(--app-surface) border border-(--app-border) rounded-xl text-sm font-bold text-(--app-foreground) focus:outline-none focus:ring-blue-500/20 focus:border-blue-500 transition-all text-right"
            required
            autoFocus
          />
        </div>

        {/* 2. الفرع التابع له */}
        <CustomSelect
          id="pos-dept"
          label="الفرع التابع له"
          value={department}
          onChange={setDepartment}
          options={
            dynamicBranches.length > 0
              ? dynamicBranches.map((branch) => ({
                  value: branch.name,
                  label: branch.name,
                }))
              : departments.map((dept) => ({
                  value: dept,
                  label: dept,
                }))
          }
          required
        />

        {/* 3. ملاحظات إضافية */}
        <div className="space-y-1.5">
          <label
            htmlFor="pos-notes"
            className="text-xs font-bold text-(--app-muted-foreground) block mr-1"
          >
            ملاحظات
          </label>
          <textarea
            id="pos-notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            placeholder="أي ملاحظات تنظيمية متعلقة بهذه الوظيفة..."
            className="w-full px-3 py-2 bg-(--app-surface) border border-(--app-border) rounded-xl text-sm font-bold text-(--app-foreground) focus:outline-none focus:ring-blue-500/20 focus:border-blue-500 transition-all text-right resize-none"
          />
        </div>
      </form>
    </ModalShell>
  );
}

export function PositionDetailModal(props: PositionDetailModalProps) {
  if (!props.isOpen) return null;
  return <PositionDetailModalContent key={props.position?.id || "new"} {...props} />;
}
