"use client";

import { useState } from "react";
import { ModalShell } from "@/components/ui/modal-shell";
import { ModalActions } from "@/components/ui/modal-actions";
import { FormLabel, FormSelect, FormInput, FormTextarea } from "@/components/ui/form-fields";
import { MapPin, ClipboardList, User, FileText } from "lucide-react";

import { DateField } from "@/components/ui/date-field";
import { useToast } from "@/components/ui/toast";
import { extractApiError } from "@/lib/utils";

interface BaseMission {
  id: string;
  officerId: string;
  officerName?: string;
  officerRankLabel?: string;
  officerLabel?: string;
  missionType?: "internal_daily" | "external_multiday";
  title: string;
  description?: string;
  destination?: string;
  linkedFaxId?: string;
  startDate: string | Date;
  endDate?: string | Date | null;
  status: "scheduled" | "active" | "completed" | "cancelled" | "postponed";
}

interface OfficerOption {
  id: string;
  fullName: string;
  militaryId: string;
  rank?: string;
  officerLabel?: string;
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
      missionType: mission.missionType || "external_multiday",
      title: mission.title,
      description: mission.description || "",
      destination: mission.destination || "",
      linkedFaxId: mission.linkedFaxId || "",
      startDate: new Date(mission.startDate).toISOString().split('T')[0],
      endDate: mission.endDate ? new Date(mission.endDate).toISOString().split('T')[0] : "",
      status: mission.status,
    };
  }

  return {
    officerId: "",
    missionType: "external_multiday" as "internal_daily" | "external_multiday",
    title: "",
    description: "",
    destination: "",
    linkedFaxId: "",
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

  const initialStartDate = mission?.startDate
    ? new Date(mission.startDate).toISOString().split("T")[0]
    : new Date().toISOString().split("T")[0];
  const initialEndDate = mission?.endDate
    ? new Date(mission.endDate).toISOString().split("T")[0]
    : "";

  const [form, setForm] = useState(() => getInitialMissionForm(mission));
  const [isExtended, setIsExtended] = useState<boolean>(
    Boolean(initialEndDate && initialEndDate !== initialStartDate)
  );

  const currentOfficerDisplay =
    mission?.officerLabel ||
    (mission?.officerRankLabel && mission?.officerName
      ? `${mission.officerRankLabel} / ${mission.officerName}`
      : mission?.officerName);

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

    if (isExtended && form.endDate && form.startDate && new Date(form.endDate) < new Date(form.startDate)) {
      setFieldErrors({ endDate: "تاريخ الانتهاء يجب أن يكون بعد أو يساوي تاريخ البداية" });
      setLoading(false);
      return;
    }

    try {
      const url = isEditing 
        ? `/api/arkan-harb/missions/${mission.id}` 
        : "/api/arkan-harb/missions";
      
      const method = isEditing ? "PATCH" : "POST";

      const payload = {
        ...form,
        missionType: isExtended ? "external_multiday" : form.missionType,
        endDate: isExtended ? form.endDate : "",
      };

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
      form="mission-form"
      submitText={isEditing ? "تحديث المأمورية" : "تسجيل المأمورية"}
      submitLoading={loading}
      onCancel={onClose}
    />
  );

  return (
    <ModalShell
      title={isEditing ? "تعديل مأمورية" : "تسجيل مأمورية جديدة"}
      icon={<ClipboardList className="w-4 h-4" />}
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
          {/* Officer ID / Display */}
          <div className="space-y-1.5">
            <FormLabel htmlFor="officerId" required>الضابط المعني الرئيسي</FormLabel>
            {isEditing ? (
              <div className="p-2.5 bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-extrabold text-(--color-primary) flex items-center gap-2">
                <User className="w-4 h-4 text-(--app-muted-foreground) shrink-0" />
                <span>{currentOfficerDisplay || form.officerId}</span>
              </div>
            ) : officers && officers.length > 0 ? (
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
                    {o.officerLabel || (o.rank ? `${o.rank} / ${o.fullName}` : o.fullName)}
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
              placeholder="مثال: مأمورية تفتيش، مأمورية تدريب خارجية..."
              value={form.title}
              onChange={(e) => updateField("title", e.target.value)}
              className={fieldErrors.title ? "border-(--app-error) ring-1 ring-(--app-error)/30 bg-red-500/5" : ""}
            />
            {fieldErrors.title && (
              <p className="text-xs font-bold text-(--app-error) mt-1">{fieldErrors.title}</p>
            )}
          </div>

          {/* Mission Category Type Selector */}
          <div className="space-y-1.5">
            <FormLabel>تصنيف نوع المأمورية</FormLabel>
            <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-700">
              <button
                type="button"
                onClick={() => {
                  setIsExtended(false);
                  updateField("missionType", "internal_daily");
                  updateField("endDate", "");
                }}
                className={`py-2 px-3 text-xs font-extrabold rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                  !isExtended && form.missionType === "internal_daily"
                    ? "bg-(--app-surface) text-(--color-primary) shadow-xs font-black"
                    : "text-(--app-muted-foreground) hover:text-(--color-primary)"
                }`}
              >
                <span>مأمورية يومية داخلية</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsExtended(true);
                  updateField("missionType", "external_multiday");
                  if (!form.endDate) updateField("endDate", form.startDate);
                }}
                className={`py-2 px-3 text-xs font-extrabold rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                  isExtended || form.missionType === "external_multiday"
                    ? "bg-(--app-surface) text-(--color-primary) shadow-xs font-black"
                    : "text-(--app-muted-foreground) hover:text-(--color-primary)"
                }`}
              >
                <span>مأمورية خارجية متعددة الأيام</span>
              </button>
            </div>
          </div>

          {/* Date Fields */}
          {!isExtended ? (
            <DateField
              id="startDate"
              label="تاريخ المأمورية"
              value={form.startDate}
              onChange={(v) => {
                updateField("startDate", v);
                updateField("endDate", "");
              }}
              error={fieldErrors.startDate}
              required
            />
          ) : (
            <div className="grid grid-cols-2 gap-4 items-start">
              <DateField
                id="startDate"
                label="تاريخ البداية"
                value={form.startDate}
                onChange={(v) => updateField("startDate", v)}
                error={fieldErrors.startDate}
                required
              />
              <DateField
                id="endDate"
                label="تاريخ الانتهاء المتوقع"
                value={form.endDate}
                onChange={(v) => updateField("endDate", v)}
                error={fieldErrors.endDate}
                required
              />
            </div>
          )}

          {/* Destination */}
          <div className="space-y-1.5">
            <FormLabel htmlFor="destination">الجهة / الوجهة</FormLabel>
            <div className="relative">
              <FormInput
                id="destination"
                type="text"
                placeholder="مثال: قيادة المنطقة، التجنيد، المحكمة العسكرية..."
                value={form.destination}
                onChange={(e) => setForm({ ...form, destination: e.target.value })}
                className="pr-10"
              />
              <MapPin className="absolute right-3 top-3.5 h-4 w-4 text-(--app-muted-foreground)" />
            </div>
          </div>

          {/* Linked Fax */}
          <div className="space-y-1.5">
            <FormLabel htmlFor="linkedFaxId">الفاكس أو الخطاب المرجعي (اختياري)</FormLabel>
            <div className="relative">
              <FormInput
                id="linkedFaxId"
                type="text"
                placeholder="رقم الفاكس الإداري أو المكاتبة المرجعية..."
                value={form.linkedFaxId}
                onChange={(e) => setForm({ ...form, linkedFaxId: e.target.value })}
                className="pr-10"
              />
              <FileText className="absolute right-3 top-3.5 h-4 w-4 text-(--app-muted-foreground)" />
            </div>
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <FormLabel htmlFor="description">ملاحظات والتفاصيل</FormLabel>
            <FormTextarea
              id="description"
              placeholder="أي تفاصيل أو مهام خاصة بالمأمورية..."
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </div>
        </div>
      </form>
    </ModalShell>
  );
}

