"use client";

import MainTable, { type TableColumn } from "@/components/ui/Table";
import { Badge } from "@/components/ui/badge";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ChevronDown, Edit, User } from "lucide-react";

export type MissionStatus = "scheduled" | "active" | "completed" | "cancelled";

export interface Mission {
  id: string;
  officerId: string;
  officerName?: string;
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

// Helper function to get status badge class
function getStatusBadgeClass(status: MissionStatus): string {
  switch (status) {
    case "scheduled":
      return "bg-blue-100 text-blue-800";
    case "active":
      return "bg-green-100 text-green-800";
    case "completed":
      return "bg-slate-100 text-slate-800";
    case "cancelled":
      return "bg-red-100 text-red-800";
    default:
      return "bg-slate-100 text-slate-800";
  }
}

// Helper function to get status label in Arabic
function getStatusLabel(status: MissionStatus): string {
  switch (status) {
    case "scheduled":
      return "مجدولة";
    case "active":
      return "نشطة";
    case "completed":
      return "مكتملة";
    case "cancelled":
      return "ملغاة";
    default:
      return status;
  }
}

export function MissionsTable({
  missions,
  total,
  page,
  limit,
  onPageChange,
  onLimitChange,
  onOfficerFilterChange,
  onStatusFilterChange,
  onEditMission,
  officerFilter,
  statusFilter,
  isLoading = false,
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
  isLoading?: boolean;
}) {
  const [showFilters, setShowFilters] = useState(false);
  
  const columns: TableColumn<Mission>[] = [
    {
      header: "الضابط",
      accessor: "officerName",
      cellAlign: "right" as const,
      headerAlign: "right" as const,
      render: (value: unknown, row: Mission) => {
        const val = value as string;
        return (
          <div className="flex items-center gap-2">
            <User className="h-4 w-4 text-(--app-muted-foreground)" />
            <div className="flex flex-col">
              <span className="text-sm font-bold text-(--app-foreground)">{val || "غير معروف"}</span>
              <span className="text-xs text-(--app-muted-foreground)">{row.officerId.substring(0, 8)}...</span>
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
      render: (value: unknown) => <span className="font-bold">{value as string}</span>
    },
    {
      header: "الجهة",
      accessor: "destination",
      cellAlign: "right" as const,
      headerAlign: "right" as const,
      render: (value: unknown) => (value as string | undefined) || "-",
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
          className={`${getStatusBadgeClass(value as MissionStatus)} text-[10px] font-bold px-2 py-0.5 border-none`}
        >
          {getStatusLabel(value as MissionStatus)}
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
        <Button 
          variant="ghost"
          size="icon"
          onClick={() => onEditMission(row)}
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
      {/* Filters section */}
      <div className="border border-(--app-border) rounded-2xl p-4 bg-(--app-surface) shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-4 bg-(--color-primary) rounded-full"></div>
            <h3 className="text-(--app-foreground) font-extrabold text-sm">
              أدوات البحث والفلترة
            </h3>
          </div>
          <Button 
            variant="ghost"
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
            className="h-8 text-xs font-bold text-(--app-muted-foreground)"
          >
            {showFilters ? "إخفاء الفلاتر" : "إظهار الفلاتر"}
            <ChevronDown className={`mr-2 h-4 w-4 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
          </Button>
        </div>

        {showFilters && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-in fade-in slide-in-from-top-2 duration-300">
            {/* Officer filter */}
            <div className="space-y-2">
              <label htmlFor="officer-filter" className="text-[10px] font-black uppercase tracking-wider text-(--app-muted-foreground) mr-1">
                الضابط (المعرف)
              </label>
              <input
                id="officer-filter"
                type="text"
                placeholder="أدخل معرف الضابط..."
                value={officerFilter}
                onChange={(e) => onOfficerFilterChange(e.target.value)}
                className="w-full px-4 py-2 bg-(--app-surface) border border-(--app-border) rounded-xl text-sm font-bold text-(--app-foreground) focus:outline-none focus:ring-2 focus:ring-(--color-primary)/20 focus:border-(--color-primary) transition-all"
              />
            </div>
            
            {/* Status filter */}
            <div className="space-y-2">
              <label htmlFor="status-filter" className="text-[10px] font-black uppercase tracking-wider text-(--app-muted-foreground) mr-1">
                حالة المأمورية
              </label>
              <select
                id="status-filter"
                value={statusFilter}
                onChange={(e) => onStatusFilterChange(e.target.value)}
                className="w-full px-4 py-2 bg-(--app-surface) border border-(--app-border) rounded-xl text-sm font-bold text-(--app-foreground) focus:outline-none focus:ring-2 focus:ring-(--color-primary)/20 focus:border-(--color-primary) transition-all appearance-none"
              >
                <option value="">كل الحالات</option>
                <option value="scheduled">مجدولة</option>
                <option value="active">نشطة</option>
                <option value="completed">مكتملة</option>
                <option value="cancelled">ملغاة</option>
              </select>
            </div>
          </div>
        )}
      </div>

      {/* Table section */}
      <div className="border border-(--app-border) rounded-2xl overflow-hidden bg-(--app-surface) shadow-sm">
        <MainTable<Mission>
          columns={columns}
          data={missions}
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
                <span className="text-[10px] font-black text-(--app-foreground)">
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
            <p className="text-sm font-bold text-slate-500">لا توجد سجل مأموريات حالياً</p>
            <p className="text-xs text-slate-400 mt-1">حاول تغيير خيارات البحث أو أضف مأمورية جديدة</p>
          </div>
        )}
      </div>
    </div>
  );
}