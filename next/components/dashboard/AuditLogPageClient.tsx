"use client";

import { useState, useCallback, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { PageContainer } from "@/components/layout/PageContainer";
import { ModernPageHeader as PageHeader } from "@/components/layout/ModernPageHeader";
import { History, SlidersHorizontal, X } from "lucide-react";
import { AuditLogTable } from "@/components/dashboard/AuditLogTable";
import { DateField } from "@/components/ui/date-field";

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
};

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
          <div className="space-y-1.5">
            <label className="text-[11px] font-black text-(--color-muted) px-1">العملية</label>
            <select
              value={filterAction}
              onChange={(e) => {
                setFilterAction(e.target.value);
                applyFilters({ action: e.target.value });
              }}
              className="w-full rounded-xl border border-(--app-border) bg-(--app-surface) px-3 py-2 text-xs font-bold text-(--color-primary) focus:outline-none   transition-all appearance-none cursor-pointer"
            >
              <option value="">جميع العمليات</option>
              {Object.entries(actionLabels).map(([key, label]) => (
                <option key={key} value={key}>{label}</option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-[11px] font-black text-(--color-muted) px-1">الوحدة</label>
            <select
              value={filterModule}
              onChange={(e) => {
                setFilterModule(e.target.value);
                applyFilters({ module: e.target.value });
              }}
              className="w-full rounded-xl border border-(--app-border) bg-(--app-surface) px-3 py-2 text-xs font-bold text-(--color-primary) focus:outline-none   transition-all appearance-none cursor-pointer"
            >
              <option value="">جميع الوحدات</option>
              {Object.entries(moduleLabels).map(([key, label]) => (
                <option key={key} value={key}>{label}</option>
              ))}
            </select>
          </div>

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
              className="w-full h-[38px] flex items-center justify-center gap-2 rounded-xl border border-red-500/20 bg-red-500/5 text-red-500 text-xs font-black hover:bg-red-500/10 transition-all shadow-sm"
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
