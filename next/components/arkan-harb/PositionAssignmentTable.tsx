"use client";

import MainTable, { type TableColumn } from "@/components/ui/Table";
import { Badge } from "@/components/ui/badge";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ChevronDown, Edit, User, UserPlus } from "lucide-react";

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
  positionTitle: string;
  positionType: PositionType;
  substituteForOfficerId?: string;
  substituteForOfficerName?: string;
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

// Helper function to get status badge class
function getStatusBadgeClass(status: PositionStatus): string {
  switch (status) {
    case "active":
      return "bg-green-100 text-green-800";
    case "ended":
      return "bg-slate-100 text-(--app-foreground)";
    default:
      return "bg-slate-100 text-(--app-foreground)";
  }
}

// Helper function to get status label in Arabic
function getStatusLabel(status: PositionStatus): string {
  switch (status) {
    case "active":
      return "ساري";
    case "ended":
      return "منتهي";
    default:
      return status;
  }
}

export function PositionAssignmentTable({
  positions,
  officers,
  total,
  page,
  limit,
  onPageChange,
  onLimitChange,
  onOfficerFilterChange,
  onStatusFilterChange,
  onEditPosition,
  officerFilter,
  statusFilter,
  isLoading = false,
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
  isLoading?: boolean;
}) {
  const [showFilters, setShowFilters] = useState(false);

  const columns: TableColumn<Position>[] = [
    {
      header: "الضابط",
      accessor: "officerName",
      cellAlign: "right" as const,
      headerAlign: "right" as const,
      render: (value: unknown) => (
        <div className="flex items-center gap-2">
          <User className="h-4 w-4 text-(--app-muted-foreground)" />
          <div className="flex flex-col">
            <span className="text-sm font-bold text-foreground">{(value as string) || "غير معروف"}</span>
          </div>
        </div>
      ),
    },
    {
      header: "المسمى الوظيفي",
      accessor: "positionTitle",
      cellAlign: "right" as const,
      headerAlign: "right" as const,
      render: (value: unknown, row: Position) => (
        <div className="flex flex-col">
          <span className="font-bold">{value as string}</span>
          {row.positionType === "substitute" && row.substituteForOfficerName && (
            <span className="text-xs text-amber-600 flex items-center gap-1 mt-1">
              <UserPlus className="h-3 w-3" />
              بديل عن: {row.substituteForOfficerName}
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
        <Badge variant="outline" className={(value as string) === "primary" ? "border-blue-200 text-blue-700 bg-blue-50" : "border-amber-200 text-amber-700 bg-amber-50"}>
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
          className={`${getStatusBadgeClass(value as PositionStatus)} text-[10px] font-bold px-2 py-0.5 border-none`}
        >
          {getStatusLabel(value as PositionStatus)}
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
        <Button
          variant="ghost"
          size="icon"
          onClick={() => onEditPosition(row)}
          className="h-8 w-8 text-(--color-primary) hover:text-(--color-primary) hover:bg-(--color-primary)/10"
          title="تعديل"
        >
          <Edit className="h-4 w-4" />
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-4">

      {/* Table section */}
      <div className="border border-(--app-border) rounded-2xl overflow-hidden bg-(--app-surface) shadow-sm">
        <MainTable<Position>
          columns={columns}
          data={positions}
          showSerialNumber={true}
          theadClassName="bg-slate-50 border-b border-(--app-border)"
          thClassName="px-4 py-3 text-[10px] font-black uppercase tracking-wider text-slate-500"
          tdClassName="px-4 py-4 text-sm border-b border-(--app-border)/50"
        />

        {/* Pagination section */}
        {total > 0 && (
          <div className="flex items-center justify-between p-4 bg-slate-50/50">
            <div className="text-(--app-muted-foreground) text-[10px] font-bold">
              عرض {Math.min((page - 1) * limit + 1, total)} - {Math.min(page * limit, total)} من {total} نتيجة
            </div>

            <div className="flex items-center gap-4">
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

              <div className="w-px h-4 bg-(--app-border)"></div>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onPageChange(page - 1)}
                  disabled={page <= 1}
                  className="h-8 px-3 text-[10px] font-bold rounded-xl border-(--app-border)"
                >
                  السابق
                </Button>
                <span className="text-[10px] font-black text-foreground">
                  {page} / {Math.max(1, Math.ceil(total / limit))}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onPageChange(page + 1)}
                  disabled={page >= Math.ceil(total / limit)}
                  className="h-8 px-3 text-[10px] font-bold rounded-xl border-(--app-border)"
                >
                  التالي
                </Button>
              </div>
            </div>
          </div>
        )}

        {total === 0 && !isLoading && (
          <div className="py-12 flex flex-col items-center justify-center text-center">
            <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4">
              <User className="h-8 w-8 text-slate-300" />
            </div>
            <p className="text-sm font-bold text-slate-500">لا يوجد تعيينات وظيفية مسجلة حالياً</p>
            <p className="text-xs text-slate-400 mt-1">حاول تغيير خيارات البحث أو أضف تعيين جديد</p>
          </div>
        )}
      </div>
    </div>
  );
}
