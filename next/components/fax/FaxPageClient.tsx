"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { FaxTable } from "@/components/fax/FaxTable";
import { PageContainer } from "@/components/layout/PageContainer";
import { ModernPageHeader as PageHeader, PrimaryHeaderBtn } from "@/components/layout/ModernPageHeader";
import { FileText, Plus, Calendar, X } from "lucide-react";
import { DateField } from "@/components/ui/date-field";
import { Paginator } from "@/components/ui/paginator";
import { CustomSelect, type CustomSelectOption } from "@/components/ui/custom-select";

const FAX_STATUS_OPTIONS: CustomSelectOption[] = [
  { value: "", label: "جميع الحالات" },
  { value: "pending", label: "معلق" },
  { value: "forwarded", label: "موجّه" },
  { value: "closed", label: "مغلق" },
];

interface SerializedFax {
  _id: string;
  faxNumber: string;
  date: string;
  fromEntity: string;
  subject: string;
  status: "pending" | "forwarded" | "closed";
  uploadedBy: { _id: string; fullName: string };
  createdAt: string;
}

interface FaxPageClientProps {
  initialFaxes: SerializedFax[];
  total: number;
  totalPages: number;
  page: number;
  canCreate: boolean;
  initialFilters: {
    search?: string;
    status?: string;
    dateFrom?: string;
    dateTo?: string;
  };
}

export function FaxPageClient({
  initialFaxes,
  total,
  totalPages,
  page,
  canCreate,
  initialFilters,
}: FaxPageClientProps) {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState(initialFilters.search || "");
  const [statusFilter, setStatusFilter] = useState(initialFilters.status || "");
  const [dateFrom, setDateFrom] = useState(initialFilters.dateFrom || "");
  const [dateTo, setDateTo] = useState(initialFilters.dateTo || "");
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

  const applyFilters = useCallback(
    (updates: Record<string, string>) => {
      const params = new URLSearchParams();
      const current = {
        search: searchQuery,
        status: statusFilter,
        dateFrom: dateFrom,
        dateTo: dateTo,
        ...updates,
      };

      if (current.search) params.set("search", current.search);
      if (current.status) params.set("status", current.status);
      if (current.dateFrom) params.set("dateFrom", current.dateFrom);
      if (current.dateTo) params.set("dateTo", current.dateTo);
      params.set("page", "1");

      router.push(`/fax?${params.toString()}`);
    },
    [router, searchQuery, statusFilter, dateFrom, dateTo]
  );

  const handleSearchChange = (query: string) => {
    const trimmed = query.trim();
    if (trimmed.length === 1) return;
    setSearchQuery(trimmed);
    applyFilters({ search: trimmed });
  };

  const handleStatusChange = (status: string) => {
    setStatusFilter(status);
    applyFilters({ status });
  };

  const handleDateFromChange = (date: string) => {
    setDateFrom(date);
    applyFilters({ dateFrom: date });
  };

  const handleDateToChange = (date: string) => {
    setDateTo(date);
    applyFilters({ dateTo: date });
  };

  const clearFilters = () => {
    setSearchQuery("");
    setStatusFilter("");
    setDateFrom("");
    setDateTo("");
    router.push("/fax");
  };

  return (
    <PageContainer className="max-w-[1600px] mx-auto pb-12">
      <PageHeader
        title="قسم الفاكس"
        description={`إجمالي ${total} فاكس`}
        icon={<FileText className="w-6 h-6" />}
        showSearch
        searchQuery={searchQuery}
        onSearchChange={handleSearchChange}
        searchPlaceholder="بحث برقم الفاكس أو الموضوع..."
        action={
          <div className="flex items-center gap-2">
            <CustomSelect
              value={statusFilter}
              onChange={handleStatusChange}
              options={FAX_STATUS_OPTIONS}
              placeholder="جميع الحالات"
              containerClassName="w-36"
            />

            <button
              onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
              className={`p-2 rounded-xl border transition-all ${
                showAdvancedFilters || dateFrom || dateTo
                  ? "bg-(--color-primary)/10 text-(--color-primary) border-(--color-primary)/20"
                  : "bg-(--app-surface-container) text-(--app-muted-foreground) border-(--app-border) hover:bg-(--app-border)"
              }`}
              title="تاريخ متقدم"
            >
              <Calendar className="w-4 h-4" />
            </button>

            {canCreate && (
              <PrimaryHeaderBtn href="/fax/new" label="رفع فاكس جديد" icon={<Plus className="w-4 h-4" />} />
            )}
          </div>
        }
      />

      {showAdvancedFilters && (
        <div className="mb-6 flex flex-wrap items-center gap-4 p-4 bg-(--app-surface-container) border border-(--app-border) rounded-2xl animate-in fade-in slide-in-from-top-2">
          <div className="flex flex-1 items-center gap-4">
            <DateField
              id="dateFrom"
              label="من تاريخ"
              value={dateFrom}
              onChange={(v) => handleDateFromChange(v)}
              className="max-w-[180px]"
            />
            <DateField
              id="dateTo"
              label="إلى تاريخ"
              value={dateTo}
              onChange={(v) => handleDateToChange(v)}
              className="max-w-[180px]"
            />
          </div>
          <button
            onClick={clearFilters}
            className="mr-auto flex items-center gap-1 text-xs font-bold text-(--app-muted-foreground) hover:text-(--color-primary) transition-colors"
          >
            <X className="w-3 h-3" />
            مسح الفلاتر
          </button>
        </div>
      )}

      <FaxTable faxes={initialFaxes} />

      <Paginator page={page} totalPages={totalPages} total={total} />
    </PageContainer>
  );
}
