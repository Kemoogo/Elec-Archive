"use client";

import { useState } from "react";
import MainTable, { type TableColumn } from "@/components/ui/Table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Paginator } from "@/components/ui/paginator";
import { getMissionStatusLabel } from "@/lib/utils/status-badge";
import { Edit, Printer, CheckCircle2, Clock, XCircle } from "lucide-react";
import { ActionButton } from "@/components/officers/OfficersTable";
import { MissionCompleteModal } from "./MissionCompleteModal";
import { MissionActionModal } from "./MissionActionModal";
import { MissionDetailModal } from "./MissionDetailModal";
import { TravelOrderModal } from "./TravelOrderModal";
import { formatDateDisplay } from "@/lib/utils/date-display";

export type MissionStatus = "scheduled" | "active" | "completed" | "cancelled" | "postponed";

export interface Mission {
  id: string;
  officerId: string;
  officerName?: string;
  officerRankLabel?: string;
  officerLabel?: string;
  officerMilitaryId?: string;
  missionType?: "internal_daily" | "external_multiday";
  title: string;
  description?: string;
  destination?: string;
  startDate: Date | string;
  endDate?: Date | string | null;
  status: MissionStatus;
  statusReason?: string;
  resultSummary?: string;
  linkedFaxId?: string;
  linkedFax?: { _id: string; faxNumber?: string; subject?: string } | string;
  travelOrderNumber?: string;
  transportationMean?: string;
  authorizedWeapons?: string;
  clearanceDocuments?: Array<{ fileName?: string; name?: string; fileUrl: string; uploadedAt?: string | Date }>;
  completedAt?: Date | string;
  createdBy: string;
  createdAt: Date | string;
}

// Helper function to format date for display
function formatDate(date: Date | string | null | undefined): string {
  if (!date) return "";
  return formatDateDisplay(date);
}


