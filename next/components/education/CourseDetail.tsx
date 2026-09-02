"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { CourseStatus } from "@/lib/db/models/Course";
import { ModalActions } from "@/components/ui/modal-actions";
import { ModalShell } from "@/components/ui/modal-shell";
import { useToast } from "@/components/ui/toast";
import { extractApiError } from "@/lib/utils";
import { Trash2 } from "lucide-react";

interface CourseDetailProps {
  course: {
    _id: string;
    title: string;
    description?: string;
    startDate: string;
    endDate: string;
    status: CourseStatus;
    participantModel: "Officer" | "Student";
    participants: { _id: string; fullName: string; militaryId?: string; studentId?: string }[];
    documents: { name: string; fileUrl: string }[];
    createdAt: string;
  };
  canEdit: boolean;
}

const statusLabels: Record<string, string> = {
  upcoming: "قادمة",
  ongoing: "جارية",
  completed: "منتهية",
};

const statusColors: Record<string, string> = {
  upcoming: "bg-(--app-info)/20 text-(--app-info) border-(--app-info)/30",
  ongoing: "bg-(--app-success)/20 text-(--app-success) border-(--app-success)/30",
  completed: "bg-(--app-border) text-(--app-muted-foreground) border-(--app-border)",
};

export function CourseDetail({ course, canEdit }: CourseDetailProps) {
  const router = useRouter();
  const { showToast } = useToast();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  const [removingParticipant, setRemovingParticipant] = useState<string | null>(null);

  async function handleDelete() {
    setDeleteError("");
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/education/${course._id}`, { method: "DELETE" });
      const data = await res.json();
      if (res.ok) {
        showToast("تم حذف الدورة بنجاح", "success");
        router.push("/education");
        router.refresh();
      } else {
        const errMsg = extractApiError(data, "فشل الحذف");
        setDeleteError(errMsg);
        showToast(errMsg, "error");
      }
    } finally {
      if (!deleteError) {
        setShowDeleteConfirm(false);
      }
      setIsDeleting(false);
    }
  }

  async function handleRemoveParticipant(participantId: string) {
    setRemovingParticipant(participantId);
    try {
      const res = await fetch(`/api/education/${course._id}/participants`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ participantId }),
      });
      if (res.ok) {
        showToast("تم إزالة المشارك بنجاح", "success");
        router.refresh();
      } else {
        showToast("فشل في إزالة المشارك", "error");
      }
    } finally {
      setRemovingParticipant(null);
    }
  }

  return (
    <div className="space-y-6" dir="rtl">
      <nav className="flex items-center gap-2 text-xs text-(--app-muted-foreground)">
        <Link href="/education" className="hover:text-foreground">التعليم</Link>
        <span>/</span>
        <span className="text-foreground">{course.title}</span>
      </nav>

      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-(--app-foreground)">{course.title}</h1>
          <span
            className={`mt-2 inline-block rounded-full border px-3 py-1 text-xs ${
              statusColors[course.status] ?? statusColors.upcoming
            }`}
          >
            {statusLabels[course.status] ?? course.status}
          </span>
        </div>
        {canEdit && (
          <div className="flex gap-2">
            {course.participants.length === 0 && (
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="rounded-md border border-(--app-error)/30 bg-(--app-error)/10 px-4 py-2 text-sm text-(--app-error) hover:bg-(--app-error)/20"
              >
                حذف الدورة
              </button>
            )}
          </div>
        )}
      </div>

      <div className="rounded-lg border border-(--app-border) p-4">
        <h2 className="mb-3 text-sm font-medium text-(--app-muted-foreground)">معلومات الدورة</h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <span className="text-xs text-(--app-muted-foreground)">تاريخ البداية</span>
            <p className="text-sm text-(--app-foreground)">{new Date(course.startDate).toLocaleDateString("ar-EG")}</p>
          </div>
          <div>
            <span className="text-xs text-(--app-muted-foreground)">تاريخ الانتهاء</span>
            <p className="text-sm text-(--app-foreground)">{new Date(course.endDate).toLocaleDateString("ar-EG")}</p>
          </div>
          <div>
            <span className="text-xs text-(--app-muted-foreground)">نوع المشاركين</span>
            <p className="text-sm text-(--app-foreground)">{course.participantModel === "Officer" ? "ضباط" : "طلبة"}</p>
          </div>
          <div>
            <span className="text-xs text-(--app-muted-foreground)">عدد المشاركين</span>
            <p className="text-sm text-(--app-foreground)">{course.participants.length}</p>
          </div>
          {course.description && (
            <div className="col-span-2">
              <span className="text-xs text-(--app-muted-foreground)">الوصف</span>
              <p className="text-sm text-(--app-foreground)">{course.description}</p>
            </div>
          )}
        </div>
      </div>

      <div className="rounded-lg border border-(--app-border) p-4">
        <h2 className="mb-3 text-sm font-medium text-(--app-muted-foreground)">المشاركون</h2>
        {course.participants.length === 0 ? (
          <p className="text-sm text-(--app-muted-foreground)">لا يوجد مشاركون</p>
        ) : (
          <ul className="space-y-2">
            {course.participants.map((p) => (
              <li
                key={p._id}
                className="flex items-center justify-between rounded-md border border-(--app-border) p-3"
              >
                <div>
                  <p className="text-sm text-(--app-foreground)">{p.fullName}</p>
                  <p className="text-xs text-(--app-muted-foreground)">
                    {p.militaryId ?? p.studentId}
                  </p>
                </div>
                {canEdit && (
                  <button
                    onClick={() => handleRemoveParticipant(p._id)}
                    disabled={removingParticipant === p._id}
                    className="rounded-md border border-(--app-error)/30 px-3 py-1 text-xs text-(--app-error) hover:bg-(--app-error)/10 disabled:opacity-50"
                  >
                    {removingParticipant === p._id ? "جاري..." : "إزالة"}
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="rounded-lg border border-(--app-border) p-4">
        <h2 className="mb-3 text-sm font-medium text-(--app-muted-foreground)">المستندات</h2>
        {course.documents.length === 0 ? (
          <p className="text-sm text-(--app-muted-foreground)">لا توجد مستندات</p>
        ) : (
          <ul className="space-y-2">
            {course.documents.map((doc) => (
              <li
                key={doc.fileUrl}
                className="flex items-center justify-between rounded-md border border-(--app-border) p-3"
              >
                <p className="text-sm text-(--app-foreground)">{doc.name}</p>
                <a
                  href={doc.fileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-md bg-(--app-accent) px-3 py-1 text-xs text-(--app-accent-foreground) font-medium hover:bg-(--app-accent)/90"
                >
                  تحميل
                </a>
              </li>
            ))}
          </ul>
        )}
      </div>

      {showDeleteConfirm && (
        <ModalShell
          title="تأكيد الحذف"
          icon={<Trash2 className="w-4 h-4" />}
          titleVariant="danger"
          panelClassName="max-w-96"
          onClose={() => {
            setShowDeleteConfirm(false);
            setDeleteError("");
          }}
          footer={
            <ModalActions>
              <button type="button" onClick={handleDelete} disabled={isDeleting} className="btn-destructive disabled:opacity-50">
                {isDeleting ? "جاري الحذف..." : "تأكيد الحذف"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowDeleteConfirm(false);
                  setDeleteError("");
                }}
                className="rounded-md border border-(--app-border) px-4 py-2 text-sm text-foreground hover:bg-white/10"
              >
                إلغاء
              </button>
            </ModalActions>
          }
        >
            <p className="mt-2 text-sm text-(--app-muted-foreground)">
              هل أنت متأكد من حذف دورة &quot;{course.title}&quot;؟ سيتم حذف جميع المستندات المرفقة.
            </p>
            {deleteError && (
              <p className="mt-2 text-sm text-(--app-error)">{deleteError}</p>
            )}
        </ModalShell>
      )}
    </div>
  );
}
