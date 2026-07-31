"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useState } from "react";
import { DateField } from "@/components/ui/date-field";

export function FaxFilters() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [search, setSearch] = useState(searchParams.get("search") ?? "");
  const [status, setStatus] = useState(searchParams.get("status") ?? "");
  const [dateFrom, setDateFrom] = useState(searchParams.get("dateFrom") ?? "");
  const [dateTo, setDateTo] = useState(searchParams.get("dateTo") ?? "");

  const applyFilters = useCallback(() => {
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (status) params.set("status", status);
    if (dateFrom) params.set("dateFrom", dateFrom);
    if (dateTo) params.set("dateTo", dateTo);
    params.set("page", "1");
    router.push(`/fax?${params.toString()}`);
  }, [search, status, dateFrom, dateTo, router]);

  const clearFilters = useCallback(() => {
    setSearch("");
    setStatus("");
    setDateFrom("");
    setDateTo("");
    router.push("/fax");
  }, [router]);

  return (
    <div className="flex flex-wrap gap-4 rounded-lg bg-(--app-surface) p-4" dir="rtl">
      <input
        type="text"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="بحث برقم الفاكس أو الموضوع أو الجهة..."
        className="min-w-[250px] flex-1 rounded-md border border-(--app-border) bg-(--app-surface) px-3 py-2 text-(--app-foreground) placeholder-(--app-muted-foreground) focus:border-(--app-info) focus:outline-none"
      />

      <select
        value={status}
        onChange={(e) => setStatus(e.target.value)}
        className="btn-filter-sm max-w-[180px]"
      >
        <option value="">جميع الحالات</option>
        <option value="pending">معلق</option>
        <option value="forwarded">موجّه</option>
        <option value="closed">مغلق</option>
      </select>

      <div className="flex gap-2 items-center">
        <DateField
          id="dateFrom"
          label="من"
          value={dateFrom}
          onChange={(v) => setDateFrom(v)}
          className="min-w-[150px]"
        />
        <DateField
          id="dateTo"
          label="إلى"
          value={dateTo}
          onChange={(v) => setDateTo(v)}
          className="min-w-[150px]"
        />
      </div>

      <button
        onClick={applyFilters}
        className="rounded-md bg-(--app-accent) px-4 py-2 text-(--app-accent-foreground) hover:bg-(--app-accent)/90 font-medium"
      >
        تطبيق
      </button>

      <button
        onClick={clearFilters}
        className="rounded-md bg-(--app-border) px-4 py-2 text-(--app-foreground) hover:bg-white/10"
      >
        مسح
      </button>
    </div>
  );
}
