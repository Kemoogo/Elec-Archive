"use client";

import { useState, useEffect, useCallback } from "react";
import MainTable from "@/components/ui/Table";
import { useRouter } from "next/navigation";

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
  arkan_harb: "أركان حرب",
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

interface AuditLogTableProps {
  action?: string;
  module?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
}

export function AuditLogTable({ action, module, startDate, endDate, page = 1 }: AuditLogTableProps) {
  const router = useRouter();
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  const fetchEntries = useCallback(async () => {
    setLoading(true);

    const params = new URLSearchParams({
      page: String(page),
      limit: "20",
    });

    if (action) params.set("action", action);
    if (module) params.set("module", module);
    if (startDate) params.set("startDate", startDate);
    if (endDate) params.set("endDate", endDate);

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
  }, [action, module, startDate, endDate, page]);

  useEffect(() => {
    fetchEntries();
  }, [fetchEntries]);

  const setPage = (p: number) => {
    const params = new URLSearchParams(window.location.search);
    params.set("page", String(p));
    router.push(`/audit-log?${params.toString()}`);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="text-sm font-bold text-(--app-muted-foreground)">
          إجمالي السجلات: <span className="text-(--color-primary)">{total}</span>
        </div>
      </div>

      {loading ? (
        <div className="rounded-2xl bg-(--app-surface) border border-(--app-border) p-12 text-center animate-pulse">
          <div className="flex flex-col items-center gap-3 text-(--app-muted-foreground)">
             <div className="w-10 h-10 border-4 border-(--color-primary) border-t-transparent rounded-full animate-spin"></div>
             <p className="font-bold text-sm">جاري جلب سجلات النظام...</p>
          </div>
        </div>
      ) : entries.length === 0 ? (
        <div className="rounded-2xl bg-(--app-surface) border border-(--app-border) p-12 text-center text-(--app-muted-foreground)">
          لا توجد سجلات مطابقة للبحث
        </div>
      ) : (
        <MainTable
          showSerialNumber
          columns={[
            {
              header: "المستخدم",
              accessor: "userName",
              className: "font-bold text-(--app-white)",
            },
            {
              header: "العملية",
              accessor: "action",
              render: (val) => (
                <span className={`rounded-lg px-2.5 py-1 text-[10px] font-black tracking-wider ${actionColors[val as string] ?? "bg-(--app-border) text-foreground"}`}>
                  {(actionLabels[val as string] ?? val).toUpperCase()}
                </span>
              ),
            },
            {
              header: "الوحدة",
              accessor: "module",
              tdClassName: "text-(--app-muted-foreground)",
              render: (val) => <span className="text-xs font-bold">{moduleLabels[val as string] ?? val}</span>,
            },
            {
              header: "الوصف",
              accessor: "description",
              tdClassName: "text-(--app-muted-foreground) max-w-sm",
              render: (val) => <span className="text-[11px] leading-relaxed">{val as string}</span>
            },
            {
              header: "التاريخ",
              accessor: "createdAt",
              tdClassName: "text-(--app-muted-foreground) whitespace-nowrap",
              render: (val) => <span className="text-[11px] font-mono">{new Date(val as string).toLocaleString("ar")}</span>,
            },
          ]}
          data={entries}
        />
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-4 mt-8" dir="ltr">
          <button
            onClick={() => setPage(Math.max(1, page - 1))}
            disabled={page === 1}
            className="btn-secondary px-4 py-2 text-xs font-bold disabled:opacity-50"
          >
            السابق
          </button>
          
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-(--color-primary) text-xs font-bold text-white shadow-sm">
              {page}
            </span>
            <span className="text-xs font-bold text-(--color-muted)">
              من {totalPages}
            </span>
          </div>

          <button
            onClick={() => setPage(Math.min(totalPages, page + 1))}
            disabled={page === totalPages}
            className="btn-secondary px-4 py-2 text-xs font-bold disabled:opacity-50"
          >
            التالي
          </button>
        </div>
      )}
    </div>
  );
}
