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
  CREATE: "bg-(--app-success)/20 text-(--app-success)",
  UPDATE: "bg-(--app-info)/20 text-(--app-info)",
  DELETE: "bg-(--app-error)/20 text-(--app-error)",
  VIEW: "bg-(--app-border) text-(--app-muted-foreground)",
  LOGIN: "bg-(--app-success)/20 text-(--app-success)",
  LOGIN_FAILED: "bg-(--app-error)/20 text-(--app-error)",
  LOGOUT: "bg-(--app-warning)/20 text-(--app-warning)",
  LOCK: "bg-(--app-warning)/20 text-(--app-warning)",
  UNLOCK: "bg-(--app-info)/20 text-(--app-info)",
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
            className: "font-bold text-(--color-primary)",
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
            render: (val) => <span className="text-xs font-bold">{moduleLabels[val as string] ?? val}</span>,
          },
          {
            header: "الوصف",
            accessor: "description",
            render: (val) => <span className="text-[11px] leading-relaxed">{val as string}</span>
          },
          {
            header: "التاريخ",
            accessor: "createdAt",
            render: (val) => <span className="text-[11px] font-mono">{new Date(val as string).toLocaleString("ar")}</span>,
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
