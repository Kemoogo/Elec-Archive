"use client";

import React, { useState } from "react";
import { ModalShell } from "@/components/ui/modal-shell";
import { ModalActions } from "@/components/ui/modal-actions";
import { FormField, FormInput } from "@/components/ui/form-fields";
import { useToast } from "@/components/ui/toast";
import { extractApiError } from "@/lib/utils";
import { ShieldCheck } from "lucide-react";
import { CustomSelect } from "@/components/ui/custom-select";

interface BranchItem {
  _id: string;
  name: string;
}

interface CreateDepartmentModalProps {
  branches: BranchItem[];
  defaultBranchId?: string;
  onClose: () => void;
  onSuccess: () => void;
}

export function CreateDepartmentModal({
  branches,
  defaultBranchId,
  onClose,
  onSuccess,
}: CreateDepartmentModalProps) {
  const { showToast } = useToast();
  const [itemName, setItemName] = useState("");
  const [itemDesc, setItemDesc] = useState("");
  const [isSubDepartment, setIsSubDepartment] = useState(Boolean(defaultBranchId));
  const [selectedParentBranchId, setSelectedParentBranchId] = useState(
    defaultBranchId || (branches[0]?._id ?? "")
  );
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!itemName.trim()) {
      showToast("يرجى إدخال اسم الفرع/القسم", "error");
      return;
    }

    if (isSubDepartment && !selectedParentBranchId) {
      showToast("يرجى اختيار الفرع التابع له", "error");
      return;
    }

    setSaving(true);
    try {
      if (isSubDepartment) {
        const res = await fetch("/api/departments", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: itemName,
            branchId: selectedParentBranchId,
            description: itemDesc,
          }),
        });
        const data = await res.json();
        if (!res.ok) {
          showToast(extractApiError(data, "فشل إضافة القسم"), "error");
          return;
        }
        showToast("تم إضافة القسم بنجاح", "success");
      } else {
        const res = await fetch("/api/branches", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: itemName, description: itemDesc }),
        });
        const data = await res.json();
        if (!res.ok) {
          showToast(extractApiError(data, "فشل إضافة الفرع"), "error");
          return;
        }
        showToast("تم إضافة الفرع بنجاح", "success");
      }

      onSuccess();
      onClose();
    } catch {
      showToast("حدث خطأ في الاتصال", "error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <ModalShell
      title="إضافة فرع / قسم جديد"
      icon={<ShieldCheck className="w-4 h-4" />}
      onClose={onClose}
      overlayClassName="bg-black/40"
      panelClassName="max-h-[85vh] max-w-lg border-(--app-border) shadow-depth-xl"
      footer={
        <ModalActions
          form="create-dept-form"
          submitText="حفظ البيانات"
          submitLoading={saving}
          onCancel={onClose}
        />
      }
    >
      <form id="create-dept-form" onSubmit={handleSubmit} className="space-y-4 text-right">
        {/* Input 1: Name */}
        <FormField label="اسم الفرع/القسم" required>
          <FormInput
            type="text"
            required
            value={itemName}
            onChange={(e) => setItemName(e.target.value)}
            placeholder="مثال: فرع العمليات أو قسم الأفراد"
            dir="rtl"
          />
        </FormField>

        {/* Input 2: Description */}
        <FormField label="الوصف التوضيحي">
          <FormInput
            type="text"
            value={itemDesc}
            onChange={(e) => setItemDesc(e.target.value)}
            placeholder="وصف مختصر (اختياري)"
            dir="rtl"
          />
        </FormField>

        {/* Checkbox: Sub-department toggle */}
        <div className="p-3.5 bg-(--app-surface-container-low) border border-(--app-border) rounded-xl space-y-3">
          <div className="flex items-center gap-2.5">
            <input
              type="checkbox"
              id="is-sub-department"
              checked={isSubDepartment}
              onChange={(e) => setIsSubDepartment(e.target.checked)}
              className="w-4 h-4 rounded border-(--app-border) bg-(--app-surface) text-blue-600 focus:ring-blue-500/20 cursor-pointer"
            />
            <label htmlFor="is-sub-department" className="text-xs font-bold text-(--app-foreground) cursor-pointer select-none">
              قسم فرعي (تابع لفرع رئيسي)
            </label>
          </div>

          {/* Conditional DropdownList: Appears when checkbox is checked */}
          {isSubDepartment && (
            <div className="pt-2.5 border-t border-(--app-border)/60 animate-in fade-in slide-in-from-top-1 duration-150">
              <CustomSelect
                id="create-dept-parent-branch"
                label="الفرع الرئيسي التابع له"
                value={selectedParentBranchId}
                onChange={setSelectedParentBranchId}
                options={branches.map((b) => ({
                  value: b._id,
                  label: b.name,
                }))}
                placeholder="اختر الفرع الرئيسي..."
                required={isSubDepartment}
              />
            </div>
          )}
        </div>
      </form>
    </ModalShell>
  );
}
