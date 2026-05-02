"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/toast";
import { DateField } from "@/components/ui/date-field";

const ALLOWED_TYPES = ["application/pdf", "image/jpeg", "image/png"];
const MAX_SIZE = 10 * 1024 * 1024;

export function FaxUploadForm() {
  const router = useRouter();
  const { showToast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);

  const [loading, setLoading] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [formData, setFormData] = useState({
    faxNumber: "",
    date: "",
    fromEntity: "",
    toEntity: "",
    subject: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  function validateFile(f: File): string | null {
    if (!ALLOWED_TYPES.includes(f.type)) {
      return "صيغة الملف غير مدعومة. الصيغ المدعومة: PDF، JPEG، PNG فقط";
    }
    if (f.size > MAX_SIZE) {
      return `حجم الملف يتجاوز الحد الأقصى (${MAX_SIZE / 1024 / 1024} ميجابايت)`;
    }
    return null;
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = e.target.files?.[0];
    if (!selected) return;

    const error = validateFile(selected);
    if (error) {
      showToast(error, "error");
      setFile(null);
      if (fileRef.current) fileRef.current.value = "";
      return;
    }
    setFile(selected);
    setErrors((prev) => ({ ...prev, file: "" }));
  }

  function validateForm(): boolean {
    const newErrors: Record<string, string> = {};

    if (!formData.faxNumber.trim()) newErrors.faxNumber = "رقم الفاكس مطلوب";
    if (!formData.date) newErrors.date = "التاريخ مطلوب";
    if (!formData.fromEntity.trim()) newErrors.fromEntity = "الجهة المرسِلة مطلوبة";
    if (!formData.toEntity.trim()) newErrors.toEntity = "الجهة المستقبِلة مطلوبة";
    if (!formData.subject.trim()) newErrors.subject = "الموضوع مطلوب";
    if (!file) newErrors.file = "الملف مطلوب";

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!validateForm()) {
      showToast("يرجى تصحيح الأخطاء الم highlighted", "error");
      return;
    }

    setLoading(true);

    try {
      const data = new FormData();
      data.append("file", file!);
      data.append("faxNumber", formData.faxNumber);
      data.append("date", formData.date);
      data.append("fromEntity", formData.fromEntity);
      data.append("toEntity", formData.toEntity);
      data.append("subject", formData.subject);

      const res = await fetch("/api/fax", {
        method: "POST",
        body: data,
      });

      const result = await res.json();

      if (!res.ok) {
        showToast(result.error ?? "حدث خطأ أثناء رفع الفاكس", "error");
        return;
      }

      showToast("تم رفع الفاكس بنجاح", "success");
      router.push(`/fax/${result.data._id}`);
      router.refresh();
    } catch {
      showToast("حدث خطأ في الاتصال بالخادم", "error");
    } finally {
      setLoading(false);
    }
  }

  const inputClass = (field: string) =>
    `mt-1 block w-full rounded-md border bg-(--app-surface) px-3 py-2 text-(--app-white) placeholder-(--app-muted-foreground) focus:outline-none  ${
      errors[field]
        ? "border-(--app-error) focus:border-(--app-error) focus:ring-(--app-error)"
        : "border-(--app-border) focus:border-(--app-info) focus:ring-(--app-info)"
    }`;

  return (
    <form onSubmit={handleSubmit} className="space-y-6 rounded-lg bg-(--app-surface) p-8" dir="rtl">
      <div>
        <label htmlFor="faxNumber" className="block text-sm font-medium text-foreground">
          رقم الفاكس
        </label>
        <input
          id="faxNumber"
          type="text"
          value={formData.faxNumber}
          onChange={(e) => {
            setFormData((prev) => ({ ...prev, faxNumber: e.target.value }));
            setErrors((prev) => ({ ...prev, faxNumber: "" }));
          }}
          className={inputClass("faxNumber")}
          placeholder="أدخل رقم الفاكس"
        />
        {errors.faxNumber && (
          <p className="mt-1 text-sm text-(--app-error)">{errors.faxNumber}</p>
        )}
      </div>

      <DateField
        id="date"
        label="التاريخ"
        value={formData.date}
        onChange={(v) => {
          setFormData((prev) => ({ ...prev, date: v }));
          setErrors((prev) => ({ ...prev, date: "" }));
        }}
        required
      />
      {errors.date && (
        <p className="mt-1 text-sm text-(--app-error)">{errors.date}</p>
      )}

      <div>
        <label htmlFor="fromEntity" className="block text-sm font-medium text-foreground">
          الجهة المرسِلة
        </label>
        <input
          id="fromEntity"
          type="text"
          value={formData.fromEntity}
          onChange={(e) => {
            setFormData((prev) => ({ ...prev, fromEntity: e.target.value }));
            setErrors((prev) => ({ ...prev, fromEntity: "" }));
          }}
          className={inputClass("fromEntity")}
          placeholder="أدخل الجهة المرسِلة"
        />
        {errors.fromEntity && (
          <p className="mt-1 text-sm text-(--app-error)">{errors.fromEntity}</p>
        )}
      </div>

      <div>
        <label htmlFor="toEntity" className="block text-sm font-medium text-foreground">
          الجهة المستقبِلة
        </label>
        <input
          id="toEntity"
          type="text"
          value={formData.toEntity}
          onChange={(e) => {
            setFormData((prev) => ({ ...prev, toEntity: e.target.value }));
            setErrors((prev) => ({ ...prev, toEntity: "" }));
          }}
          className={inputClass("toEntity")}
          placeholder="أدخل الجهة المستقبِلة"
        />
        {errors.toEntity && (
          <p className="mt-1 text-sm text-(--app-error)">{errors.toEntity}</p>
        )}
      </div>

      <div>
        <label htmlFor="subject" className="block text-sm font-medium text-foreground">
          الموضوع
        </label>
        <input
          id="subject"
          type="text"
          value={formData.subject}
          onChange={(e) => {
            setFormData((prev) => ({ ...prev, subject: e.target.value }));
            setErrors((prev) => ({ ...prev, subject: "" }));
          }}
          className={inputClass("subject")}
          placeholder="أدخل موضوع الفاكس"
        />
        {errors.subject && (
          <p className="mt-1 text-sm text-(--app-error)">{errors.subject}</p>
        )}
      </div>

      <div>
        <label htmlFor="file" className="block text-sm font-medium text-foreground">
          ملف الفاكس (PDF، JPEG، PNG — حد أقصى 10 ميجابايت)
        </label>
        <input
          id="file"
          ref={fileRef}
          type="file"
          accept=".pdf,.jpg,.jpeg,.png"
          onChange={handleFileChange}
          className={`mt-1 block w-full text-foreground file:mr-4 file:rounded-md file:border-0 file:bg-(--app-accent) file:text-(--app-accent-foreground) file:hover:bg-(--app-accent)/90 file:font-medium ${
            errors.file ? "border border-(--app-error) rounded-md" : ""
          }`}
        />
        {errors.file && (
          <p className="mt-1 text-sm text-(--app-error)">{errors.file}</p>
        )}
        {file && (
          <p className="mt-1 text-sm text-(--app-success)">
            تم اختيار: {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)
          </p>
        )}
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-md bg-(--app-accent) px-4 py-3 text-(--app-accent-foreground) hover:bg-(--app-accent)/90 font-medium focus:outline-none  focus:ring-(--app-info) focus:ring-offset-2 disabled:opacity-50"
      >
        {loading ? "جاري الرفع..." : "رفع الفاكس"}
      </button>
    </form>
  );
}
