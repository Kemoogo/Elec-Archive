"use client";

import Link from "next/link";
import MainTable, { type TableColumn } from "@/components/ui/Table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Paginator } from "@/components/ui/paginator";
import { getStatusBadgeClass, getMissionStatusLabel } from "@/lib/utils/status-badge";
import { Edit, User } from "lucide-react";
import { ActionButton } from "@/components/officers/OfficersTable";

export type MissionStatus = "scheduled" | "active" | "completed" | "cancelled";

export interface Mission {
  id: string;
  officerId: string;
  officerName?: string;
  officerRankLabel?: string;
  officerMilitaryId?: string;
  title: string;
  description?: string;
  destination?: string;
  startDate: Date | string;
  endDate?: Date | string | null;
  status: MissionStatus;
  createdBy: string;
  createdAt: Date | string;
}

// Helper function to format date for display
function formatDate(date: Date | string): string {
  if (!date) return "";
  const d = typeof date === "string" ? new Date(date) : date;
  return `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getFullYear()}`;
}


export function MissionsTable({
  missions,
  total,
  page,
  limit,
  onPageChange,
  onLimitChange,
  onEditMission,
}: {
  missions: Mission[];
  total: number;
  page: number;
  limit: number;
  onPageChange: (page: number) => void;
  onLimitChange: (limit: number) => void;
  onOfficerFilterChange: (officerId: string) => void;
  onStatusFilterChange: (status: string) => void;
  onEditMission: (mission: Mission) => void;
  officerFilter: string;
  statusFilter: string;
}) {
  const columns: TableColumn<Mission>[] = [
    {
      header: "الضابط",
      accessor: "officerName",
      cellAlign: "right" as const,
      headerAlign: "right" as const,
      render: (value: unknown, row: Mission) => {
        const name = value as string;
        const rankAndName = row.officerRankLabel ? `${row.officerRankLabel} / ${name}` : name;
        return (
          <div className="flex items-center gap-2">
            <User className="h-4 w-4 text-(--app-muted-foreground) shrink-0" />
            <div className="flex flex-col text-right">
              {row.officerId ? (
                <Link
                  href={`/officers/${row.officerId}`}
                  className="text-sm font-extrabold text-(--app-foreground) hover:text-(--app-info) hover:underline transition-colors"
                >
                  {rankAndName || "ضابط غير معروف"}
                </Link>
              ) : (
                <span className="text-sm font-extrabold text-(--app-foreground)">{rankAndName || "غير معروف"}</span>
              )}
              {row.officerMilitaryId && (
                <span className="text-xs font-mono text-(--app-muted-foreground)">عسكري: #{row.officerMilitaryId}</span>
              )}
            </div>
          </div>
        );
      },
    },
    {
      header: "المهمة",
      accessor: "title",
      cellAlign: "right" as const,
      headerAlign: "right" as const,
      render: (value: unknown) => <span className="font-bold text-(--app-foreground)">{value as string}</span>
    },
    {
      header: "الجهة",
      accessor: "destination",
      cellAlign: "right" as const,
      headerAlign: "right" as const,
      render: (value: unknown) => (value as string | undefined) || "---",
    },
    {
      header: "الفترة",
      accessor: "startDate",
      cellAlign: "center" as const,
      headerAlign: "center" as const,
      render: (_: unknown, row: Mission) => (
        <div className="flex flex-col text-xs font-bold">
          <span>من: {formatDate(row.startDate)}</span>
          {row.endDate && <span>إلى: {formatDate(row.endDate)}</span>}
        </div>
      ),
    },
    {
      header: "الحالة",
      accessor: "status",
      cellAlign: "center" as const,
      headerAlign: "center" as const,
      render: (value: unknown) => (
        <Badge
          variant="secondary"
          className={`${getStatusBadgeClass(value as MissionStatus)} text-[10px] font-bold px-2.5 py-1 rounded-lg border-none`}
        >
          {getMissionStatusLabel(value as MissionStatus)}
        </Badge>
      ),
    },
    {
      header: "الإجراءات",
      accessor: undefined,
      cellAlign: "center" as const,
      headerAlign: "center" as const,
      className: "w-[80px]",
      render: (_: unknown, row: Mission) => (
        <div className="flex items-center justify-center gap-1.5" onClick={(e) => e.stopPropagation()}>
          <ActionButton
            icon={<Edit className="h-4 w-4" />}
            color="btn-action-info"
            title="تعديل المهمة"
            onClick={() => onEditMission(row)}
          />
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-4">

      {/* Table section */}
      <MainTable<Mission>
        columns={columns}
        data={missions}
        showSerialNumber={true}
        emptyTitle="لا توجد سجل مأموريات حالياً"
        emptyDescription="حاول تغيير خيارات البحث أو أضف مأمورية جديدة"
      />

        {/* Pagination section */}
        {total > 0 && (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <span className="text-sm text-(--app-muted-foreground)">إجمالي: {total}</span>
              <div className="flex items-center gap-1">
                {[5, 10, 20].map((l) => (
                  <Button
                    key={l}
                    variant="ghost"
                    size="sm"
                    onClick={() => onLimitChange(l)}
                    className={`h-7 w-7 p-0 text-[10px] font-bold rounded-lg ${limit === l ? "bg-(--color-primary) text-white hover:bg-(--color-primary) hover:text-white" : "text-(--app-muted-foreground)"}`}
                  >
                    {l}
                  </Button>
                ))}
              </div>
            </div>
            <Paginator page={page} totalPages={Math.max(1, Math.ceil(total / limit))} onPageChange={onPageChange} showTotal={false} />
          </div>
        )}

    </div>
  );
}
