"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { BookOpen } from "lucide-react";
import { ModalActions } from "@/components/ui/modal-actions";
import { ModalShell } from "@/components/ui/modal-shell";

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
          setError(data.error ?? "حدث خطأ");
          return;
        }
        setIsOpen(false);
        if (mode === "create") {
          router.push(`/education/${data.data._id}`);
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
         <button onClick={() => setIsOpen(true)} className="btn-primary">
           <>
             <BookOpen className="h-4 w-4" />
             إضافة دورة
           </>
         </button>
        {isOpen && (
          <ModalShell
            title="إضافة دورة جديدة"
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
      <div>
        <label htmlFor="course-title" className="mb-1 block text-xs text-(--app-muted-foreground)">عنوان الدورة *</label>
        <input id="course-title" type="text" value={title} onChange={(e) => setTitle(e.target.value)} required className="w-full rounded-md border border-(--app-border) bg-(--app-surface) px-3 py-2 text-sm text-(--app-white) placeholder:text-(--app-muted-foreground)" placeholder="دورة الأمن السيبراني" />
      </div>
      <div>
        <label htmlFor="course-description" className="mb-1 block text-xs text-(--app-muted-foreground)">الوصف</label>
        <textarea id="course-description" value={description} onChange={(e) => setDescription(e.target.value)} rows={3} className="w-full rounded-md border border-(--app-border) bg-(--app-surface) px-3 py-2 text-sm text-(--app-white) placeholder:text-(--app-muted-foreground)" placeholder="وصف الدورة..." />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor="course-startDate" className="mb-1 block text-xs text-(--app-muted-foreground)">تاريخ البداية *</label>
          <input id="course-startDate" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} required className="w-full rounded-md border border-(--app-border) bg-(--app-surface) px-3 py-2 text-sm text-(--app-white)" />
        </div>
        <div>
          <label htmlFor="course-endDate" className="mb-1 block text-xs text-(--app-muted-foreground)">تاريخ الانتهاء *</label>
          <input id="course-endDate" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} required className="w-full rounded-md border border-(--app-border) bg-(--app-surface) px-3 py-2 text-sm text-(--app-white)" />
        </div>
      </div>
      {mode === "create" && (
        <div>
          <label htmlFor="course-participantModel" className="mb-1 block text-xs text-(--app-muted-foreground)">نوع المشاركين *</label>
          <select id="course-participantModel" value={participantModel} onChange={(e) => setParticipantModel(e.target.value)} className="w-full rounded-md border border-(--app-border) bg-(--app-surface) px-3 py-2 text-sm text-(--app-white)">
            <option value="Officer">ضباط</option>
            <option value="Student">طلبة</option>
          </select>
        </div>
      )}
      {mode === "edit" && setStatus && (
        <div>
          <label htmlFor="course-status" className="mb-1 block text-xs text-(--app-muted-foreground)">الحالة</label>
          <select id="course-status" value={status} onChange={(e) => setStatus(e.target.value)} className="w-full rounded-md border border-(--app-border) bg-(--app-surface) px-3 py-2 text-sm text-(--app-white)">
            <option value="upcoming">قادمة</option>
            <option value="ongoing">جارية</option>
            <option value="completed">منتهية</option>
          </select>
        </div>
      )}
    </div>
  );
}
