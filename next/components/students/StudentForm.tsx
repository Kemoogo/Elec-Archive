"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { GraduationCap } from "lucide-react";
import { ModalActions } from "@/components/ui/modal-actions";
import { ModalShell } from "@/components/ui/modal-shell";
import { DateField } from "@/components/ui/date-field";
import { FormField, FormInput, FormTextarea } from "@/components/ui/form-fields";
import { useToast } from "@/components/ui/toast";
import { extractApiError } from "@/lib/utils";

interface StudentFormProps {
  mode: "create" | "edit";
  initialData?: {
    _id?: string;
    studentId: string;
    fullName: string;
    enrollDate: string;
    notes?: string;
  };
  onSuccess?: () => void;
}

export function StudentForm({ mode, initialData, onSuccess }: StudentFormProps) {
  const router = useRouter();
  const { showToast } = useToast();
  const [isPending, startTransition] = useTransition();
  const [isOpen, setIsOpen] = useState(mode === "edit");
  const [error, setError] = useState("");
  const formId = mode === "create" ? "create-student-form" : "edit-student-form";

  const [studentId, setStudentId] = useState(initialData?.studentId ?? "");
  const [fullName, setFullName] = useState(initialData?.fullName ?? "");
  const [enrollDate, setEnrollDate] = useState(
    initialData?.enrollDate
      ? new Date(initialData.enrollDate).toISOString().split("T")[0]
      : new Date().toISOString().split("T")[0],
  );
  const [notes, setNotes] = useState(initialData?.notes ?? "");

  const resetForm = () => {
    setStudentId(initialData?.studentId ?? "");
    setFullName(initialData?.fullName ?? "");
    setEnrollDate(
      initialData?.enrollDate
        ? new Date(initialData.enrollDate).toISOString().split("T")[0]
        : new Date().toISOString().split("T")[0],
    );
    setNotes(initialData?.notes ?? "");
    setError("");
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    const body: Record<string, string> = {
      fullName,
      enrollDate,
    };

    if (mode === "create") {
      body.studentId = studentId;
      if (notes.trim()) {
        body.notes = notes.trim();
      }
    } else {
      body.notes = notes.trim();
    }

    startTransition(async () => {
      try {
        const url =
          mode === "create"
            ? "/api/students"
            : `/api/students/${initialData?._id}`;
        const method = mode === "create" ? "POST" : "PATCH";

        const res = await fetch(url, {
          method,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });

        const data = await res.json();

        if (!res.ok) {
          setError(extractApiError(data, "حدث خطأ"));
          return;
        }

        setIsOpen(false);
        if (mode === "create") {
          resetForm();
          showToast("تم إضافة الطالب بنجاح", "success");
          router.push(`/students/${data.data._id}`);
        } else {
          showToast("تم تحديث بيانات الطالب بنجاح", "success");
          router.refresh();
        }
        onSuccess?.();
      } catch {
        setError("حدث خطأ في الاتصال");
        showToast("حدث خطأ في الاتصال بالخادم", "error");
      }
    });
  }

  if (mode === "create") {
    return (
      <>
         <button
           onClick={() => {
             resetForm();
             setIsOpen(true);
           }}
           className="btn-primary"
         >
           <>
             <GraduationCap className="h-4 w-4" />
             إضافة طالب
           </>
         </button>
        {isOpen && (
          <ModalShell
            title={mode === "create" ? "إضافة طالب جديد" : "تعديل بيانات الطالب"}
            icon={<GraduationCap className="w-4 h-4" />}
            panelClassName="max-w-[480px]"
            onClose={() => {
              setIsOpen(false);
              resetForm();
            }}
            footer={
              <ModalActions
                form={formId}
                submitText="إضافة"
                submitLoading={isPending}
                onCancel={() => {
                  setIsOpen(false);
                  resetForm();
                }}
              />
            }
          >
            <form id={formId} onSubmit={handleSubmit} className="space-y-4">
              <FormFields
                studentId={studentId}
                setStudentId={setStudentId}
                fullName={fullName}
                setFullName={setFullName}
                enrollDate={enrollDate}
                setEnrollDate={setEnrollDate}
                notes={notes}
                setNotes={setNotes}
                mode={mode}
              />
              {error && <p className="text-sm text-(--app-error)">{error}</p>}
            </form>
          </ModalShell>
        )}
      </>
    );
  }

  // Edit mode — inline form
  return (
    <form onSubmit={handleSubmit} className="space-y-4" dir="rtl">
      <FormFields
        studentId={studentId}
        setStudentId={setStudentId}
        fullName={fullName}
        setFullName={setFullName}
        enrollDate={enrollDate}
        setEnrollDate={setEnrollDate}
        notes={notes}
        setNotes={setNotes}
        mode={mode}
      />
      {error && <p className="text-sm text-(--app-error)">{error}</p>}
      <button
        type="submit"
        disabled={isPending}
        className="btn-primary disabled:opacity-50"
      >
        {isPending ? "جاري الحفظ..." : "حفظ التعديلات"}
      </button>
    </form>
  );
}

function FormFields({
  studentId,
  setStudentId,
  fullName,
  setFullName,
  enrollDate,
  setEnrollDate,
  notes,
  setNotes,
  mode,
}: {
  studentId: string;
  setStudentId: (v: string) => void;
  fullName: string;
  setFullName: (v: string) => void;
  enrollDate: string;
  setEnrollDate: (v: string) => void;
  notes: string;
  setNotes: (v: string) => void;
  mode: "create" | "edit";
}) {
  return (
    <div className="space-y-3">
      {mode === "create" && (
        <FormField label="رقم الطالب" required>
          <FormInput id="student-studentId" type="text" value={studentId} onChange={(e) => setStudentId(e.target.value)} required placeholder="STU-2024-001" />
        </FormField>
      )}

      <FormField label="الاسم الكامل" required>
        <FormInput id="student-fullName" type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} required placeholder="أحمد محمد علي" />
      </FormField>

      <DateField
        id="student-enrollDate"
        label="تاريخ التسجيل"
        value={enrollDate}
        onChange={(v) => setEnrollDate(v)}
        required
      />

      <FormField label="ملاحظات">
        <FormTextarea id="student-notes" value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} placeholder="ملاحظات إضافية..." />
      </FormField>
    </div>
  );
}
