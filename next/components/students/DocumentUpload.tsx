"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/toast";
import { extractApiError } from "@/lib/utils";

interface DocumentUploadProps {
  studentId: string;
}

export function DocumentUpload({ studentId }: DocumentUploadProps) {
  const router = useRouter();
  const { showToast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [name, setName] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState("");
  const [isOpen, setIsOpen] = useState(false);

  const MAX_SIZE = 10 * 1024 * 1024; // 10MB
  const ALLOWED_EXTENSIONS = [".pdf", ".jpg", ".jpeg", ".png"];

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = e.target.files?.[0];
    if (!selected) return;

    setError("");

    const ext = "." + selected.name.split(".").pop()?.toLowerCase();
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      setError("نوع الملف غير مدعوم. يُسمح بـ PDF و JPEG و PNG فقط");
      return;
    }

    if (selected.size > MAX_SIZE) {
      setError("حجم الملف يتجاوز الحد الأقصى (10 ميجابايت)");
      return;
    }

    setFile(selected);
    if (!name) {
      setName(selected.name.replace(/\.[^/.]+$/, ""));
    }
  }

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault();
    if (!file) {
      setError("يرجى اختيار ملف");
      return;
    }
    if (!name.trim()) {
      setError("يرجى إدخال اسم المستند");
      return;
    }

    setIsUploading(true);
    setError("");

    try {
      const formData = new FormData();
      formData.append("name", name.trim());
      formData.append("file", file);

      const res = await fetch(`/api/students/${studentId}/documents`, {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        const errMsg = extractApiError(data, "فشل في رفع المستند");
        setError(errMsg);
        showToast(errMsg, "error");
        return;
      }

      showToast("تم رفع المستند بنجاح", "success");
      setName("");
      setFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      setIsOpen(false);
      router.refresh();
    } catch {
      setError("حدث خطأ في الاتصال");
      showToast("حدث خطأ في الاتصال بالخادم", "error");
    } finally {
      setIsUploading(false);
    }
  }

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="btn-primary"
      >
        رفع مستند
      </button>
    );
  }

  return (
    <div className="rounded-lg border border-(--app-border) bg-(--app-surface) p-4" dir="rtl">
      <h3 className="mb-3 text-sm font-medium text-(--app-foreground)">رفع مستند جديد</h3>
      <form onSubmit={handleUpload} className="space-y-3">
        <div>
          <label className="mb-1 block text-xs text-(--app-muted-foreground)">اسم المستند *</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className="w-full rounded-md border border-(--app-border) bg-(--app-surface) px-3 py-2 text-sm text-(--app-foreground) placeholder:text-(--app-muted-foreground)"
            placeholder="شهادة التخرج"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs text-(--app-muted-foreground)">
            الملف (PDF, JPEG, PNG — حد أقصى 10MB) *
          </label>
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.jpg,.jpeg,.png"
            onChange={handleFileChange}
            className="w-full rounded-md border border-(--app-border) bg-(--app-surface) px-3 py-2 text-sm text-(--app-foreground) file:mr-4 file:rounded-md file:border-0 file:bg-(--color-primary) file:text-white file:font-medium"
          />
        </div>
        {error && <p className="text-sm text-(--app-error)">{error}</p>}
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={() => {
              setIsOpen(false);
              setError("");
              setName("");
              setFile(null);
            }}
            className="btn-secondary"
          >
            إلغاء
          </button>
          <button
            type="submit"
            disabled={isUploading}
            className="btn-primary disabled:opacity-50"
          >
            {isUploading ? "جاري الرفع..." : "رفع"}
          </button>
        </div>
      </form>
    </div>
  );
}
