"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/toast";
import { extractApiError } from "@/lib/utils";

interface ParticipantPickerProps {
  courseId: string;
  participantModel: "Officer" | "Student";
}

export function ParticipantPicker({ courseId, participantModel }: ParticipantPickerProps) {
  const router = useRouter();
  const { showToast } = useToast();
  const [isPending, startTransition] = useTransition();
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [results, setResults] = useState<{ _id: string; name: string; identifier: string }[]>([]);
  const [error, setError] = useState("");
  const [isSearching, setIsSearching] = useState(false);

  async function handleSearch() {
    const trimmed = search.trim();
    if (trimmed.length < 2) {
      setError("يرجى إدخال حرفين على الأقل للبحث");
      return;
    }
    setIsSearching(true);
    setError("");
    try {
      const endpoint = participantModel === "Officer" ? "/api/officers" : "/api/students";
      const res = await fetch(`${endpoint}?search=${encodeURIComponent(trimmed)}&limit=10`);
      const data = await res.json();
      if (res.ok) {
        const items = Array.isArray(data.data?.items) ? data.data.items : Array.isArray(data.data) ? data.data : [];
        const mapped = items
          .map((item: Record<string, unknown>) => ({
            _id: (typeof item?._id === "string" ? item._id : typeof item?.id === "string" ? item.id : "") as string,
            name: (item.fullName || item.name || "") as string,
            identifier: (typeof item.militaryId === "string" ? item.militaryId : typeof item.studentId === "string" ? item.studentId : "") as string,
          }))
          .filter((item: { _id: string; name: string }) => Boolean(item._id && item.name));
        setResults(mapped);
      }
    } catch {
      setError("فشل البحث");
    } finally {
      setIsSearching(false);
    }
  }

  async function handleAdd(participantId: string) {
    startTransition(async () => {
      try {
        const res = await fetch(`/api/education/${courseId}/participants`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ participantId }),
        });
        const data = await res.json();
        if (res.ok) {
          showToast("تم إضافة المشارك بنجاح", "success");
          setResults([]);
          setSearch("");
          setIsOpen(false);
          router.refresh();
        } else {
          const errMsg = extractApiError(data, "فشل الإضافة");
          setError(errMsg);
          showToast(errMsg, "error");
        }
      } catch {
        setError("حدث خطأ في الاتصال");
        showToast("حدث خطأ في الاتصال بالخادم", "error");
      }
    });
  }

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="rounded-md bg-(--app-accent) px-4 py-2 text-sm text-(--app-accent-foreground) font-medium hover:bg-(--app-accent)/90"
      >
        إضافة مشارك
      </button>
    );
  }

  return (
    <div className="rounded-lg border border-(--app-border) bg-(--app-surface) p-4" dir="rtl">
      <h3 className="mb-3 text-sm font-medium text-(--app-foreground)">
        إضافة {participantModel === "Officer" ? "ضابط" : "طالب"}
      </h3>
      <div className="flex gap-2">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              handleSearch();
            }
          }}
          placeholder="بحث بالاسم (حرفين على الأقل)..."
          className="flex-1 rounded-md border border-(--app-border) bg-(--app-surface) px-3 py-2 text-sm text-(--app-foreground) placeholder:text-(--app-muted-foreground) focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
        />
        <button
          onClick={handleSearch}
          disabled={isSearching}
className="rounded-md bg-(--app-accent) px-4 py-2 text-sm text-(--app-accent-foreground) font-medium hover:bg-(--app-accent)/90 disabled:opacity-50"
          >
            {isSearching ? "جاري..." : "بحث"}
        </button>
      </div>
      {error && <p className="mt-2 text-sm text-(--app-error)">{error}</p>}
      {results.length > 0 && (
        <ul className="mt-3 space-y-2">
          {results.map((r) => (
            <li
              key={r._id}
className="flex items-center justify-between rounded-md border border-(--app-border) p-3"
              >
                <div>
                  <p className="text-sm text-(--app-foreground)">{r.name}</p>
                  <p className="text-xs text-(--app-muted-foreground)">{r.identifier}</p>
              </div>
              <button
                onClick={() => handleAdd(r._id)}
                disabled={isPending}
                className="btn-primary text-xs px-3 py-1 disabled:opacity-50"
              >
                {isPending ? "جاري..." : "إضافة"}
              </button>
            </li>
          ))}
        </ul>
      )}
      <div className="mt-3 flex justify-end">
        <button
          onClick={() => { setIsOpen(false); setResults([]); setSearch(""); setError(""); }}
          className="btn-secondary text-xs"
        >
          إغلاق
        </button>
      </div>
    </div>
  );
}
