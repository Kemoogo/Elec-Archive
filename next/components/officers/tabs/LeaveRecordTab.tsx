"use client";

import React, { useEffect, useState } from "react";
import { FileText, Calendar } from "lucide-react";
import { TabSection } from "@/components/ui/tab-section";
import { extractApiError } from "@/lib/utils";
import MainTable, { TableColumn } from "@/components/ui/Table";
import { LoadingState } from "@/components/ui/loading-state";
import { Badge } from "@/components/ui/badge";
import { getDayName, formatDateDisplay } from "@/components/ui/date-badge";
import {
  LEAVE_TYPE_LABELS,
  LEAVE_STATUS_LABELS,
  OFFICER_LEAVE_SYSTEM_LABELS,
} from "@/lib/db/models/Leave.shared";
import type { LeaveRecord } from "@/types";

export type { LeaveRecord };

interface LeaveRecordTabProps {
  officerId: string;
  initialData?: LeaveRecord[];
}

function calculateTotalDays(startDateStr?: string, endDateStr?: string): number {
  if (!startDateStr || !endDateStr) return 0;
  const sParts = startDateStr.match(/^(\d{4})-(\d{2})-(\d{2})/);
  const eParts = endDateStr.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!sParts || !eParts) return 1;
  const s = new Date(Number(sParts[1]), Number(sParts[2]) - 1, Number(sParts[3]));
  const e = new Date(Number(eParts[1]), Number(eParts[2]) - 1, Number(eParts[3]));
  const diffMs = e.getTime() - s.getTime();
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24)) + 1;
  return Math.max(1, diffDays);
}

function formatTimestamp(dateStr?: string): { date: string; time: string } | null {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return null;
  const date = formatDateDisplay(dateStr);
  const hours = String(d.getHours()).padStart(2, "0");
  const mins = String(d.getMinutes()).padStart(2, "0");
  return { date, time: `${hours}:${mins}` };
}

/**
 * تبويبة سجل الإجازات في صفحة تفاصيل الضابط.
 */
