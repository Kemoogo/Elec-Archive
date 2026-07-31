"use client";

import { useState } from "react";
import { ModalShell } from "@/components/ui/modal-shell";
import { ModalActions } from "@/components/ui/modal-actions";
import { DateField } from "@/components/ui/date-field";
import { FormLabel, FormSelect, FormInput, FormTextarea } from "@/components/ui/form-fields";
import { Building, ListPlus } from "lucide-react";
import { useToast } from "@/components/ui/toast";
import { extractApiError } from "@/lib/utils";

interface OfficerOption {
  id: string;
  name: string;
  rank: string;
  militaryId: string;
}

import { type Position } from "./PositionAssignmentTable";

interface PositionAssignmentFormProps {
  position: Position | null;
  officers: OfficerOption[];
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
}

function getInitialPositionForm(position: Position | null) {
  if (position) {
    return {
      officerId: position.officerId || "",
      positionTitle: position.positionTitle || "",
      positionType: position.positionType || "primary",
      substituteForOfficerId: position.substituteForOfficerId || "",
      startDate: position.startDate ? new Date(position.startDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
      endDate: position.endDate ? new Date(position.endDate).toISOString().split('T')[0] : "",
      orderNumber: position.orderNumber || "",
      notes: position.notes || "",
      status: position.status || "active",
    };
  }

  return {
    officerId: "",
    positionTitle: "",
    positionType: "primary" as "primary" | "substitute",
    substituteForOfficerId: "",
    startDate: new Date().toISOString().split('T')[0],
    endDate: "",
    orderNumber: "",
    notes: "",
    status: "active" as "active" | "ended",
  };
}

export function PositionAssignmentForm({ position, officers, isOpen, onClose, onSave }: PositionAssignmentFormProps) {
  if (!isOpen) return null;

  return (
    <PositionAssignmentFormContent
      key={position?.id ?? "new"}
      position={position}
      officers={officers}
      onClose={onClose}
      onSave={onSave}
    />
  );
}

function PositionAssignmentFormContent({
  position,
  officers,
  onClose,
  onSave,
}: Omit<PositionAssignmentFormProps, "isOpen">) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const { showToast } = useToast();
  const isEditing = !!position;

  const [form, setForm] = useState(() => getInitialPositionForm(position));

  const updateField = (key: string, value: unknown) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (fieldErrors[key]) {
      setFieldErrors((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setFieldErrors({});

    if (!form.officerId) {
      setFieldErrors({ officerId: "يرجى اختيار الضابط" });
      setLoading(false);
      return;
    }
    if (!form.positionTitle.trim()) {
      setFieldErrors({ positionTitle: "المسمى الوظيفي مطلوب" });
      setLoading(false);
      return;
    }

    try {
      const url = isEditing 
        ? `/api/arkan-harb/positions/${position.id}` 
        : "/api/arkan-harb/positions";
      
      const method = isEditing ? "PATCH" : "POST";

      const payload = { ...form };
      if (payload.positionType === "primary") {
        payload.substituteForOfficerId = "";
      }

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        if (data.details && Array.isArray(data.details)) {
          const errs: Record<string, string> = {};
          data.details.forEach((d: { field?: string; message?: string }) => {
            if (d.field) errs[d.field] = d.message || "بيان غير صالح";
          });
          setFieldErrors(errs);
        }
        const errorMsg = extractApiError(data, "فشل حفظ التعيين الوظيفي");
        throw new Error(errorMsg);
      }

      showToast(isEditing ? "تم تحديث التعيين الوظيفي بنجاح" : "تم حفظ التعيين الوظيفي بنجاح", "success");
      onSave();
    } catch (err) {
      const message = err instanceof Error ? err.message : "حدث خطأ غير متوقع";
      setError(message);
      showToast(message, "error");
    } finally {
      setLoading(false);
    }
  };

  const footer = (
    <ModalActions 
      submitText={isEditing ? "تحديث التعيين" : "حفظ التعيين"}
      submitLoading={loading}
      onCancel={onClose}
    />
  );

  return (
    <ModalShell
      title={
        <div className="flex items-center gap-2">
          <div className={`p-1.5 rounded-lg ${isEditing ? 'bg-(--app-warning)/20 text-(--app-warning)' : 'bg-(--app-info)/20 text-(--app-info)'}`}>
            <ListPlus className="h-4 w-4" />
          </div>
          <span className="text-base font-black text-(--app-foreground)">
            {isEditing ? "تعديل تعيين وظيفي" : "إضافة تعيين وظيفي جديد"}
          </span>
        </div>
      }
      onClose={onClose}
      footer={footer}
      panelClassName="max-w-[500px]"
    >
      <form id="position-form" onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 bg-(--app-error)/10 border border-(--app-error)/20 rounded-xl text-(--app-error) text-xs font-bold">
            {error}
          </div>
        )}

        <div className="space-y-4">
          {/* Officer ID */}
          <div className="space-y-1.5">
            <FormLabel htmlFor="officerId" required>الضابط المعين</FormLabel>
            <FormSelect
              id="officerId"
              required
              value={form.officerId}
              onChange={(e) => updateField("officerId", e.target.value)}
              className={fieldErrors.officerId ? "border-(--app-error) ring-1 ring-(--app-error)/30 bg-red-500/5" : ""}
            >
              <option value="" disabled>اختر الضابط...</option>
              {officers.map(off => (
                <option key={off.id} value={off.id}>{off.rank} / {off.name}</option>
              ))}
            </FormSelect>
            {fieldErrors.officerId && (
              <p className="text-xs font-bold text-(--app-error) mt-1">{fieldErrors.officerId}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Position Title */}
            <div className="space-y-1.5">
              <FormLabel htmlFor="positionTitle" required>المسمى الوظيفي</FormLabel>
              <div className="relative">
                <FormInput
                  id="positionTitle"
                  type="text"
                  required
                  placeholder="رئيس فرع، قائد..."
                  value={form.positionTitle}
                  onChange={(e) => updateField("positionTitle", e.target.value)}
                  className={`pr-10 ${fieldErrors.positionTitle ? "border-(--app-error) ring-1 ring-(--app-error)/30 bg-red-500/5" : ""}`}
                />
                <Building className="absolute right-3 top-3.5 h-4 w-4 text-(--app-muted-foreground)" />
              </div>
              {fieldErrors.positionTitle && (
                <p className="text-xs font-bold text-(--app-error) mt-1">{fieldErrors.positionTitle}</p>
              )}
            </div>

            {/* Position Type */}
            <div className="space-y-1.5">
              <FormLabel htmlFor="positionType" required>نوع التعيين</FormLabel>
              <FormSelect
                id="positionType"
                required
                value={form.positionType}
                onChange={(e) => updateField("positionType", e.target.value as "primary" | "substitute")}
              >
                <option value="primary">أساسي</option>
                <option value="substitute">بديل</option>
              </FormSelect>
            </div>
          </div>

          {/* Substitute For Officer */}
          {form.positionType === "substitute" && (
            <div className="space-y-1.5 animate-in fade-in slide-in-from-top-1">
              <FormLabel htmlFor="substituteForOfficerId" required className="text-(--app-warning)">الضابط البديل عنه (الأصلي)</FormLabel>
              <FormSelect
                id="substituteForOfficerId"
                required
                value={form.substituteForOfficerId}
                onChange={(e) => updateField("substituteForOfficerId", e.target.value)}
                focusVariant="amber"
                className={fieldErrors.substituteForOfficerId ? "border-(--app-error) ring-1 ring-(--app-error)/30 bg-red-500/5" : ""}
              >
                <option value="" disabled>اختر الضابط الأصلي...</option>
                {officers.filter(o => o.id !== form.officerId).map(off => (
                  <option key={off.id} value={off.id}>{off.rank} / {off.name}</option>
                ))}
              </FormSelect>
              {fieldErrors.substituteForOfficerId && (
                <p className="text-xs font-bold text-(--app-error) mt-1">{fieldErrors.substituteForOfficerId}</p>
              )}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            {/* Start Date */}
            <DateField
              id="startDate"
              label="تاريخ البداية"
              value={form.startDate}
              onChange={(v) => updateField("startDate", v)}
              error={fieldErrors.startDate}
              required
            />

            {/* End Date */}
            <DateField
              id="endDate"
              label="تاريخ الانتهاء (اختياري)"
              value={form.endDate}
              onChange={(v) => updateField("endDate", v)}
              error={fieldErrors.endDate}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Order Number */}
            <div className="space-y-1.5">
              <FormLabel htmlFor="orderNumber">رقم الأمر (اختياري)</FormLabel>
              <FormInput
                id="orderNumber"
                type="text"
                placeholder="أدخل رقم البند/الأمر"
                value={form.orderNumber}
                onChange={(e) => setForm({ ...form, orderNumber: e.target.value })}
              />
            </div>

            {/* Status */}
            <div className="space-y-1.5">
              <FormLabel htmlFor="status">حالة التعيين</FormLabel>
              <FormSelect
                id="status"
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value as "active" | "ended" })}
              >
                <option value="active">ساري</option>
                <option value="ended">منتهي</option>
              </FormSelect>
            </div>
          </div>

          {/* Remarks */}
          <div className="space-y-1.5">
            <FormLabel htmlFor="notes">ملاحظات (اختياري)</FormLabel>
            <FormTextarea
              id="notes"
              placeholder="أي تفاصيل أخرى..."
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
            />
          </div>
        </div>
      </form>
    </ModalShell>
  );
}
