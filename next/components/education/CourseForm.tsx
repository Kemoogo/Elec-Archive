"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { BookOpen } from "lucide-react";
import { ModalActions } from "@/components/ui/modal-actions";
import { ModalShell } from "@/components/ui/modal-shell";
import { DateField } from "@/components/ui/date-field";
import { FormField, FormInput, FormSelect, FormTextarea } from "@/components/ui/form-fields";
import { useToast } from "@/components/ui/toast";
import { extractApiError } from "@/lib/utils";

interface CourseFormProps {
  mode: "create" | "edit";
  initialData?: {
    _id?: string;
    title: string;
    description?: string;
    startDate: string;
    endDate: string;
    status?: string;
    participantModel?: string;
  };
  onSuccess?: () => void;
}

export function CourseForm({ mode, initialData, onSuccess }: CourseFormProps) {
  const router = useRouter();
  const { showToast } = useToast();
  const [isPending, startTransition] = useTransition();
  const [isOpen, setIsOpen] = useState(mode === "edit");
  const [error, setError] = useState("");
  const formId = mode === "create" ? "create-course-form" : "edit-course-form";

  const [title, setTitle] = useState(initialData?.title ?? "");
  const [description, setDescription] = useState(initialData?.description ?? "");
  const [startDate, setStartDate] = useState(
    initialData?.startDate ? new Date(initialData.startDate).toISOString().split("T")[0] : "",
  );
  const [endDate, setEndDate] = useState(
    initialData?.endDate ? new Date(initialData.endDate).toISOString().split("T")[0] : "",
  );
  const [participantModel, setParticipantModel] = useState(initialData?.participantModel ?? "Officer");
  const [status, setStatus] = useState(initialData?.status ?? "upcoming");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    const body: Record<string, string> = { title };
    if (description) body.description = description;
    body.startDate = startDate;
    body.endDate = endDate;

    if (mode === "create") {
      body.participantModel = participantModel;
    } else {
      body.status = status;
    }

    startTransition(async () => {
      try {
        const url = mode === "create" ? "/api/education" : `/api/education/${initialData?._id}`;
        const method = mode === "create" ? "POST" : "PATCH";
        const res = await fetch(url, {
          method,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        const data = await res.json();
        if (!res.ok) {
        const errorMsg = extractApiError(data, "حدث خطأ");
          setError(errorMsg);
          return;
        }
        setIsOpen(false);
        if (mode === "create") {
          showToast("تم إضافة الدورة بنجاح", "success");
          router.push(`/education/${data.data._id}`);
        } else {
          showToast("تم تحديث الدورة بنجاح", "success");
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
         <button onClick={() => setIsOpen(true)} className="btn-primary">
           <>
             <BookOpen className="h-4 w-4" />
             إضافة دورة
           </>
         </button>
        {isOpen && (
          <ModalShell
            title="إضافة دورة جديدة"
            icon={<BookOpen className="w-4 h-4" />}
            panelClassName="max-w-[480px]"
            onClose={() => {
              setIsOpen(false);
              setError("");
            }}
            footer={
              <ModalActions>
                <button type="submit" form={formId} disabled={isPending} className="btn-accent disabled:opacity-50">
                  {isPending ? "جاري الحفظ..." : "إضافة"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsOpen(false);
                    setError("");
                  }}
                  className="rounded-md border border-(--app-border) px-4 py-2 text-sm text-foreground hover:bg-white/10"
                >
                  إلغاء
                </button>
              </ModalActions>
            }
          >
            <form id={formId} onSubmit={handleSubmit} className="space-y-4">
              <FormFields
                title={title} setTitle={setTitle}
                description={description} setDescription={setDescription}
                startDate={startDate} setStartDate={setStartDate}
                endDate={endDate} setEndDate={setEndDate}
                participantModel={participantModel} setParticipantModel={setParticipantModel}
                mode={mode}
              />
              {error && <p className="text-sm text-(--app-error)">{error}</p>}
            </form>
          </ModalShell>
        )}
      </>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4" dir="rtl">
      <FormFields
        title={title} setTitle={setTitle}
        description={description} setDescription={setDescription}
        startDate={startDate} setStartDate={setStartDate}
        endDate={endDate} setEndDate={setEndDate}
        participantModel={participantModel} setParticipantModel={setParticipantModel}
        mode={mode}
        status={status} setStatus={setStatus}
      />
      {error && <p className="text-sm text-(--app-error)">{error}</p>}
      <button type="submit" disabled={isPending} className="btn-accent disabled:opacity-50">
        {isPending ? "جاري الحفظ..." : "حفظ التعديلات"}
      </button>
    </form>
  );
}

function FormFields({
  title, setTitle, description, setDescription,
  startDate, setStartDate, endDate, setEndDate,
  participantModel, setParticipantModel, mode,
  status, setStatus,
}: {
  title: string; setTitle: (v: string) => void;
  description: string; setDescription: (v: string) => void;
  startDate: string; setStartDate: (v: string) => void;
  endDate: string; setEndDate: (v: string) => void;
  participantModel: string; setParticipantModel: (v: string) => void;
  mode: "create" | "edit";
  status?: string; setStatus?: (v: string) => void;
}) {
  return (
    <div className="space-y-3">
      <FormField label="عنوان الدورة" required>
        <FormInput id="course-title" type="text" value={title} onChange={(e) => setTitle(e.target.value)} required placeholder="دورة الأمن السيبراني" />
      </FormField>

      <FormField label="الوصف">
        <FormTextarea id="course-description" value={description} onChange={(e) => setDescription(e.target.value)} rows={3} placeholder="وصف الدورة..." />
      </FormField>

      <div className="grid grid-cols-2 gap-3">
        <DateField
          id="course-startDate"
          label="تاريخ البداية"
          value={startDate}
          onChange={(v) => setStartDate(v)}
          required
        />
        <DateField
          id="course-endDate"
          label="تاريخ الانتهاء"
          value={endDate}
          onChange={(v) => setEndDate(v)}
          required
        />
      </div>

      {mode === "create" && (
        <FormField label="نوع المشاركين" required>
          <FormSelect id="course-participantModel" value={participantModel} onChange={(e) => setParticipantModel(e.target.value)}>
            <option value="Officer">ضباط</option>
            <option value="Student">طلبة</option>
          </FormSelect>
        </FormField>
      )}

      {mode === "edit" && setStatus && (
        <FormField label="الحالة">
          <FormSelect id="course-status" value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="upcoming">قادمة</option>
            <option value="ongoing">جارية</option>
            <option value="completed">منتهية</option>
          </FormSelect>
        </FormField>
      )}
    </div>
  );
}
