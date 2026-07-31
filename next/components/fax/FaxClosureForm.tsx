"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/toast";
import { extractApiError } from "@/lib/utils";

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
        const errorMsg = extractApiError(data, "حدث خطأ أثناء إغلاق الفاكس");
        showToast(errorMsg, "error");
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
      <h2 className="mb-4 text-lg font-semibold text-(--app-foreground)">إغلاق الفاكس</h2>

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
            className="mt-1 block w-full rounded-md border border-(--app-border) bg-(--app-surface) px-3 py-2 text-(--app-foreground) placeholder-(--app-muted-foreground) focus:border-(--app-info) focus:outline-none"
            placeholder="أضف ملاحظة عند الإغلاق..."
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="btn-destructive-sm w-full"
        >
          {loading ? "جاري الإغلاق..." : "إغلاق الفاكس"}
        </button>
      </form>
    </div>
  );
}
