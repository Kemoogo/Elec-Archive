"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ModalActions } from "@/components/ui/modal-actions";
import { ModalShell } from "@/components/ui/modal-shell";
import { useToast } from "@/components/ui/toast";

interface SerializedStudent {
  _id: string;
  studentId: string;
  fullName: string;
  enrollDate: string;
  status: string;
  documents: { name: string; fileUrl: string; uploadedAt: string }[];
  notes?: string;
}

interface StudentProfileProps {
  student: SerializedStudent;
  canEdit: boolean;
}

const statusLabels: Record<string, string> = {
  active: "نشط",
  graduated: "متخرج",
  inactive: "موقف",
  withdrawn: "منسحب",
};

const statusColors: Record<string, string> = {
  active: "bg-(--app-success)/20 text-(--app-success) border-(--app-success)/30",
  graduated: "bg-(--app-info)/20 text-(--app-info) border-(--app-info)/30",
  inactive: "bg-(--app-border) text-(--app-muted-foreground) border-(--app-border)",
  withdrawn: "bg-(--app-error)/20 text-(--app-error) border-(--app-error)/30",
};

export function StudentProfile({ student, canEdit }: StudentProfileProps) {
  const router = useRouter();
  const { showToast } = useToast();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  async function handleDeactivate() {
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/students/${student._id}`, { method: "DELETE" });
      if (res.ok) {
        showToast("تم إيقاف الطالب بنجاح", "success");
        router.push("/students");
        router.refresh();
      } else {
        showToast("فشل في إيقاف الطالب", "error");
      }
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  }

  return (
    <div className="space-y-6" dir="rtl">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-xs text-(--app-muted-foreground)">
        <Link href="/students" className="hover:text-foreground">
          شئون الطلبة
        </Link>
        <span>/</span>
        <span className="text-foreground">{student.fullName}</span>
      </nav>

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-(--app-foreground)">{student.fullName}</h1>
          <p className="mt-1 text-sm text-(--app-muted-foreground)">رقم الطالب: {student.studentId}</p>
          <span
            className={`mt-2 inline-block rounded-full border px-3 py-1 text-xs ${
              statusColors[student.status] ?? statusColors.active
            }`}
          >
            {statusLabels[student.status] ?? student.status}
          </span>
        </div>
        {canEdit && student.status === "active" && (
          <div className="flex gap-2">
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="rounded-md border border-(--app-error)/30 bg-(--app-error)/10 px-4 py-2 text-sm text-(--app-error) hover:bg-(--app-error)/20"
            >
              إيقاف
            </button>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="rounded-lg border border-(--app-border) p-4">
        <h2 className="mb-3 text-sm font-medium text-(--app-muted-foreground)">البيانات الشخصية</h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <span className="text-xs text-(--app-muted-foreground)">تاريخ التسجيل</span>
            <p className="text-sm text-(--app-foreground)">
              {new Date(student.enrollDate).toLocaleDateString("ar-EG")}
            </p>
          </div>
          <div>
            <span className="text-xs text-(--app-muted-foreground)">الحالة</span>
            <p className="text-sm text-(--app-foreground)">
              {statusLabels[student.status] ?? student.status}
            </p>
          </div>
          {student.notes && (
            <div className="col-span-2">
              <span className="text-xs text-(--app-muted-foreground)">ملاحظات</span>
              <p className="text-sm text-(--app-foreground)">{student.notes}</p>
            </div>
          )}
        </div>
      </div>

      {/* Documents */}
      <div className="rounded-lg border border-(--app-border) p-4">
        <h2 className="mb-3 text-sm font-medium text-(--app-muted-foreground)">المستندات</h2>
        {student.documents.length === 0 ? (
          <p className="text-sm text-(--app-muted-foreground)">لا توجد مستندات</p>
        ) : (
          <ul className="space-y-2">
            {student.documents.map((doc) => (
              <li
                key={doc.fileUrl}
                className="flex items-center justify-between rounded-md border border-(--app-border) p-3"
              >
                <div>
                  <p className="text-sm text-(--app-foreground)">{doc.name}</p>
                  <p className="text-xs text-(--app-muted-foreground)">
                    {new Date(doc.uploadedAt).toLocaleDateString("ar-EG")}
                  </p>
                </div>
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

      {/* Deactivate confirmation */}
      {showDeleteConfirm && (
        <ModalShell
          title="تأكيد الإيقاف"
          panelClassName="max-w-96"
          onClose={() => setShowDeleteConfirm(false)}
          footer={
            <ModalActions>
              <button
                type="button"
                onClick={handleDeactivate}
                disabled={isDeleting}
                className="btn-destructive-sm"
              >
                {isDeleting ? "جاري الإيقاف..." : "تأكيد الإيقاف"}
              </button>
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(false)}
                className="rounded-md border border-(--app-border) px-4 py-2 text-sm text-foreground hover:bg-white/10"
              >
                إلغاء
              </button>
            </ModalActions>
          }
        >
            <p className="mt-2 text-sm text-(--app-muted-foreground)">
              هل أنت متأكد من إيقاف الطالب {student.fullName}؟ سيتم حذف جميع المستندات المرفقة.
            </p>
        </ModalShell>
      )}
    </div>
  );
}
