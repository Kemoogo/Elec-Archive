"use client";

import { useState } from "react";
import { ModalShell } from "@/components/ui/modal-shell";
import { ModalActions } from "@/components/ui/modal-actions";
import { FormLabel, FormSelect, FormInput, FormTextarea } from "@/components/ui/form-fields";
import { MapPin, ClipboardList } from "lucide-react";

import { DateField } from "@/components/ui/date-field";
import { useToast } from "@/components/ui/toast";
import { extractApiError } from "@/lib/utils";

interface BaseMission {
  id: string;
  officerId: string;
  title: string;
  description?: string;
  destination?: string;
  startDate: string | Date;
  endDate?: string | Date | null;
  status: "scheduled" | "active" | "completed" | "cancelled";
}

interface OfficerOption {
  id: string;
  fullName: string;
  militaryId: string;
  rank?: string;
}

interface MissionFormProps {
  mission: BaseMission | null;
  officers?: OfficerOption[];
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
}

function getInitialMissionForm(mission: BaseMission | null) {
  if (mission) {
    return {
      officerId: mission.officerId,
      title: mission.title,
      description: mission.description || "",
      destination: mission.destination || "",
      startDate: new Date(mission.startDate).toISOString().split('T')[0],
      endDate: mission.endDate ? new Date(mission.endDate).toISOString().split('T')[0] : "",
      status: mission.status,
    };
  }

  return {
    officerId: "",
    title: "",
    description: "",
    destination: "",
    startDate: new Date().toISOString().split('T')[0],
    endDate: "",
    status: "scheduled" as BaseMission["status"],
  };
}

export function MissionForm({ mission, officers, isOpen, onClose, onSave }: MissionFormProps) {
  if (!isOpen) return null;

  return (
    <MissionFormContent
      key={mission?.id ?? "new"}
      mission={mission}
      officers={officers}
      onClose={onClose}
      onSave={onSave}
    />
  );
}

function MissionFormContent({ mission, officers, onClose, onSave }: Omit<MissionFormProps, "isOpen">) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const { showToast } = useToast();
  const isEditing = !!mission;

  const [form, setForm] = useState(() => getInitialMissionForm(mission));

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

    if (!form.officerId.trim()) {
      setFieldErrors({ officerId: "يرجى تحديد الضابط المعني" });
      setLoading(false);
      return;
    }
    if (!form.title.trim()) {
      setFieldErrors({ title: "عنوان المأمورية مطلوب" });
      setLoading(false);
      return;
    }

    try {
      const url = isEditing 
        ? `/api/arkan-harb/missions/${mission.id}` 
        : "/api/arkan-harb/missions";
      
      const method = isEditing ? "PATCH" : "POST";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
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
        const errorMsg = extractApiError(data, "فشل حفظ المأمورية");
        throw new Error(errorMsg);
      }

      showToast(isEditing ? "تم تحديث المأمورية بنجاح" : "تم تسجيل المأمورية بنجاح", "success");
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
      submitText={isEditing ? "تحديث المأمورية" : "تسجيل المأمورية"}
      submitLoading={loading}
      onCancel={onClose}
    />
  );

  return (
    <ModalShell
      title={
        <div className="flex items-center gap-2">
          <div className={`p-1.5 rounded-lg ${isEditing ? 'bg-(--app-warning)/20 text-(--app-warning)' : 'bg-(--app-info)/20 text-(--app-info)'}`}>
            <ClipboardList className="h-4 w-4" />
          </div>
          <span className="text-base font-black text-(--app-foreground)">
            {isEditing ? "تعديل مأمورية" : "تسجيل مأمورية جديدة"}
          </span>
        </div>
      }
      onClose={onClose}
      footer={footer}
      panelClassName="max-w-[500px]"
    >
      <form id="mission-form" onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 bg-(--app-error)/10 border border-(--app-error)/20 rounded-xl text-(--app-error) text-xs font-bold">
            {error}
          </div>
        )}

        <div className="space-y-4">
          {/* Officer ID */}
          <div className="space-y-1.5">
            <FormLabel htmlFor="officerId" required>الضابط المعني</FormLabel>
            {officers && officers.length > 0 ? (
              <FormSelect
                id="officerId"
                value={form.officerId}
                onChange={(e) => updateField("officerId", e.target.value)}
                required
                className={fieldErrors.officerId ? "border-(--app-error) ring-1 ring-(--app-error)/30 bg-red-500/5" : ""}
              >
                <option value="">اختر ضابط من القائمة...</option>
                {officers.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.fullName} ({o.militaryId})
                  </option>
                ))}
              </FormSelect>
            ) : (
              <FormInput
                id="officerId"
                type="text"
                required
                placeholder="أدخل معرف الضابط..."
                value={form.officerId}
                onChange={(e) => updateField("officerId", e.target.value)}
                className={fieldErrors.officerId ? "border-(--app-error) ring-1 ring-(--app-error)/30 bg-red-500/5" : ""}
              />
            )}
            {fieldErrors.officerId && (
              <p className="text-xs font-bold text-(--app-error) mt-1">{fieldErrors.officerId}</p>
            )}
          </div>

          {/* Title */}
          <div className="space-y-1.5">
            <FormLabel htmlFor="title" required>عنوان المأمورية</FormLabel>
            <FormInput
              id="title"
              type="text"
              required
              placeholder="مثال: مأمورية خارجية، تدريب..."
              value={form.title}
              onChange={(e) => updateField("title", e.target.value)}
              className={fieldErrors.title ? "border-(--app-error) ring-1 ring-(--app-error)/30 bg-red-500/5" : ""}
            />
            {fieldErrors.title && (
              <p className="text-xs font-bold text-(--app-error) mt-1">{fieldErrors.title}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4 items-start">
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
              label="تاريخ الانتهاء"
              value={form.endDate}
              onChange={(v) => updateField("endDate", v)}
              error={fieldErrors.endDate}
            />
          </div>

          {/* Destination */}
          <div className="space-y-1.5">
            <FormLabel htmlFor="destination">الجهة / الوجهة</FormLabel>
            <div className="relative">
              <FormInput
                id="destination"
                type="text"
                placeholder="أدخل مآل المأمورية..."
                value={form.destination}
                onChange={(e) => setForm({ ...form, destination: e.target.value })}
                className="pr-10"
              />
              <MapPin className="absolute right-3 top-3.5 h-4 w-4 text-(--app-muted-foreground)" />
            </div>
          </div>

          {/* Status */}
          <div className="space-y-1.5">
            <FormLabel htmlFor="status">حالة المأمورية</FormLabel>
            <FormSelect
              id="status"
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value as BaseMission["status"] })}
            >
              <option value="scheduled">مجدولة</option>
              <option value="active">نشطة</option>
              <option value="completed">منتهية</option>
              <option value="cancelled">ملغاة</option>
            </FormSelect>
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <FormLabel htmlFor="description">ملاحظات</FormLabel>
            <FormTextarea
              id="description"
              placeholder="أي تفاصيل أخرى..."
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </div>
        </div>
      </form>
    </ModalShell>
  );
}
