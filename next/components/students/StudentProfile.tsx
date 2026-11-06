"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ModalActions } from "@/components/ui/modal-actions";
import { ModalShell } from "@/components/ui/modal-shell";
import { useToast } from "@/components/ui/toast";
import { MonoBadge } from "@/components/ui/mono-badge";
import { AlertTriangle, Calendar } from "lucide-react";
import { formatDateDisplay } from "@/lib/utils/date-display";

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
  active: "bg-(--color-primary)/10 text-(--color-primary) border border-(--color-primary)/20",
  graduated: "bg-(--app-info)/10 text-(--app-info) border border-(--app-info)/20",
  inactive: "bg-(--app-surface-container) text-(--app-muted-foreground) border border-(--app-border)",
  withdrawn: "bg-(--app-surface-container) text-(--app-muted-foreground) border border-(--app-border)",
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-(--app-foreground)">{student.fullName}</h1>
          <p className="text-sm font-mono text-(--app-muted-foreground)">{student.studentId}</p>
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
            <span className="text-xs text-(--app-muted-foreground) block mb-1">تاريخ التسجيل</span>
            <MonoBadge
              value={formatDateDisplay(student.enrollDate)}
              icon={<Calendar className="w-3.5 h-3.5" />}
              size="sm"
            />
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
                  <p className="text-xs font-mono text-(--app-muted-foreground)">
                    {formatDateDisplay(doc.uploadedAt)}
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
          icon={<AlertTriangle className="w-4 h-4" />}
          titleVariant="danger"
          panelClassName="max-w-96"
          onClose={() => setShowDeleteConfirm(false)}
          footer={
            <ModalActions
              submitText={isDeleting ? "جاري الإيقاف..." : "تأكيد الإيقاف"}
              submitVariant="destructive"
              submitLoading={isDeleting}
              onConfirm={handleDeactivate}
              onCancel={() => setShowDeleteConfirm(false)}
            />
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