export function LeaveRecordTab({ officerId, initialData }: LeaveRecordTabProps) {
  const [leaves, setLeaves] = useState<LeaveRecord[]>(initialData || []);
  const [officerSystem, setOfficerSystem] = useState<string | null>(null);
  const [loading, setLoading] = useState(!initialData);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchLeaves() {
      try {
        setLoading(true);
        const response = await fetch(`/api/arkan-harb/leaves?officerId=${officerId}&limit=50`);
        const result = await response.json();
        
        if (result.success) {
          setLeaves(result.data.items);
          if (result.data.officerDefaultLeaveSystem) {
            setOfficerSystem(result.data.officerDefaultLeaveSystem);
          }
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
  }, [officerId]);

  const columns: TableColumn<LeaveRecord>[] = [
    {
      header: "نوع الإجازة",
      accessor: "type",
      cellAlign: "right",
      headerAlign: "right",
      render: (_, row) => (
        <div className="flex items-center gap-2">
          <span className="font-black text-xs text-(--color-primary)">
            {LEAVE_TYPE_LABELS[row.type as keyof typeof LEAVE_TYPE_LABELS] ?? row.type}
          </span>
          {row.medicalReportUrl && (
            <a
              href={row.medicalReportUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-(--app-surface-container) text-(--app-muted-foreground) hover:text-(--color-primary) border border-(--app-border) text-[10px] font-bold transition-colors"
              title="عرض شيت الإجازة المرضية"
              onClick={(e) => e.stopPropagation()}
            >
              <FileText className="w-3 h-3" />
              <span>الشيت الطبي</span>
            </a>
          )}
        </div>
      ),
    },
    {
      header: "الفئة",
      accessor: "category",
      cellAlign: "center",
      headerAlign: "center",
      render: (_, row) => (
        <Badge
          variant="outline"
          className="bg-(--app-surface-container) border-(--app-border) text-xs font-semibold text-(--app-muted-foreground)"
        >
          {row.category === "leave" ? "إجازة اعتيادية" : "غياب / انقطاع"}
        </Badge>
      ),
    },
    {
      header: "مدة التواجد",
      accessor: "presenceDurationDays",
      cellAlign: "center",
      headerAlign: "center",
      minWidth: true,
      className: "whitespace-nowrap min-w-[85px]",
      headerClassName: "min-w-[85px]",
      render: (_, row) => {
        if (row.presenceDurationDays && row.presenceDurationDays > 0) {
          return (
            <span className="inline-flex items-center gap-1 font-bold text-xs text-(--color-primary) bg-(--color-primary)/5 px-2.5 py-1 rounded-xl border border-(--color-primary)/15">
              <span className="font-mono font-black text-xs">{row.presenceDurationDays}</span>
              <span className="text-[11px] font-bold text-(--app-muted-foreground)">يوم</span>
            </span>
          );
        }
        return <span className="text-xs font-bold text-(--app-muted-foreground)/40">ـ</span>;
      },
    },
    {
      header: "المدة",
      headerAlign: "center",
      children: [
        {
          header: "من",
          cellAlign: "center",
          headerAlign: "center",
          minWidth: true,
          className: "whitespace-nowrap min-w-[105px]",
          headerClassName: "min-w-[105px]",
          render: (_, row) => (
            <div className="flex flex-col items-center justify-center leading-tight py-0.5">
              <span className="text-[11px] font-bold text-(--app-muted-foreground)">
                {getDayName(row.startDate)}
              </span>
              <span className="text-xs font-mono font-bold text-(--app-muted-foreground)">
                {formatDateDisplay(row.startDate)}
              </span>
            </div>
          ),
        },
        {
          header: "إلى",
          cellAlign: "center",
          headerAlign: "center",
          minWidth: true,
          className: "whitespace-nowrap min-w-[105px]",
          headerClassName: "min-w-[105px]",
          render: (_, row) => {
            const isInterrupted = row.status === "interrupted";
            const displayDate = isInterrupted && row.actualReturnDate ? row.actualReturnDate : row.endDate;
            return (
              <div className="flex flex-col items-center justify-center leading-tight py-0.5">
                <span className={`text-[11px] font-bold ${isInterrupted ? "text-(--app-error)" : "text-(--app-muted-foreground)"}`}>
                  {getDayName(displayDate)}
                </span>
                <span className={`text-xs font-mono font-bold ${isInterrupted ? "text-(--app-error)" : "text-(--app-muted-foreground)"}`}>
                  {formatDateDisplay(displayDate)}
                </span>
              </div>
            );
          },
        },
      ],
    },
    {
      header: "الإجمالي",
      cellAlign: "center",
      headerAlign: "center",
      minWidth: true,
      className: "whitespace-nowrap min-w-[85px]",
      headerClassName: "min-w-[85px]",
      render: (_, row) => {
        const isInterrupted = row.status === "interrupted";
        const effectiveEnd = isInterrupted && row.actualReturnDate ? row.actualReturnDate : row.endDate;
        const days = calculateTotalDays(row.startDate, effectiveEnd);
        return (
          <span className={`inline-flex items-center gap-1 font-bold text-xs px-2.5 py-1 rounded-xl border ${
            isInterrupted
              ? "bg-(--app-error)/10 text-(--app-error) border-(--app-error)/20"
              : "bg-(--app-surface-container) text-(--app-muted-foreground) border-(--app-border)"
          }`}>
            <span className="font-mono font-black text-xs">{days}</span>
            <span className="text-[11px] font-bold">
              {days >= 3 && days <= 10 ? "أيام" : "يوم"}
            </span>
          </span>
        );
      },
    },
    {
      header: "التوقيت",
      accessor: "createdAt",
      cellAlign: "center",
      headerAlign: "center",
      minWidth: true,
      className: "whitespace-nowrap min-w-[110px]",
      headerClassName: "min-w-[110px]",
      render: (_, row) => {
        const timeObj = formatTimestamp(row.createdAt);
        if (!timeObj) return <span className="text-xs font-bold text-(--app-muted-foreground)/40">ـ</span>;
        return (
          <div className="flex flex-col items-center justify-center leading-tight py-0.5">
            <span className="text-[11px] font-mono font-bold text-(--app-muted-foreground)">
              {timeObj.time}
            </span>
            <span className="text-[10px] font-mono text-(--app-muted-foreground)">
              {timeObj.date}
            </span>
          </div>
        );
      },
    },
    {
      header: "القائم بالأعمال",
      accessor: "actingOfficerName",
      cellAlign: "center",
      headerAlign: "center",
      render: (_, row) => (
        <span className="text-xs font-bold text-(--app-muted-foreground)">
          {row.actingOfficerName || "ـ"}
        </span>
      ),
    },
    {
      header: "الحالة",
      accessor: "status",
      cellAlign: "center",
      headerAlign: "center",
      render: (_, row) => {
        if (row.status === "interrupted") {
          return (
            <div className="flex flex-col items-center gap-1">
              <Badge
                variant="outline"
                className="bg-(--app-error)/10 border-(--app-error)/20 text-(--app-error) text-[11px] font-bold px-2.5 py-0.5 inline-flex items-center gap-1 pointer-events-none"
              >
                <span>مقطوعة (عودة مبكرة)</span>
              </Badge>
              {row.actualReturnDate && (
                <span className="text-[10px] font-mono font-bold text-(--app-error)">
                  قطع: {formatDateDisplay(row.actualReturnDate)}
                </span>
              )}
              {row.reason && (
                <span className="text-[10px] font-bold text-(--app-muted-foreground) max-w-[130px] truncate" title={row.reason}>
                  {row.reason}
                </span>
              )}
            </div>
          );
        }

        return (
          <Badge variant="outline" className="bg-(--app-surface-container) border-(--app-border) text-(--app-muted-foreground) pointer-events-none">
            {LEAVE_STATUS_LABELS[row.status as keyof typeof LEAVE_STATUS_LABELS] ?? row.status}
          </Badge>
        );
      },
    },
  ];

  if (loading) {
    return <LoadingState message="جاري تحميل سجل الإجازات..." />;
  }

  if (error) {
    return (
      <div className="rounded-xl border border-(--app-error)/30 bg-(--app-error)/10 p-6 text-center text-(--app-error) font-bold">
        ⚠ {error}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Officer Leave System Header Card */}
      <div className="flex items-center justify-between p-4 bg-(--color-primary)/5 border border-(--color-primary)/15 rounded-2xl">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-(--color-primary)/10 rounded-xl text-(--color-primary)">
            <Calendar className="w-5 h-5" />
          </div>
          <div>
            <span className="text-xs font-bold text-(--app-muted-foreground) block">
              نظام الإجازة المستحق للضابط
            </span>
            <h4 className="text-sm font-black text-(--color-primary)">
              {officerSystem ? (OFFICER_LEAVE_SYSTEM_LABELS[officerSystem as keyof typeof OFFICER_LEAVE_SYSTEM_LABELS] || officerSystem) : "غير محدد بعد"}
            </h4>
          </div>
        </div>
        <span className="text-xs font-bold text-(--app-muted-foreground) bg-(--app-surface) border border-(--app-border) px-3 py-1.5 rounded-xl">
          إجمالي الإجازات المسجلة: {leaves.length}
        </span>
      </div>

      <TabSection
        title="بيان الإجازات والغيابات (حسب تتالي الأحداث)"
        icon={FileText}
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
    </div>
  );
}
