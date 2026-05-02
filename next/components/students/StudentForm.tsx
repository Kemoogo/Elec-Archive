"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { GraduationCap } from "lucide-react";
import { ModalActions } from "@/components/ui/modal-actions";
import { ModalShell } from "@/components/ui/modal-shell";
import { DateField } from "@/components/ui/date-field";

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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    const body: Record<string, string> = {
      fullName,
      enrollDate,
    };

    if (mode === "create") {
      body.studentId = studentId;
    }
    if (notes) {
      body.notes = notes;
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
          setError(data.error ?? "حدث خطأ");
          return;
        }

        setIsOpen(false);
        if (mode === "create") {
          router.push(`/students/${data.data._id}`);
        } else {
          router.refresh();
        }
        onSuccess?.();
      } catch {
        setError("حدث خطأ في الاتصال");
      }
    });
  }

  if (mode === "create") {
    return (
      <>
         <button
           onClick={() => setIsOpen(true)}
           className="btn-primary"
         >
           <>
             <GraduationCap className="h-4 w-4" />
             إضافة طالب
           </>
         </button>
        {isOpen && (
          <ModalShell
            title="إضافة طالب جديد"
            panelClassName="max-w-[480px]"
            onClose={() => setIsOpen(false)}
            footer={
              <ModalActions>
                <button
                  type="submit"
                  form={formId}
                  disabled={isPending}
                  className="rounded-md bg-(--app-accent) px-4 py-2 text-sm font-medium text-(--app-accent-foreground) hover:bg-(--app-accent)/90 disabled:opacity-50"
                >
                  {isPending ? "جاري الحفظ..." : "إضافة"}
                </button>
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="rounded-md border border-(--app-border) px-4 py-2 text-sm text-foreground hover:bg-white/10"
                >
                  إلغاء
                </button>
              </ModalActions>
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
        className="rounded-md bg-(--app-accent) px-4 py-2 text-sm text-(--app-accent-foreground) font-medium hover:bg-(--app-accent)/90 disabled:opacity-50"
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
        <div>
          <label htmlFor="student-studentId" className="mb-1 block text-xs text-(--app-muted-foreground)">رقم الطالب *</label>
          <input
            id="student-studentId"
            type="text"
            value={studentId}
            onChange={(e) => setStudentId(e.target.value)}
            required
            className="w-full rounded-md border border-(--app-border) bg-(--app-surface) px-3 py-2 text-sm text-(--app-white) placeholder:text-(--app-muted-foreground)"
            placeholder="STU-2024-001"
          />
        </div>
      )}
      <div>
        <label htmlFor="student-fullName" className="mb-1 block text-xs text-(--app-muted-foreground)">الاسم الكامل *</label>
        <input
          id="student-fullName"
          type="text"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          required
          className="w-full rounded-md border border-(--app-border) bg-(--app-surface) px-3 py-2 text-sm text-(--app-white) placeholder:text-(--app-muted-foreground)"
          placeholder="أحمد محمد علي"
        />
      </div>
      <DateField
        id="student-enrollDate"
        label="تاريخ التسجيل"
        value={enrollDate}
        onChange={(v) => setEnrollDate(v)}
        required
      />
      <div>
        <label htmlFor="student-notes" className="mb-1 block text-xs text-(--app-muted-foreground)">ملاحظات</label>
        <textarea
          id="student-notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          className="w-full rounded-md border border-(--app-border) bg-(--app-surface) px-3 py-2 text-sm text-(--app-white) placeholder:text-(--app-muted-foreground)"
          placeholder="ملاحظات إضافية..."
        />
      </div>
    </div>
  );
}
