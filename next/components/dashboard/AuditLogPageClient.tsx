"use client";

import { useState, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { PageContainer } from "@/components/layout/PageContainer";
import { ModernPageHeader as PageHeader } from "@/components/layout/ModernPageHeader";
import { History, SlidersHorizontal, X } from "lucide-react";
import { AuditLogTable } from "@/components/dashboard/AuditLogTable";
import { DateField } from "@/components/ui/date-field";
import { CustomSelect, type CustomSelectOption } from "@/components/ui/custom-select";

const actionLabels: Record<string, string> = {
  CREATE: "إنشاء",
  UPDATE: "تعديل",
  DELETE: "حذف",
  VIEW: "عرض",
  LOGIN: "تسجيل دخول",
  LOGIN_FAILED: "فشل دخول",
  LOGOUT: "تسجيل خروج",
  LOCK: "قفل",
  UNLOCK: "فتح",
};

const moduleLabels: Record<string, string> = {
  auth: "المصادقة",
  users: "المستخدمين",
  fax: "الفاكس",
  officers: "الضباط",
  medical: "الطبي",
  students: "الطلبة",
  education: "التعليم",
  arkan_harb: "أركان حرب",
  historical_record: "السجل التاريخي",
};

const ACTION_OPTIONS: CustomSelectOption[] = [
  { value: "", label: "جميع العمليات" },
  ...Object.entries(actionLabels).map(([key, label]) => ({ value: key, label })),
];

const MODULE_OPTIONS: CustomSelectOption[] = [
  { value: "", label: "جميع الوحدات" },
  ...Object.entries(moduleLabels).map(([key, label]) => ({ value: key, label })),
];

export function AuditLogPageClient() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [filterAction, setFilterAction] = useState(searchParams.get("action") || "");
  const [filterModule, setFilterModule] = useState(searchParams.get("module") || "");
  const [filterStartDate, setFilterStartDate] = useState(searchParams.get("startDate") || "");
  const [filterEndDate, setFilterEndDate] = useState(searchParams.get("endDate") || "");
  const [showFilters, setShowFilters] = useState(false);

  const applyFilters = useCallback(
    (updates: Record<string, string>) => {
      const params = new URLSearchParams(searchParams.toString());
      
      Object.entries(updates).forEach(([key, value]) => {
        if (value) params.set(key, value);
        else params.delete(key);
      });
      
      params.set("page", "1");
      router.push(`/audit-log?${params.toString()}`);
    },
    [router, searchParams]
  );

  const clearFilters = () => {
    setFilterAction("");
    setFilterModule("");
    setFilterStartDate("");
    setFilterEndDate("");
    setShowFilters(false);
    router.push("/audit-log");
  };

  return (
    <PageContainer className="max-w-[1600px] mx-auto pb-12">
      <PageHeader
        title="سجل العمليات"
        description="متابعة التحركات والتغيرات في النظام"
        icon={<History className="w-6 h-6" />}
        action={
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl border font-bold text-xs transition-all ${
              showFilters || filterAction || filterModule || filterStartDate || filterEndDate
                ? "bg-(--color-primary)/10 text-(--color-primary) border-(--color-primary)/20"
                : "bg-(--app-surface-container) text-(--app-muted-foreground) border-(--app-border) hover:bg-(--app-border)"
            }`}
          >
            <SlidersHorizontal className="w-4 h-4" />
            <span>تصفية النتائج</span>
            {(filterAction || filterModule || filterStartDate || filterEndDate) && (
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-(--color-primary) text-[10px] text-white">
                {[filterAction, filterModule, filterStartDate, filterEndDate].filter(Boolean).length}
              </span>
            )}
          </button>
        }
      />

      {showFilters && (
        <div className="mb-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 p-5 bg-(--app-surface-container) border border-(--app-border) rounded-2xl animate-in fade-in slide-in-from-top-4 duration-300">
          <CustomSelect
            id="audit-action-filter"
            label="العملية"
            value={filterAction}
            onChange={(val) => {
              setFilterAction(val);
              applyFilters({ action: val });
            }}
            options={ACTION_OPTIONS}
            placeholder="جميع العمليات"
          />

          <CustomSelect
            id="audit-module-filter"
            label="الوحدة"
            value={filterModule}
            onChange={(val) => {
              setFilterModule(val);
              applyFilters({ module: val });
            }}
            options={MODULE_OPTIONS}
            placeholder="جميع الوحدات"
          />

          <DateField
            id="startDate"
            label="من تاريخ"
            value={filterStartDate}
            onChange={(v) => {
              setFilterStartDate(v);
              applyFilters({ startDate: v });
            }}
          />

          <DateField
            id="endDate"
            label="إلى تاريخ"
            value={filterEndDate}
            onChange={(v) => {
              setFilterEndDate(v);
              applyFilters({ endDate: v });
            }}
          />

          <div className="flex items-end">
            <button
              onClick={clearFilters}
              className="btn-secondary w-full h-[38px] flex items-center justify-center gap-2 text-xs font-bold"
            >
              <X className="w-4 h-4" />
              مسح الفلاتر
            </button>
          </div>
        </div>
      )}

      <AuditLogTable 
        action={searchParams.get("action") || ""}
        module={searchParams.get("module") || ""}
        startDate={searchParams.get("startDate") || ""}
        endDate={searchParams.get("endDate") || ""}
        page={Number(searchParams.get("page")) || 1}
      />
    </PageContainer>
  );
}
