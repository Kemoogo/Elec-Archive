"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import MainTable, { type TableColumn } from "@/components/ui/Table";
import { Badge } from "@/components/ui/badge";
import { ActionButton } from "@/components/officers/OfficersTable";
import { formatDateDisplay } from "@/lib/utils/date-display";
import { getMissionStatusLabel } from "@/lib/utils/status-badge";
import {
  Eye,
  FileText,
  Printer,
  FileCheck,
} from "lucide-react";
import { MissionDetailModal } from "@/components/arkan-harb/MissionDetailModal";
import { TravelOrderModal } from "@/components/arkan-harb/TravelOrderModal";
import type { Mission, MissionStatus } from "@/components/arkan-harb/MissionsTable";

interface OfficerMissionsTabProps {
  officerId: string;
  officerName: string;
  missions: Mission[];
}

export function OfficerMissionsTab({
  officerId,
  officerName,
  missions = [],
}: OfficerMissionsTabProps) {
  const router = useRouter();
  const [detailMission, setDetailMission] = useState<Mission | null>(null);
  const [travelOrderMission, setTravelOrderMission] = useState<Mission | null>(null);

  // Summary statistics
  const totalMissions = missions.length;
  const completedMissions = missions.filter((m) => m.status === "completed").length;
  const activeMissions = missions.filter((m) => m.status === "active" || m.status === "scheduled").length;
  const coursesCount = missions.filter(
    (m) => m.title.includes("فرقة") || m.title.includes("دورة")
  ).length;

  const columns: TableColumn<Mission>[] = [
    {
      header: "عنوان وموضوع المأمورية",
      accessor: "title",
      cellAlign: "right",
      headerAlign: "right",
      render: (value: unknown, row: Mission) => (
        <button
          type="button"
          onClick={() => setDetailMission(row)}
          className="font-black text-xs text-(--color-primary) hover:underline hover:text-(--app-info) text-right cursor-pointer transition-colors"
        >
          {value as string}
        </button>
      ),
    },
    {
      header: "النوع",
      accessor: "missionType",
      cellAlign: "center",
      headerAlign: "center",
      render: (_: unknown, row: Mission) => {
        const isCourse = row.title.includes("فرقة") || row.title.includes("دورة");
        const isTravelAbroad = row.title.includes("سفر");
        const isMultiDay = Boolean(
          row.endDate &&
            formatDateDisplay(row.startDate) !== formatDateDisplay(row.endDate)
        );

        let label = "مأمورية خارجية";
        if (isCourse) label = "فرقة / دورة";
        else if (isTravelAbroad) label = "سفر للخارج";
        else if (row.missionType === "internal_daily") label = "مأمورية يومية";
        else if (isMultiDay) label = "مأمورية ممتدة";

        return (
          <span className="px-2 py-0.5 rounded-lg bg-(--app-surface-container) border border-(--app-border) text-[11px] font-bold text-(--app-muted-foreground)">
            {label}
          </span>
        );
      },
    },
    {
      header: "الجهة / الوجهة",
      accessor: "destination",
      cellAlign: "center",
      headerAlign: "center",
      render: (val: unknown) => (
        <span className="text-xs font-bold text-(--app-muted-foreground)">
          {(val as string) || "ـ"}
        </span>
      ),
    },
    {
      header: "الفترة والتاريخ",
      accessor: "startDate",
      cellAlign: "center",
      headerAlign: "center",
      render: (_: unknown, row: Mission) => {
        const isMultiDay = Boolean(
          row.endDate &&
            formatDateDisplay(row.startDate) !== formatDateDisplay(row.endDate)
        );

        return (
          <div className="flex flex-col items-center gap-0.5 text-xs font-bold text-(--app-muted-foreground)">
            <span>{formatDateDisplay(row.startDate)}</span>
            {row.endDate && isMultiDay && (
              <span className="text-[10px] text-(--app-muted-foreground)/80">
                حتى {formatDateDisplay(row.endDate)}
              </span>
            )}
          </div>
        );
      },
    },
    {
      header: "أمر التحرك",
      accessor: "travelOrderNumber",
      cellAlign: "center",
      headerAlign: "center",
      render: (val: unknown) => (
        <span className="text-xs font-mono font-bold text-(--app-muted-foreground)">
          {(val as string) || "ـ"}
        </span>
      ),
    },
    {
      header: "الحالة",
      accessor: "status",
      cellAlign: "center",
      headerAlign: "center",
      render: (val: unknown, row: Mission) => (
        <div className="flex flex-col items-center gap-1">
          <Badge
            variant="secondary"
            className="bg-(--app-surface-container) text-(--app-muted-foreground) border border-(--app-border) text-[10px] font-bold px-2 py-0.5 rounded-lg"
          >
            {getMissionStatusLabel(val as MissionStatus)}
          </Badge>
          {row.statusReason && (
            <span className="text-[10px] text-(--app-muted-foreground)/70 line-clamp-1 max-w-[120px]">
              {row.statusReason}
            </span>
          )}
        </div>
      ),
    },
    {
      header: "المستندات",
      cellAlign: "center",
      headerAlign: "center",
      render: (_: unknown, row: Mission) => {
        const hasClearance = row.clearanceDocuments && row.clearanceDocuments.length > 0;
        const hasFax = Boolean(row.linkedFax || row.linkedFaxId);

        return (
          <div className="flex items-center justify-center gap-1.5 text-xs">
            {hasClearance && (
              <span title="يوجد إخلاء طرف موثق" className="p-1 rounded-md bg-(--app-surface-container) border border-(--app-border) text-(--app-muted-foreground)">
                <FileCheck className="w-3.5 h-3.5 text-(--app-muted-foreground)" />
              </span>
            )}
            {hasFax && (
              <span title="مرتبط بفاكس رسمي" className="p-1 rounded-md bg-(--app-surface-container) border border-(--app-border) text-(--app-muted-foreground)">
                <FileText className="w-3.5 h-3.5 text-(--app-muted-foreground)" />
              </span>
            )}
            {!hasClearance && !hasFax && <span className="text-(--app-muted-foreground)">ـ</span>}
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
        <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
          <ActionButton
            icon={<Eye className="h-3.5 w-3.5 text-(--color-primary) hover:text-(--app-info)" />}
            color="btn-action-primary"
            title="عرض التفاصيل"
            onClick={() => setDetailMission(row)}
          />
          <ActionButton
            icon={<Printer className="h-3.5 w-3.5 text-(--color-primary) hover:text-(--app-info)" />}
            color="btn-action-primary"
            title="طباعة أمر التحرك"
            onClick={() => setTravelOrderMission(row)}
          />
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Top Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-4 bg-(--app-surface-container) border border-(--app-border) rounded-2xl space-y-1">
          <span className="text-[11px] font-bold text-(--app-muted-foreground)">إجمالي المأموريات</span>
          <p className="text-xl font-black text-(--color-primary)">{totalMissions}</p>
        </div>

        <div className="p-4 bg-(--app-surface-container) border border-(--app-border) rounded-2xl space-y-1">
          <span className="text-[11px] font-bold text-(--app-muted-foreground)">المأموريات النشطة / المجدولة</span>
          <p className="text-xl font-black text-(--color-primary)">{activeMissions}</p>
        </div>

        <div className="p-4 bg-(--app-surface-container) border border-(--app-border) rounded-2xl space-y-1">
          <span className="text-[11px] font-bold text-(--app-muted-foreground)">المأموريات المنفذة</span>
          <p className="text-xl font-black text-(--color-primary)">{completedMissions}</p>
        </div>

        <div className="p-4 bg-(--app-surface-container) border border-(--app-border) rounded-2xl space-y-1">
          <span className="text-[11px] font-bold text-(--app-muted-foreground)">الفرق والدورات التخصصية</span>
          <p className="text-xl font-black text-(--color-primary)">{coursesCount}</p>
        </div>
      </div>

      {/* Missions Table */}
      <MainTable<Mission>
        columns={columns}
        data={missions}
        showSerialNumber={true}
        emptyTitle="لا توجد مأموريات مسجلة لهذا الضابط"
        emptyDescription="لم يتم تكليف السيد الضابط بأي مأموريات أو فرق أو سفريات بعد"
      />

      {/* Modals */}
      <MissionDetailModal
        mission={detailMission}
        isOpen={!!detailMission}
        isAdmin={false}
        onClose={() => setDetailMission(null)}
        onSuccess={() => {
          setDetailMission(null);
          router.refresh();
        }}
      />

      <TravelOrderModal
        mission={travelOrderMission}
        isOpen={!!travelOrderMission}
        onClose={() => setTravelOrderMission(null)}
      />
    </div>
  );
}
