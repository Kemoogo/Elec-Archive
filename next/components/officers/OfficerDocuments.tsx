"use client";

import { useState } from "react";
import { FileText, Upload, Trash2, ExternalLink, AlertCircle, FileLock2, Eye } from "lucide-react";
import { PdfViewerModal } from "./PdfViewerModal";

interface OfficerDocumentsProps {
  officerId: string;
  file121Url?: string; // We use the single URL now
  file121UpdatedAt?: string;
  officerLabel: string;
  canEdit: boolean;
}

export function OfficerDocuments({ officerId, file121Url, file121UpdatedAt, officerLabel, canEdit }: OfficerDocumentsProps) {
  const [currentFile, setCurrentFile] = useState(file121Url);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [isViewerOpen, setIsViewerOpen] = useState(false);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

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
        setError(data.error || "فشل في رفع الملف");
        return;
      }

      setCurrentFile(data.data.fileUrl);
      window.location.reload(); // Refresh to update all views
    } catch {
      setError("حدث خطأ في الاتصال");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const handleDelete = async () => {
    if (!confirm("هل أنت متأكد من حذف الملف بالكامل؟")) return;

    try {
      const res = await fetch(`/api/officers/${officerId}/file121`, {
        method: "DELETE",
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setError(data.error || "فشل في حذف الملف");
        return;
      }

      setCurrentFile(undefined);
      window.location.reload();
    } catch {
      setError("حدث خطأ في الاتصال");
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
          <label className="cursor-pointer flex items-center gap-2 btn-primary px-4 py-2 rounded-lg font-bold text-sm">
            {uploading ? (
              <span className="animate-pulse">جاري الرفع...</span>
            ) : (
              <>
                <Upload className="h-4 w-4" />
                {currentFile ? "تحديث" : "رفع ملف"}
              </>
            )}
            <input
              type="file"
              accept=".pdf"
              onChange={handleUpload}
              disabled={uploading}
              className="hidden"
            />
          </label>
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
                <p className="text-xs text-(--app-muted-foreground) font-mono text-right">
                  {file121UpdatedAt ? `تاريخ الرفع: ${new Date(file121UpdatedAt).toLocaleDateString("ar-EG")}` : "سيتم استبدال هذا الملف في حالة رفع ملف جديد"}
                </p>
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
                  onClick={handleDelete}
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
    </>
  );
}
