"use client";

import { useState, useEffect, useCallback } from "react";
import MainTable from "@/components/ui/Table";

interface AuditEntry {
  _id: string;
  id?: string;
  className?: string;
  userId: string;
  userName: string;
  action: string;
  module: string;
  targetId?: string;
  description: string;
  ipAddress: string;
  createdAt: string;
}

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
};

const actionColors: Record<string, string> = {
  CREATE: "bg-green-500/20 text-green-400",
  UPDATE: "bg-blue-500/20 text-blue-400",
  DELETE: "bg-red-500/20 text-red-400",
  VIEW: "bg-(--app-border) text-(--app-muted-foreground)",
  LOGIN: "bg-green-500/20 text-green-400",
  LOGIN_FAILED: "bg-red-500/20 text-red-400",
  LOGOUT: "bg-yellow-500/20 text-yellow-400",
  LOCK: "bg-orange-500/20 text-orange-400",
  UNLOCK: "bg-blue-500/20 text-blue-400",
};

export function AuditLogTable() {
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  const [filterAction, setFilterAction] = useState("");
  const [filterModule, setFilterModule] = useState("");
  const [filterStartDate, setFilterStartDate] = useState("");
  const [filterEndDate, setFilterEndDate] = useState("");

  const fetchEntries = useCallback(async (pageNum: number) => {
    setLoading(true);

    const params = new URLSearchParams({
      page: String(pageNum),
      limit: "20",
    });

    if (filterAction) params.set("action", filterAction);
    if (filterModule) params.set("module", filterModule);
    if (filterStartDate) params.set("startDate", filterStartDate);
    if (filterEndDate) params.set("endDate", filterEndDate);

    try {
      const res = await fetch(`/api/audit?${params.toString()}`);
      const data = await res.json();
      if (data.success) {
        setEntries(data.data.entries);
        setTotalPages(data.data.totalPages);
        setTotal(data.data.total);
      }
    } finally {
      setLoading(false);
    }
  }, [filterAction, filterModule, filterStartDate, filterEndDate]);

  useEffect(() => {
    fetchEntries(page);
  }, [page, fetchEntries]);

  const applyFilters = () => {
    setPage(1);
    fetchEntries(1);
  };

  const clearFilters = () => {
    setFilterAction("");
    setFilterModule("");
    setFilterStartDate("");
    setFilterEndDate("");
    setPage(1);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3 rounded-lg bg-(--app-surface) p-4">
        <div>
          <label className="mb-1 block text-sm text-(--app-muted-foreground)">العملية</label>
          <select
            value={filterAction}
            onChange={(e) => setFilterAction(e.target.value)}
            className="rounded-md border border-(--app-border) bg-(--app-surface) px-3 py-2 text-sm text-(--app-white)"
          >
            <option value="">الكل</option>
            {Object.entries(actionLabels).map(([key, label]) => (
              <option key={key} value={key}>{label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-sm text-(--app-muted-foreground)">الوحدة</label>
          <select
            value={filterModule}
            onChange={(e) => setFilterModule(e.target.value)}
            className="rounded-md border border-(--app-border) bg-(--app-surface) px-3 py-2 text-sm text-(--app-white)"
          >
            <option value="">الكل</option>
            {Object.entries(moduleLabels).map(([key, label]) => (
              <option key={key} value={key}>{label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-sm text-(--app-muted-foreground)">من تاريخ</label>
          <input
            type="date"
            value={filterStartDate}
            onChange={(e) => setFilterStartDate(e.target.value)}
            className="rounded-md border border-(--app-border) bg-(--app-surface) px-3 py-2 text-sm text-(--app-white)"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm text-(--app-muted-foreground)">إلى تاريخ</label>
          <input
            type="date"
            value={filterEndDate}
            onChange={(e) => setFilterEndDate(e.target.value)}
            className="rounded-md border border-(--app-border) bg-(--app-surface) px-3 py-2 text-sm text-(--app-white)"
          />
        </div>
        <button
          onClick={applyFilters}
          className="rounded-md bg-(--app-accent) px-4 py-2 text-sm text-(--app-accent-foreground) font-medium hover:bg-(--app-accent)/90"
        >
          تطبيق
        </button>
        <button
          onClick={clearFilters}
          className="rounded-md bg-(--app-border) px-4 py-2 text-sm text-(--app-white) hover:bg-white/10"
        >
          مسح
        </button>
      </div>

      <div className="text-sm text-(--app-muted-foreground)">
        إجمالي السجلات: {total}
      </div>

      {loading ? (
        <div className="rounded-lg bg-(--app-surface) p-8 text-center text-(--app-muted-foreground)">
          جاري التحميل...
        </div>
      ) : entries.length === 0 ? (
        <div className="rounded-lg bg-(--app-surface) p-8 text-center text-(--app-muted-foreground)">
          لا توجد سجلات
        </div>
      ) : (
        <MainTable
          showSerialNumber
          columns={[
            {
              header: "المستخدم",
              accessor: "userName",
              className: "font-medium text-(--app-white)",
            },
            {
              header: "العملية",
              accessor: "action",
              render: (val) => (
                <span className={`rounded-full px-2 py-1 text-xs ${actionColors[val as string] ?? "bg-(--app-border) text-foreground"}`}>
                  {actionLabels[val as string] ?? val}
                </span>
              ),
            },
            {
              header: "الوحدة",
              accessor: "module",
              tdClassName: "text-(--app-muted-foreground)",
              render: (val) => moduleLabels[val as string] ?? val,
            },
            {
              header: "الوصف",
              accessor: "description",
              tdClassName: "text-(--app-muted-foreground) max-w-xs truncate",
            },
            {
              header: "التاريخ",
              accessor: "createdAt",
              tdClassName: "text-(--app-muted-foreground) whitespace-nowrap",
              render: (val) => new Date(val as string).toLocaleString("ar"),
            },
          ]}
          data={entries}
        />
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="rounded-md bg-(--app-surface) px-3 py-1 text-sm text-(--app-white) disabled:opacity-40"
          >
            السابق
          </button>
          <span className="text-sm text-(--app-muted-foreground)">
            صفحة {page} من {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="rounded-md bg-(--app-surface) px-3 py-1 text-sm text-(--app-white) disabled:opacity-40"
          >
            التالي
          </button>
        </div>
      )}
    </div>
  );
}
