"use client";

import { useState } from "react";
import { FileText, Upload, Trash2, ExternalLink, AlertCircle, FileLock2 } from "lucide-react";

interface OfficerDoc {
  id: string;
  originalName: string;
  storedPath: string;
  mimeType: string;
  sizeBytes: number;
  uploadedAt: string;
}

interface OfficerDocumentsProps {
  officerId: string;
  documents: OfficerDoc[];
  canEdit: boolean;
}

export function OfficerDocuments({ officerId, documents, canEdit }: OfficerDocumentsProps) {
  const [docs, setDocs] = useState(documents);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setError("");

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch(`/api/officers/${officerId}/documents`, {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setError(data.error || "فشل في رفع المستند");
        return;
      }

      setDocs((prev) => [
        ...prev,
        {
          id: data.data.document.id,
          originalName: data.data.document.originalName,
          storedPath: "",
          mimeType: "application/pdf",
          sizeBytes: 0,
          uploadedAt: data.data.document.uploadedAt,
        },
      ]);

      window.location.reload();
    } catch {
      setError("حدث خطأ في الاتصال");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const handleDelete = async (documentId: string) => {
    if (!confirm("هل أنت متأكد من حذف هذا المستند؟")) return;

    try {
      const res = await fetch(`/api/officers/${officerId}/documents`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ documentId }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setError(data.error || "فشل في حذف المستند");
        return;
      }

      setDocs((prev) => prev.filter((d) => d.id !== documentId));
    } catch {
      setError("حدث خطأ في الاتصال");
    }
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} بايت`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} ك.ب`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} م.ب`;
  };

  return (
    <div className="bg-(--app-surface) border border-(--app-border) rounded-xl p-6">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-(--app-surface-container) border border-(--app-border) rounded-lg">
            <FileLock2 className="h-5 w-5 text-(--color-primary)" />
          </div>
          <h2 className="text-lg font-semibold text-(--color-primary)">الوثائق الرقمية</h2>
        </div>
        
        {canEdit && (
          <label className="cursor-pointer flex items-center gap-2 btn-primary px-4 py-2 rounded-lg font-bold text-sm">
            {uploading ? (
               <span className="animate-pulse">جاري الرفع...</span>
            ) : (
               <>
                 <Upload className="h-4 w-4" />
                 رفع وثيقة PDF
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

      {docs.length === 0 ? (
        <div className="text-center py-8 bg-(--app-surface-container) rounded-lg border border-dashed border-(--app-border)">
          <FileText className="h-12 w-12 text-(--app-muted-foreground)/20 mx-auto mb-4" />
          <p className="text-(--app-muted-foreground) font-bold">لا توجد وثائق مؤرشفة لهذا الضابط</p>
        </div>
      ) : (
        <div className="space-y-3">
          {docs.map((doc) => (
            <div
              key={doc.id}
              className="group flex items-center justify-between rounded-lg bg-(--app-surface-container) border border-(--app-border) p-4 hover:bg-(--app-surface-container)"
            >
              <div className="flex items-center gap-4">
                 <div className="p-2.5 bg-(--app-surface-container) rounded-lg border border-(--app-border) text-(--app-muted-foreground)">
                   <FileText className="h-5 w-5" />
                 </div>
                 <div className="space-y-0.5">
                    <p className="text-sm font-bold text-(--color-primary) line-clamp-1">{doc.originalName}</p>
                    <p className="text-xs text-(--app-muted-foreground) font-mono">
                      {doc.sizeBytes > 0 && `${formatSize(doc.sizeBytes)} ― `}
                      {new Date(doc.uploadedAt).toLocaleDateString("ar-EG")}
                    </p>
                 </div>
              </div>
              
              <div className="flex items-center gap-2">
                {doc.storedPath && (
                  <a
                    href={doc.storedPath}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 bg-(--app-surface-container) rounded-lg border border-(--app-border) text-(--color-primary) hover:bg-(--color-primary) hover:text-white transition-all"
                    title="عرض المستند"
                  >
                    <ExternalLink className="h-4 w-4" />
                  </a>
                )}
                {canEdit && (
                  <button
                    onClick={() => handleDelete(doc.id)}
                    className="p-2 bg-(--app-surface-container) rounded-lg border border-(--app-border) text-(--app-muted-foreground) hover:bg-(--app-error) hover:text-white transition-all"
                    title="حذف المستند"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
