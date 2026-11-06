"use client";

import { useState, useEffect, useCallback } from "react";
import MainTable from "@/components/ui/Table";
import { Paginator } from "@/components/ui/paginator";

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
  CREATE: "bg-(--app-surface-container) text-(--app-muted-foreground) border border-(--app-border)",
  UPDATE: "bg-(--app-surface-container) text-(--app-muted-foreground) border border-(--app-border)",
  DELETE: "bg-(--app-surface-container) text-(--app-muted-foreground) border border-(--app-border)",
  VIEW: "bg-(--app-surface-container) text-(--app-muted-foreground) border border-(--app-border)",
  LOGIN: "bg-(--app-surface-container) text-(--app-muted-foreground) border border-(--app-border)",
  LOGIN_FAILED: "bg-(--app-surface-container) text-(--app-muted-foreground) border border-(--app-border)",
  LOGOUT: "bg-(--app-surface-container) text-(--app-muted-foreground) border border-(--app-border)",
  LOCK: "bg-(--app-surface-container) text-(--app-muted-foreground) border border-(--app-border)",
  UNLOCK: "bg-(--app-surface-container) text-(--app-muted-foreground) border border-(--app-border)",
};

interface AuditLogTableProps {
  action?: string;
  module?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
}

export function AuditLogTable({ action, module, startDate, endDate, page = 1 }: AuditLogTableProps) {
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  const fetchEntries = useCallback(async () => {
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

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="text-sm font-bold text-(--app-muted-foreground)">
          إجمالي السجلات: <span className="text-(--color-primary)">{total}</span>
        </div>
      </div>

      <MainTable
        showSerialNumber
        columns={[
          {
            header: "المستخدم",
            accessor: "userName",
            className: "font-black text-xs text-(--color-primary)",
          },
          {
            header: "العملية",
            accessor: "action",
            render: (val) => (
              <span className={`rounded-lg px-2.5 py-1 text-[10px] font-bold border ${actionColors[val as string] ?? "bg-(--app-surface-container) text-(--app-muted-foreground) border-(--app-border)"}`}>
                {(actionLabels[val as string] ?? val).toUpperCase()}
              </span>
            ),
          },
          {
            header: "الوحدة",
            accessor: "module",
            render: (val) => <span className="text-xs font-bold text-(--app-muted-foreground)">{moduleLabels[val as string] ?? val}</span>,
          },
          {
            header: "الوصف",
            accessor: "description",
            render: (val) => <span className="text-xs font-bold text-(--app-muted-foreground) leading-relaxed">{val as string}</span>
          },
          {
            header: "التاريخ",
            accessor: "createdAt",
            render: (val) => <span className="text-xs font-mono font-bold text-(--app-muted-foreground)">{new Date(val as string).toLocaleString("ar")}</span>,
          },
        ]}
        data={entries}
        isLoading={loading}
        emptyTitle="لا توجد سجلات مطابقة"
        emptyDescription="لم يتم العثور على سجلات تطابق معايير البحث الحالية"
      />

      <Paginator page={page} totalPages={totalPages} total={total} showTotal={false} />
    </div>
  );
}
