"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/toast";

interface FaxClosureFormProps {
  faxId: string;
  canClose: boolean;
}

export function FaxClosureForm({ faxId, canClose }: FaxClosureFormProps) {
  const router = useRouter();
  const { showToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [note, setNote] = useState("");

  if (!canClose) {
    return null;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch(`/api/fax/${faxId}/close`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ note }),
      });

      const data = await res.json();

      if (!res.ok) {
        showToast(data.error ?? "حدث خطأ أثناء إغلاق الفاكس", "error");
        return;
      }

      showToast("تم إغلاق الفاكس بنجاح", "success");
      router.refresh();
    } catch {
      showToast("حدث خطأ في الاتصال بالخادم", "error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-lg bg-(--app-surface) p-6" dir="rtl">
      <h2 className="mb-4 text-lg font-semibold text-(--app-white)">إغلاق الفاكس</h2>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="closureNote" className="block text-sm font-medium text-foreground">
            ملاحظة (اختيارية)
          </label>
          <textarea
            id="closureNote"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={2}
            className="mt-1 block w-full rounded-md border border-(--app-border) bg-(--app-surface) px-3 py-2 text-(--app-white) placeholder-(--app-muted-foreground) focus:border-(--app-info) focus:outline-none"
            placeholder="أضف ملاحظة عند الإغلاق..."
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-md bg-(--app-error) px-4 py-2 text-(--app-white) hover:bg-(--app-error)/90 disabled:opacity-50"
        >
          {loading ? "جاري الإغلاق..." : "إغلاق الفاكس"}
        </button>
      </form>
    </div>
  );
}