export function MissionsTable({
  missions,
  total,
  page,
  limit,
  canEdit = false,
  isAdmin = false,
  onPageChange,
  onLimitChange,
  onEditMission,
}: {
  missions: Mission[];
  total: number;
  page: number;
  limit: number;
  canEdit?: boolean;
  isAdmin?: boolean;
  onPageChange: (page: number) => void;
  onLimitChange: (limit: number) => void;
  onOfficerFilterChange: (officerId: string) => void;
  onStatusFilterChange: (status: string) => void;
  onEditMission: (mission: Mission) => void;
  officerFilter: string;
  statusFilter: string;
}) {
  const [completeMission, setCompleteMission] = useState<Mission | null>(null);
  const [detailMission, setDetailMission] = useState<Mission | null>(null);
  const [actionTarget, setActionTarget] = useState<{ mission: Mission; type: "postpone" | "cancel" } | null>(null);
  const [travelOrderMission, setTravelOrderMission] = useState<Mission | null>(null);

  const columns: TableColumn<Mission>[] = [
    {
      header: "عنوان المأمورية",
      accessor: "title",
      cellAlign: "right",
      headerAlign: "right",
      render: (value: unknown, row: Mission) => (
        <div className="flex flex-col text-right">
          <button
            type="button"
            onClick={() => setDetailMission(row)}
            className="font-black text-xs text-(--color-primary) hover:underline hover:text-(--app-info) text-right cursor-pointer transition-colors"
          >
            {value as string}
          </button>
        </div>
      ),
    },
    {
      header: "الرتبة",
      accessor: "officerRankLabel",
      cellAlign: "center",
      headerAlign: "center",
      render: (_: unknown, row: Mission) => (
        <span className="font-bold text-xs text-(--app-muted-foreground)">
          {row.officerRankLabel || "ـ"}
        </span>
      ),
    },
    {
      header: "الاسم",
      accessor: "officerName",
      cellAlign: "right",
      headerAlign: "right",
      render: (_: unknown, row: Mission) => (
        <span className="text-xs font-bold text-(--app-muted-foreground)">
          {row.officerName || row.officerLabel || "ضابط غير معروف"}
        </span>
      ),
    },
    {
      header: "الجهة المقصودة",
      accessor: "destination",
      cellAlign: "center",
      headerAlign: "center",
    },
    {
      header: "الفترة ونوع المأمورية",
      accessor: "startDate",
      cellAlign: "center",
      headerAlign: "center",
      render: (_: unknown, row: Mission) => {
        const isMultiDay = Boolean(
          row.endDate &&
          formatDate(row.startDate) !== formatDate(row.endDate) &&
          new Date(row.endDate) > new Date(row.startDate)
        );

        return (
          <div className="flex flex-col items-center gap-1 text-xs font-bold">
            <Badge
              variant="outline"
              className="bg-(--app-surface-container) text-(--app-muted-foreground) border-(--app-border) text-[10px] py-0 px-2 font-bold"
            >
              {isMultiDay ? "مأمورية ممتدة" : "مأمورية"}
            </Badge>
            <div className="flex flex-col items-center">
              <span className="font-bold text-xs text-(--app-muted-foreground)">{formatDate(row.startDate)}</span>
              {row.endDate && (
                <span className="text-[10px] font-medium text-(--app-muted-foreground) mt-0.5">
                  حتى {formatDate(row.endDate)}
                </span>
              )}
            </div>
          </div>
        );
      },
    },
    {
      header: "الحالة",
      accessor: "status",
      cellAlign: "center",
      headerAlign: "center",
      render: (value: unknown, row: Mission) => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const parseDate = (d: Date | string | null | undefined) => {
          if (!d) return null;
          if (typeof d === "string") {
            const [y, m, day] = d.split("T")[0].split("-").map(Number);
            return new Date(y, m - 1, day);
          }
          return new Date(d.getFullYear(), d.getMonth(), d.getDate());
        };

        const startDate = parseDate(row.startDate);
        const endDate = parseDate(row.endDate) || startDate;

        const isCurrentlyActive =
          (row.status === "active" || row.status === "scheduled") &&
          startDate !== null &&
          today >= startDate &&
          (endDate === null || today <= endDate);

        return (
          <div className="flex flex-col items-center gap-1">
            <Badge
              variant="secondary"
              className="bg-(--app-surface-container) text-(--app-muted-foreground) border border-(--app-border) text-[10px] font-bold px-2.5 py-1 rounded-lg"
            >
              {getMissionStatusLabel(value as MissionStatus)}
            </Badge>

            {isCurrentlyActive && (
              <div className="flex items-center gap-1.5 text-[10px] font-bold text-(--app-muted-foreground) bg-(--app-surface-container) border border-(--app-border) px-2 py-0.5 rounded-full mt-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-(--color-primary) animate-pulse" />
                <span>سارٍ بالتمام اليومي</span>
              </div>
            )}

            {row.statusReason && (
              <span
                className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold line-clamp-1 max-w-[130px]"
                title={row.statusReason}
              >
                السبب: {row.statusReason}
              </span>
            )}
          </div>
        );
      },
    },
    {
      header: "الإجراءات",
      cellAlign: "left",
      headerAlign: "left",
      minWidth: true,
      render: (_: unknown, row: Mission) => (
        <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
          {canEdit && row.status !== "completed" && row.status !== "cancelled" && (
            <>
              <ActionButton
                icon={<CheckCircle2 className="h-4 w-4 text-(--color-primary) hover:text-(--app-info)" />}
                color="btn-action-primary"
                title="إكمال وتوثيق التقرير"
                onClick={() => setCompleteMission(row)}
              />
              <ActionButton
                icon={<Clock className="h-4 w-4 text-(--color-primary) hover:text-(--app-info)" />}
                color="btn-action-primary"
                title="تأجيل المأمورية"
                onClick={() => setActionTarget({ mission: row, type: "postpone" })}
              />
              <ActionButton
                icon={<XCircle className="h-4 w-4 text-(--color-primary) hover:text-(--app-info)" />}
                color="btn-action-primary"
                title="إلغاء المأمورية"
                onClick={() => setActionTarget({ mission: row, type: "cancel" })}
              />
            </>
          )}
          {canEdit && (
            <ActionButton
              icon={<Edit className="h-4 w-4 text-(--color-primary) hover:text-(--app-info)" />}
              color="btn-action-primary"
              title="تعديل المهمة"
              onClick={() => onEditMission(row)}
            />
          )}
          <ActionButton
            icon={<Printer className="h-4 w-4 text-(--color-primary) hover:text-(--app-info)" />}
            color="btn-action-primary"
            title="طباعة أمر التحرك وخط السير"
            onClick={() => setTravelOrderMission(row)}
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

      {/* Modals */}
      <MissionCompleteModal
        mission={completeMission}
        isOpen={!!completeMission}
        onClose={() => setCompleteMission(null)}
        onSuccess={() => window.location.reload()}
      />

      <MissionDetailModal
        mission={detailMission}
        isOpen={!!detailMission}
        isAdmin={isAdmin}
        onClose={() => setDetailMission(null)}
        onSuccess={() => window.location.reload()}
        onEdit={canEdit ? onEditMission : undefined}
      />

      <MissionActionModal
        mission={actionTarget?.mission ?? null}
        actionType={actionTarget?.type ?? null}
        isOpen={!!actionTarget}
        onClose={() => setActionTarget(null)}
        onSuccess={() => window.location.reload()}
      />

      <TravelOrderModal
        mission={travelOrderMission}
        isOpen={!!travelOrderMission}
        onClose={() => setTravelOrderMission(null)}
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
