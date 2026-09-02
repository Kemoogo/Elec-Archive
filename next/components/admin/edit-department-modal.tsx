"use client";

import React, { useState } from "react";
import { ModalShell } from "@/components/ui/modal-shell";
import { ModalActions } from "@/components/ui/modal-actions";
import { FormField, FormInput } from "@/components/ui/form-fields";
import { useToast } from "@/components/ui/toast";
import { extractApiError } from "@/lib/utils";
import { ShieldCheck } from "lucide-react";

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
        <ModalActions>
          <button
            type="submit"
            form="edit-dept-form"
            disabled={saving}
            className="btn-primary disabled:opacity-50 cursor-pointer active:scale-95 transition-transform"
          >
            {saving ? "جاري الحفظ..." : "حفظ البيانات"}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="btn-secondary cursor-pointer active:scale-95 transition-transform"
          >
            إلغاء
          </button>
        </ModalActions>
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
          <FormField label="الفرع الرئيسي التابع له" required>
            <select
              value={selectedParentBranchId}
              onChange={(e) => setSelectedParentBranchId(e.target.value)}
              className="w-full px-3 py-2 bg-(--app-surface) border border-(--app-border) rounded-xl text-sm font-bold text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-blue-500/20 focus:border-blue-500 transition-all text-right"
              required
            >
              <option value="">اختر الفرع الرئيسي...</option>
              {branches.map((b) => (
                <option key={b._id} value={b._id}>
                  {b.name}
                </option>
              ))}
            </select>
          </FormField>
        )}
      </form>
    </ModalShell>
  );
}
