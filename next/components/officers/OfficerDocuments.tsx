"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { FileText, Upload, Trash2, AlertCircle, FileLock2, Eye, AlertTriangle } from "lucide-react";
import { PdfViewerModal } from "./PdfViewerModal";
import { ModalShell } from "@/components/ui/modal-shell";
import { ModalActions } from "@/components/ui/modal-actions";
import { extractApiError } from "@/lib/utils";
import { formatDateDisplay } from "@/lib/utils/date-display";

interface OfficerDocumentsProps {
  officerId: string;
  file121Url?: string; // We use the single URL now
  file121UpdatedAt?: string;
  file121IssueDate?: string;
  officerLabel: string;
  canEdit: boolean;
}

export function OfficerDocuments({ officerId, file121Url, file121UpdatedAt, file121IssueDate, officerLabel, canEdit }: OfficerDocumentsProps) {
  const router = useRouter();
  const [currentFile, setCurrentFile] = useState(file121Url);
  const [issueDate, setIssueDate] = useState(file121IssueDate);
  const [updatedAt, setUpdatedAt] = useState(file121UpdatedAt);
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");
  const [isViewerOpen, setIsViewerOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isWarnBeforeSelectModalOpen, setIsWarnBeforeSelectModalOpen] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUpdateBtnClick = () => {
    if (currentFile) {
      setIsWarnBeforeSelectModalOpen(true);
    } else {
      fileInputRef.current?.click();
    }
  };

  const handleProceedToFileSelect = () => {
    setIsWarnBeforeSelectModalOpen(false);
    setTimeout(() => {
      fileInputRef.current?.click();
    }, 100);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    executeUpload(file);
    e.target.value = "";
  };

  const executeUpload = async (file: File) => {
    setUploading(true);
    setError("");

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch(`/api/officers/${officerId}/file121`, {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        const errorMsg = extractApiError(data, "فشل في رفع الملف");
        setError(errorMsg);
        return;
      }

      setCurrentFile(data.data.fileUrl);
      if (data.data.file121IssueDate) setIssueDate(data.data.file121IssueDate);
      if (data.data.file121UpdatedAt) setUpdatedAt(data.data.file121UpdatedAt);
      router.refresh();
    } catch {
      setError("حدث خطأ في الاتصال");
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    setError("");

    try {
      const res = await fetch(`/api/officers/${officerId}/file121`, {
        method: "DELETE",
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        const errorMsg = extractApiError(data, "فشل في حذف الملف");
        setError(errorMsg);
        setDeleting(false);
        setIsDeleteModalOpen(false);
        return;
      }

      setCurrentFile(undefined);
      setIssueDate(undefined);
      setUpdatedAt(undefined);
      setIsDeleteModalOpen(false);
      router.refresh();
    } catch {
      setError("حدث خطأ في الاتصال");
      setDeleting(false);
      setIsDeleteModalOpen(false);
    }
  };

  return (
    <>
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-(--app-surface-container) border border-(--app-border) rounded-lg">
            <FileLock2 className="h-5 w-5 text-(--color-primary)" />
          </div>
          <h2 className="text-lg font-semibold text-(--color-primary)">ملف 121 ش ض</h2>
        </div>

        {canEdit && (
          <div>
            <button
              onClick={handleUpdateBtnClick}
              disabled={uploading}
              className="flex items-center gap-2 btn-primary px-4 py-2 rounded-lg font-bold text-sm"
            >
              {uploading ? (
                <span className="animate-pulse">جاري الرفع...</span>
              ) : (
                <>
                  <Upload className="h-4 w-4" />
                  {currentFile ? "تحديث الملف" : "رفع ملف جديد"}
                </>
              )}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf"
              onChange={handleFileSelect}
              disabled={uploading}
              className="hidden"
            />
          </div>
        )}
      </div>

      {error && (
        <div className="mb-4 rounded-lg bg-(--app-error)/10 border border-(--app-error)/20 p-4 text-(--app-error) flex items-center gap-3">
          <AlertCircle className="h-5 w-5 shrink-0" />
          <p className="text-sm font-bold">{error}</p>
        </div>
      )}

      {!currentFile ? (
        <div className="text-center py-8 bg-(--app-surface-container) rounded-lg border border-dashed border-(--app-border)">
          <FileText className="h-12 w-12 text-(--app-muted-foreground)/20 mx-auto mb-4" />
          <p className="text-(--app-muted-foreground) font-bold">لم يتم رفع ملف 121 ش ض بعد</p>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="group flex items-center justify-between rounded-lg bg-(--app-surface-container) border border-(--app-border) p-4 hover:border-(--color-primary)/30 transition-all">
            <div className="flex items-center gap-4">
              <div className="p-2.5 bg-(--app-surface-container) rounded-lg border border-(--app-border) text-(--color-primary)">
                <FileText className="h-5 w-5" />
              </div>
              <div className="space-y-0.5">
                <p 
                  className="text-sm font-bold text-(--color-primary) cursor-pointer hover:underline transition-all inline-block"
                  onClick={() => setIsViewerOpen(true)}
                >
                  عرض الملف
                </p>
                {issueDate && (
                  <p className="text-xs font-bold text-blue-600 dark:text-blue-400">
                    تاريخ تحرير الملف: <span className="font-mono">{formatDateDisplay(issueDate)}</span>
                  </p>
                )}
                {updatedAt && (
                  <p className="text-xs text-(--app-muted-foreground) text-right">
                    تاريخ الرفع: <span className="font-mono">{formatDateDisplay(updatedAt)}</span>
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsViewerOpen(true)}
                className="p-2 bg-(--app-surface-container) rounded-lg border border-(--app-border) text-(--color-primary) hover:bg-(--color-primary) hover:text-white transition-all shadow-sm"
                title="عرض المستند"
              >
                <Eye className="h-4 w-4" />
              </button>
              {canEdit && (
                <button
                  onClick={() => setIsDeleteModalOpen(true)}
                  className="p-2 bg-(--app-surface-container) rounded-lg border border-(--app-border) text-(--app-muted-foreground) hover:bg-(--app-error) hover:text-white transition-all shadow-sm"
                  title="حذف المستند"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>
        </div>
      )}
      {currentFile && (
        <PdfViewerModal
          isOpen={isViewerOpen}
          onClose={() => setIsViewerOpen(false)}
          fileUrl={currentFile}
          title={`${officerLabel}`}
        />
      )}
      {/* DELETE CONFIRMATION MODAL */}
      {isDeleteModalOpen && (
        <ModalShell
          title="تأكيد حذف الملف"
          icon={<Trash2 className="w-4 h-4 text-(--app-error)" />}
          titleVariant="danger"
          onClose={() => setIsDeleteModalOpen(false)}
          footer={
            <ModalActions
              submitText="نعم، احذف المستند"
              submitVariant="destructive"
              submitLoading={deleting}
              onConfirm={handleDelete}
              cancelText="إلغاء"
              onCancel={() => setIsDeleteModalOpen(false)}
            />
          }
        >
          <div className="p-6">
            <div className="flex items-center gap-3 mb-4 text-(--app-error)">
              <AlertCircle className="h-6 w-6 shrink-0" />
              <h3 className="text-sm font-bold">تنبيه إزالة المستند الرقمي</h3>
            </div>
            <p className="text-sm font-bold text-slate-700 dark:text-slate-200 font-sans leading-relaxed text-right">
              هل أنت متأكد من حذف وثيقة <span className="font-bold text-(--color-primary)">(121 ش ض)</span> الرقمية الخاصة بالضابط؟ سيترتب على هذا الإجراء إزالة المستند الرقمي المخزن نهائياً من الأرشيف.
            </p>
          </div>
        </ModalShell>
      )}

      {/* WARNING MODAL BEFORE FILE SELECTION ON UPDATE */}
      {isWarnBeforeSelectModalOpen && (
        <ModalShell
          title="تنبيه استبدال وتحديث الملف"
          icon={<AlertTriangle className="w-4 h-4" />}
          titleVariant="warning"
          onClose={() => setIsWarnBeforeSelectModalOpen(false)}
          footer={
            <ModalActions
              submitText="المتابعة واختيار الملف الجديد"
              onConfirm={handleProceedToFileSelect}
              cancelText="إلغاء"
              onCancel={() => setIsWarnBeforeSelectModalOpen(false)}
            />
          }
        >
          <div className="p-6">
            <div className="flex items-center gap-3 mb-4 text-(--color-primary)">
              <AlertTriangle className="h-6 w-6 shrink-0" />
              <h3 className="text-sm font-bold">تنبيه قبل اختيار الملف الجديد</h3>
            </div>
            <p className="text-sm font-bold text-slate-700 dark:text-slate-200 mb-2 font-sans leading-relaxed text-right">
              يوجد ملف (121 ش ض) مرفوع حالياً للضابط في الأرشيف.
            </p>
            <p className="text-xs font-semibold text-(--app-muted-foreground) text-right leading-relaxed">
              تحديث المستند سيؤدي إلى <span className="font-bold text-(--color-primary)">حذف واستبدال الملف السابق نهائياً</span> بالملف الجديد الذي ستختاره، وإعادة استخراج تاريخ التحرير والبيانات وتخزين المستند الجديد. هل ترغب في المتابعة؟
            </p>
          </div>
        </ModalShell>
      )}
    </>
  );
}
