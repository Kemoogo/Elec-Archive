"use client";

import Link from "next/link";
import MainTable, { type TableColumn } from "@/components/ui/Table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Paginator } from "@/components/ui/paginator";
import { getStatusBadgeClass, getPositionStatusLabel } from "@/lib/utils/status-badge";
import { Edit, User, UserPlus } from "lucide-react";
import { ActionButton } from "@/components/officers/OfficersTable";

export type PositionType = "primary" | "substitute";
export type PositionStatus = "active" | "ended";

interface OfficerOption {
  id: string;
  name: string;
  rank: string;
  militaryId: string;
}

export interface Position {
  id: string;
  officerId: string;
  officerName?: string;
  officerRankLabel?: string;
  officerMilitaryId?: string;
  positionTitle: string;
  positionType: PositionType;
  substituteForOfficerId?: string;
  substituteForOfficerName?: string;
  substituteRankLabel?: string;
  substituteMilitaryId?: string;
  startDate: Date | string;
  endDate?: Date | string | null;
  orderNumber?: string;
  status: PositionStatus;
  notes?: string;
  createdBy: string;
  createdAt: Date | string;
}

// Helper function to format date for display
function formatDate(date: Date | string): string {
  if (!date) return "";
  const d = typeof date === "string" ? new Date(date) : date;
  return `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getFullYear()}`;
}


export function PositionAssignmentTable({
  positions,
  total,
  page,
  limit,
  onPageChange,
  onLimitChange,
  onEditPosition,
}: {
  positions: Position[];
  officers: OfficerOption[];
  total: number;
  page: number;
  limit: number;
  onPageChange: (page: number) => void;
  onLimitChange: (limit: number) => void;
  onOfficerFilterChange: (officerId: string) => void;
  onStatusFilterChange: (status: string) => void;
  onEditPosition: (position: Position) => void;
  officerFilter: string;
  statusFilter: string;
}) {
  const columns: TableColumn<Position>[] = [
    {
      header: "الضابط",
      accessor: "officerName",
      cellAlign: "right" as const,
      headerAlign: "right" as const,
      render: (value: unknown, row: Position) => {
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
      header: "المسمى الوظيفي",
      accessor: "positionTitle",
      cellAlign: "right" as const,
      headerAlign: "right" as const,
      render: (value: unknown, row: Position) => (
        <div className="flex flex-col">
          <span className="font-bold text-(--app-foreground)">{value as string}</span>
          {row.positionType === "substitute" && row.substituteForOfficerName && (
            <span className="text-xs font-bold text-amber-600 dark:text-amber-400 flex items-center gap-1 mt-1">
              <UserPlus className="h-3 w-3" />
              بديل عن: {row.substituteRankLabel ? `${row.substituteRankLabel} / ` : ""}{row.substituteForOfficerName}
            </span>
          )}
        </div>
      )
    },
    {
      header: "النوع",
      accessor: "positionType",
      cellAlign: "center" as const,
      headerAlign: "center" as const,
      render: (value: unknown) => (
        <Badge variant="outline" className={(value as string) === "primary" ? "border-(--app-info)/30 text-(--app-info) bg-(--app-info)/10 text-xs font-bold" : "border-amber-500/30 text-amber-600 dark:text-amber-400 bg-amber-500/10 text-xs font-bold"}>
          {(value as string) === "primary" ? "أساسي" : "بديل"}
        </Badge>
      ),
    },
    {
      header: "الفترة",
      accessor: "startDate",
      cellAlign: "center" as const,
      headerAlign: "center" as const,
      render: (_: unknown, row: Position) => (
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
          className={`${getStatusBadgeClass(value as PositionStatus)} text-[10px] font-bold px-2.5 py-1 rounded-lg border-none`}
        >
          {getPositionStatusLabel(value as PositionStatus)}
        </Badge>
      ),
    },
    {
      header: "الإجراءات",
      accessor: undefined,
      cellAlign: "center" as const,
      headerAlign: "center" as const,
      className: "w-[80px]",
      render: (_: unknown, row: Position) => (
        <div className="flex items-center justify-center gap-1.5" onClick={(e) => e.stopPropagation()}>
          <ActionButton
            icon={<Edit className="h-4 w-4" />}
            color="btn-action-info"
            title="تعديل التعيين الوظيفي"
            onClick={() => onEditPosition(row)}
          />
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-4">

      {/* Table section */}
      <MainTable<Position>
        columns={columns}
        data={positions}
        showSerialNumber={true}
        emptyTitle="لا يوجد تعيينات وظيفية مسجلة حالياً"
        emptyDescription="حاول تغيير خيارات البحث أو أضف تعيين جديد"
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
