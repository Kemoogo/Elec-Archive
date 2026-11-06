"use client";

import { useState } from "react";
import { useToast } from "@/components/ui/toast";
import { extractApiError } from "@/lib/utils";
import { formatDateDisplay } from "@/lib/utils/date-display";

interface FaxLinkSearchProps {
  faxId: string;
  onLinked: () => void;
}

export function FaxLinkSearch({ faxId, onLinked }: FaxLinkSearchProps) {
  const { showToast } = useToast();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<
    Array<{ _id: string; faxNumber: string; date: string; subject: string }>
  >([]);
  const [loading, setLoading] = useState(false);
  const [linking, setLinking] = useState(false);

  async function handleSearch() {
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      showToast("يرجى إدخال حرفين على الأقل للبحث", "info");
      return;
    }

    setLoading(true);
    try {
      const params = new URLSearchParams({
        q: trimmed,
        exclude: faxId,
        limit: "10",
      });

      const res = await fetch(`/api/fax/search?${params.toString()}`);
      const data = await res.json();

      if (res.ok) {
        setResults(data.data);
      }
    } catch {
      showToast("حدث خطأ أثناء البحث", "error");
    } finally {
      setLoading(false);
    }
  }

  async function handleLink(relatedFaxId: string) {
    setLinking(true);
    try {
      const res = await fetch(`/api/fax/${faxId}/link`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ relatedFaxId }),
      });

      const data = await res.json();

      if (!res.ok) {
        const errorMsg = extractApiError(data, "حدث خطأ أثناء الربط");
        showToast(errorMsg, "error");
        return;
      }

      showToast("تم ربط الفاكس بنجاح", "success");
      setQuery("");
      setResults([]);
      onLinked();
    } catch {
      showToast("حدث خطأ في الاتصال بالخادم", "error");
    } finally {
      setLinking(false);
    }
  }

  return (
    <div className="rounded-lg bg-(--app-surface) p-6" dir="rtl">
      <h2 className="mb-4 text-lg font-semibold text-(--app-foreground)">ربط فاكس</h2>

      <div className="flex gap-2">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSearch()}
          placeholder="ابحث برقم الفاكس أو الموضوع..."
          className="flex-1 rounded-md border border-(--app-border) bg-(--app-surface) px-3 py-2 text-(--app-foreground) placeholder-(--app-muted-foreground) focus:border-(--app-info) focus:outline-none"
        />
        <button
          onClick={handleSearch}
          disabled={loading}
          className="rounded-md bg-(--app-accent) px-4 py-2 text-(--app-accent-foreground) hover:bg-(--app-accent)/90 font-medium disabled:opacity-50"
        >
          {loading ? "جاري البحث..." : "بحث"}
        </button>
      </div>

      {results.length > 0 && (
        <div className="mt-4 space-y-2">
          {results.map((fax) => (
            <div
              key={fax._id}
              className="flex items-center justify-between rounded-md border border-(--app-border) p-3"
            >
              <div>
                <span className="font-medium text-(--app-foreground)">{fax.faxNumber}</span>
                <span className="mr-3 text-sm text-(--app-muted-foreground)">
                  {formatDateDisplay(fax.date)}
                </span>
                <p className="text-sm text-foreground">{fax.subject}</p>
              </div>
              <button
                onClick={() => handleLink(fax._id)}
                disabled={linking}
                className="btn-primary text-xs px-3 py-1.5 disabled:opacity-50">
                ربط
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
