"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { FileText, Loader2, ExternalLink } from "lucide-react";
import { TabSection } from "@/components/ui/tab-section";
import { extractApiError } from "@/lib/utils";
import MainTable, { TableColumn } from "@/components/ui/Table";
import { Badge } from "@/components/ui/badge";
import { LEAVE_TYPE_LABELS, LEAVE_STATUS_LABELS } from "@/lib/db/models/Leave.shared";

interface LeaveRecord {
  id: string;
  type: string;
  category: string;
  startDate: string;
  endDate: string;
  status: string;
}

interface LeaveRecordTabProps {
  officerId: string;
  initialData?: LeaveRecord[];
}

/**
 * تبويبة سجل الإجازات في صفحة تفاصيل الضابط.
 * يدعم SSR عبر استقبال البيانات الأولية، أو يجلبها من جهة العميل لتحسين سرعة التفاعل.
 */
export function LeaveRecordTab({ officerId, initialData }: LeaveRecordTabProps) {
  const [leaves, setLeaves] = useState<LeaveRecord[]>(initialData || []);
  const [loading, setLoading] = useState(!initialData);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // تخطي الجلب التلقائي إذا تم توفير البيانات أولياً (SSR)
    if (initialData && leaves.length > 0) {
      return;
    }

    async function fetchLeaves() {
      try {
        setLoading(true);
        // جلب آخر 10 سجلات إجازات للضابط
        const response = await fetch(`/api/arkan-harb/leaves?officerId=${officerId}&limit=10`);
        const result = await response.json();
        
        if (result.success) {
          setLeaves(result.data.items);
        } else {
          const errMsg = extractApiError(result, "فشل في جلب سجل الإجازات");
          setError(errMsg);
        }
      } catch {
        setError("حدث خطأ أثناء جلب سجل الإجازات");
      } finally {
        setLoading(false);
      }
    }

    if (officerId) {
      fetchLeaves();
    }
  }, [officerId, initialData, leaves.length]);

  const columns: TableColumn<LeaveRecord>[] = [
    {
      header: "نوع الإجازة",
      accessor: "type",
      render: (value, row) => (
        <span className="font-bold text-(--color-primary)">
          {LEAVE_TYPE_LABELS[row.type as keyof typeof LEAVE_TYPE_LABELS] ?? row.type}
        </span>
      ),
    },
    {
      header: "الفئة",
      accessor: "category",
      render: (value, row) => (row.category === "leave" ? "إجازة" : "غياب"),
    },
    {
      header: "الفترة الزمنية",
      render: (_, row) => (
        <div className="flex items-center gap-2 font-mono">
          <span>{new Date(row.startDate).toLocaleDateString("ar-EG")}</span>
          <span className="text-(--app-muted-foreground)/30">―</span>
          <span>{new Date(row.endDate).toLocaleDateString("ar-EG")}</span>
        </div>
      ),
    },
    {
      header: "الحالة",
      accessor: "status",
      cellAlign: "center",
      render: (value, row) => (
        <Badge variant="outline" className="bg-(--app-surface-container) border-(--app-border) text-(--app-muted-foreground) pointer-events-none">
           {LEAVE_STATUS_LABELS[row.status as keyof typeof LEAVE_STATUS_LABELS] ?? row.status}
        </Badge>
      ),
    },
  ];

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center rounded-xl border border-(--app-border) bg-(--app-surface) p-12">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-(--color-primary)" />
          <p className="text-sm font-medium text-(--app-muted-foreground)">جاري تحميل سجل الإجازات...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-(--app-error)/30 bg-(--app-error)/10 p-6 text-center text-(--app-error) font-bold">
        ⚠ {error}
      </div>
    );
  }

  return (
    <TabSection
      title="بيان الإجازات والغيابات"
      icon={FileText}
      action={
        <Link 
          href={`/arkan-harb/leaves?officerId=${officerId}`} 
          className="flex items-center gap-2 text-sm font-bold text-(--color-primary) hover:underline group"
        >
          <span>عرض الكل</span>
          <ExternalLink className="h-4 w-4 transition-transform group-hover:translate-x-[-2px]" />
        </Link>
      }
    >
      <MainTable 
        columns={columns} 
        data={leaves} 
        variant="secondary"
        emptyIcon={FileText}
        emptyTitle="لا توجد سجلات إجازات"
        emptyDescription="لم يتم تسجيل أي إجازات أو غيابات لهذا الضابط حتى الآن."
      />
    </TabSection>
  );
}
