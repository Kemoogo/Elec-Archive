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
  description?: string;
}

interface DepartmentItem {
  _id: string;
  name: string;
  branchId: { _id: string; name: string } | string;
  description?: string;
}

export type EditItemType =
  | { type: "branch"; data: BranchItem }
  | { type: "department"; data: DepartmentItem };

interface EditDepartmentModalProps {
  branches: BranchItem[];
  item: EditItemType;
  onClose: () => void;
  onSuccess: () => void;
}

export function EditDepartmentModal({
  branches,
  item,
  onClose,
  onSuccess,
}: EditDepartmentModalProps) {
  const { showToast } = useToast();
  const [itemName, setItemName] = useState(item.data.name);
  const [itemDesc, setItemDesc] = useState(item.data.description || "");

  const initialBranchId =
    item.type === "department"
      ? typeof item.data.branchId === "object"
        ? item.data.branchId._id
        : item.data.branchId
      : branches[0]?._id ?? "";

  const [selectedParentBranchId, setSelectedParentBranchId] = useState(initialBranchId);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!itemName.trim()) {
      showToast("يرجى إدخال اسم الفرع/القسم", "error");
      return;
    }

    if (item.type === "department" && !selectedParentBranchId) {
      showToast("يرجى اختيار الفرع التابع له", "error");
      return;
    }

    setSaving(true);
    try {
      const url =
        item.type === "branch"
          ? `/api/branches/${item.data._id}`
          : `/api/departments/${item.data._id}`;

      const body =
        item.type === "branch"
          ? { name: itemName, description: itemDesc }
          : { name: itemName, branchId: selectedParentBranchId, description: itemDesc };

      const res = await fetch(url, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();

      if (!res.ok) {
        showToast(extractApiError(data, "فشل التعديل"), "error");
        return;
      }

      showToast("تم التعديل بنجاح", "success");
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
      title={item.type === "branch" ? "تعديل بيانات الفرع" : "تعديل بيانات القسم"}
      icon={<ShieldCheck className="w-4 h-4" />}
      onClose={onClose}
      overlayClassName="bg-black/40"
      panelClassName="max-h-[85vh] max-w-lg border-(--app-border) shadow-depth-xl"
      footer={
        <ModalActions
          form="edit-dept-form"
          submitText="حفظ البيانات"
          submitLoading={saving}
          onCancel={onClose}
        />
      }
    >
      <form id="edit-dept-form" onSubmit={handleSubmit} className="space-y-4 text-right">
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

        {/* In Edit mode for Department, show parent branch selection */}
        {item.type === "department" && (
          <CustomSelect
            id="edit-dept-parent-branch"
            label="الفرع الرئيسي التابع له"
            value={selectedParentBranchId}
            onChange={setSelectedParentBranchId}
            options={branches.map((b) => ({
              value: b._id,
              label: b.name,
            }))}
            placeholder="اختر الفرع الرئيسي..."
            required
          />
        )}
      </form>
    </ModalShell>
  );
}
