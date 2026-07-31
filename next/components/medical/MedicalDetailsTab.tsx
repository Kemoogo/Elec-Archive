"use client";

import { useState } from "react";
import { AlertCircle, Save } from "lucide-react";
import { FormField, FormTextarea, FormSelect } from "@/components/ui/form-fields";
import type { MedicalRecord } from "@/lib/medical/types";

interface MedicalDetailsTabProps {
  record: MedicalRecord | null;
  patientName: string;
  canEdit: boolean;
  onSave?: (data: Omit<MedicalRecord, "patientId">) => Promise<void>;
}

export function MedicalDetailsTab({ record, patientName, canEdit, onSave }: MedicalDetailsTabProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [allergies, setAllergies] = useState(record?.allergies.join("\n") ?? "");
  const [chronicConditions, setChronicConditions] = useState(record?.chronicConditions.join("\n") ?? "");
  const [bloodType, setBloodType] = useState<string>(record?.bloodType ?? "");
  const [medicalNotes, setMedicalNotes] = useState(record?.medicalNotes ?? "");
  const [severityNotes, setSeverityNotes] = useState(record?.severityNotes ?? "");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    if (!onSave) return;
    setIsSaving(true);
    setError(null);
    try {
      await onSave({
        patientName,
        allergies: allergies
          .split("\n")
          .map((a) => a.trim())
          .filter(Boolean),
        chronicConditions: chronicConditions
          .split("\n")
          .map((c) => c.trim())
          .filter(Boolean),
        bloodType: bloodType || undefined,
        medicalNotes,
        severityNotes,
        version: record?.version ?? 0,
      });
      setIsEditing(false);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "حدث خطأ غير متوقع";
      setError(message);
    } finally {
      setIsSaving(false);
    }
  };

  if (!record && !isEditing) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-(--app-muted-foreground)">
          <AlertCircle className="w-4 h-4" />
          <span className="text-sm font-bold">لم يتم تعبئة البيانات الطبية بعد</span>
        </div>
        {canEdit && (
          <button
            type="button"
            onClick={() => setIsEditing(true)}
            className="text-sm font-bold text-(--color-primary) hover:underline"
          >
            إضافة البيانات الطبية
          </button>
        )}
      </div>
    );
  }

  if (isEditing) {
    return (
      <div className="space-y-4">
        {error && (
          <div className="rounded-lg bg-(--app-error)/10 border border-(--app-error)/30 p-3 text-sm font-bold text-(--app-error)">
            {error}
          </div>
        )}

        <FormField label="الحساسيات (كل حساسية في سطر)">
          <FormTextarea
            id="allergies"
            value={allergies}
            onChange={(e) => setAllergies(e.target.value)}
            rows={3}
            placeholder="حساسية من البنسلين&#10;حساسية من الأسبرين"
          />
        </FormField>

        <FormField label="الأمراض المزمنة (كل مرض في سطر)">
          <FormTextarea
            id="chronicConditions"
            value={chronicConditions}
            onChange={(e) => setChronicConditions(e.target.value)}
            rows={3}
            placeholder="السكري&#10;ارتفاع ضغط الدم"
          />
        </FormField>

        <FormField label="فصيلة الدم">
          <FormSelect
            id="bloodType"
            value={bloodType}
            onChange={(e) => setBloodType(e.target.value)}
          >
            <option value="">اختر فصيلة الدم...</option>
            <option value="A+">A+</option>
            <option value="A-">A-</option>
            <option value="B+">B+</option>
            <option value="B-">B-</option>
            <option value="AB+">AB+</option>
            <option value="AB-">AB-</option>
            <option value="O+">O+</option>
            <option value="O-">O-</option>
          </FormSelect>
        </FormField>

        <FormField label="ملاحظات طبية">
          <FormTextarea
            id="medicalNotes"
            value={medicalNotes}
            onChange={(e) => setMedicalNotes(e.target.value)}
            rows={3}
          />
        </FormField>

        <FormField label="ملاحظات شدة الحالة">
          <FormTextarea
            id="severityNotes"
            value={severityNotes}
            onChange={(e) => setSeverityNotes(e.target.value)}
            rows={3}
          />
        </FormField>

        <div className="flex items-center justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={() => {
              setIsEditing(false);
              setError(null);
            }}
            className="px-4 py-2 text-sm font-bold text-(--app-muted-foreground) hover:text-(--app-muted-foreground) transition-colors"
          >
            إلغاء
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="btn-primary disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            {isSaving ? "جاري الحفظ..." : "حفظ"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <span className="text-xs font-bold text-(--app-muted-foreground) block mr-1">الحساسيات</span>
        {record!.allergies.length > 0 ? (
          <ul className="text-sm font-bold text-(--app-foreground) space-y-1">
            {record!.allergies.map((allergy, idx) => (
              <li key={idx} className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-(--app-error)" />
                {allergy}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-(--app-muted-foreground)">لا توجد حساسيات مسجلة</p>
        )}
      </div>

      <div className="space-y-1.5">
        <span className="text-xs font-bold text-(--app-muted-foreground) block mr-1">الأمراض المزمنة</span>
        {record!.chronicConditions.length > 0 ? (
          <ul className="text-sm font-bold text-(--app-foreground) space-y-1">
            {record!.chronicConditions.map((condition, idx) => (
              <li key={idx} className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-(--app-warning)" />
                {condition}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-(--app-muted-foreground)">لا توجد أمراض مزمنة مسجلة</p>
        )}
      </div>

      <div className="space-y-1.5">
        <span className="text-xs font-bold text-(--app-muted-foreground) block mr-1">فصيلة الدم</span>
        <p className="text-sm font-bold text-(--app-foreground)">
          {record!.bloodType ? (
            <span className="inline-flex items-center justify-center px-3 py-1 bg-(--app-error)/10 text-(--app-error) border border-(--app-error)/20 rounded-lg text-xs font-bold font-mono">
              {record!.bloodType}
            </span>
          ) : (
            "غير محددة"
          )}
        </p>
      </div>

      <div className="space-y-1.5">
        <span className="text-xs font-bold text-(--app-muted-foreground) block mr-1">ملاحظات طبية</span>
        <p className="text-sm font-bold text-(--app-foreground)">{record!.medicalNotes || "لا توجد ملاحظات"}</p>
      </div>

      <div className="space-y-1.5">
        <span className="text-xs font-bold text-(--app-muted-foreground) block mr-1">ملاحظات شدة الحالة</span>
        <p className="text-sm font-bold text-(--app-foreground)">{record!.severityNotes || "لا توجد ملاحظات"}</p>
      </div>

      {canEdit && (
        <button
          type="button"
          onClick={() => setIsEditing(true)}
          className="text-sm font-bold text-(--color-primary) hover:underline"
        >
          تعديل البيانات الطبية
        </button>
      )}
    </div>
  );
}
