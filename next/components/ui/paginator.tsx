"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";

interface PaginatorProps {
  /** Current page number (1-indexed) */
  page: number;
  /** Total number of pages */
  totalPages: number;
  /** Total items count (displayed on the left) */
  total?: number;
  /** Custom page change handler. If omitted, uses useRouter + useSearchParams to preserve existing query params */
  onPageChange?: (page: number) => void;
  /** Whether to show the total count. Default: true */
  showTotal?: boolean;
}

export function Paginator({ page, totalPages, total, onPageChange, showTotal = true }: PaginatorProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const handlePageChange = useCallback(
    (newPage: number) => {
      if (onPageChange) {
        onPageChange(newPage);
      } else {
        const params = new URLSearchParams(searchParams.toString());
        params.set("page", String(newPage));
        router.push(`?${params.toString()}`);
      }
    },
    [onPageChange, router, searchParams],
  );

  if (totalPages <= 1) return null;

  const prevDisabled = page <= 1;
  const nextDisabled = page >= totalPages;

  return (
    <div className="flex items-center justify-between">
      {showTotal && total !== undefined && (
        <span className="text-sm text-(--app-muted-foreground)">إجمالي: {total}</span>
      )}
      <div className={`flex items-center gap-2 ${showTotal && total !== undefined ? "" : "mx-auto"}`} dir="ltr">
        <button
          onClick={() => handlePageChange(page - 1)}
          disabled={prevDisabled}
          className="btn-paginator"
        >
          السابق
        </button>
        <span className="text-sm font-bold text-(--app-muted-foreground) px-4">
          صفحة {page} من {totalPages}
        </span>
        <button
          onClick={() => handlePageChange(page + 1)}
          disabled={nextDisabled}
          className="btn-paginator"
        >
          التالي
        </button>
      </div>
    </div>
  );
}
