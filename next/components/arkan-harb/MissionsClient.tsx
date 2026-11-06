"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import MainTable, { type TableColumn } from "@/components/ui/Table";
import { Badge } from "@/components/ui/badge";
import { ActionButton } from "@/components/officers/OfficersTable";
import { getMissionStatusLabel } from "@/lib/utils/status-badge";
import { formatDateDisplay } from "@/lib/utils/date-display";
import {
  Printer,
  Clock,
  CheckCircle2,
  XCircle,
  Edit,
  Eye,
} from "lucide-react";
import { MissionForm } from "./MissionForm";
import { MissionCompleteModal } from "./MissionCompleteModal";
import { MissionDetailModal } from "./MissionDetailModal";
import { MissionActionModal } from "./MissionActionModal";
import { MissionsArchiveModal } from "./MissionsArchiveModal";
import { MissionsPrintReport } from "./MissionsPrintReport";
import { TravelOrderModal } from "./TravelOrderModal";
import type { Mission, MissionStatus } from "./MissionsTable";
import type { OfficerOption } from "@/types";

interface MissionsClientProps {
  ongoingMissions?: Mission[];
  tomorrowMissions: Mission[];
  todayMissions: Mission[];
  yesterdayMissions: Mission[];
  canEdit: boolean;
  isAdmin?: boolean;
  hideHeader?: boolean;
  officers?: OfficerOption[];
  unitName?: string;
}

export function MissionsClient({
  ongoingMissions = [],
  tomorrowMissions = [],
  todayMissions = [],
  yesterdayMissions = [],
  canEdit,
  isAdmin = false,
  hideHeader = false,
  officers = [],
  unitName,
}: MissionsClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const searchQuery = (searchParams.get("search") || "").trim().toLowerCase();

  // Modals state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isArchiveOpen, setIsArchiveOpen] = useState(false);
  const [selectedMission, setSelectedMission] = useState<Mission | null>(null);
  const [completeMission, setCompleteMission] = useState<Mission | null>(null);
  const [detailMission, setDetailMission] = useState<Mission | null>(null);
  const [actionTarget, setActionTarget] = useState<{ mission: Mission; type: "postpone" | "cancel" } | null>(null);
  const [travelOrderMission, setTravelOrderMission] = useState<Mission | null>(null);

  // Filter helper matching search query across all military and mission fields
  const matchSearch = useMemo(() => {
    return (m: Mission) => {
      if (!searchQuery) return true;
      const name = (m.officerName || m.officerLabel || "").toLowerCase();
      const rank = (m.officerRankLabel || "").toLowerCase();
      const milId = (m.officerMilitaryId || "").toLowerCase();
      const title = (m.title || "").toLowerCase();
      const dest = (m.destination || "").toLowerCase();
      const desc = (m.description || "").toLowerCase();
      const reason = (m.statusReason || "").toLowerCase();

      return (
        name.includes(searchQuery) ||
        rank.includes(searchQuery) ||
        milId.includes(searchQuery) ||
        title.includes(searchQuery) ||
        dest.includes(searchQuery) ||
        desc.includes(searchQuery) ||
        reason.includes(searchQuery)
      );
    };
  }, [searchQuery]);

  const filteredOngoing = useMemo(() => ongoingMissions.filter(matchSearch), [ongoingMissions, matchSearch]);
  const filteredTomorrow = useMemo(() => tomorrowMissions.filter(matchSearch), [tomorrowMissions, matchSearch]);
  const filteredToday = useMemo(() => todayMissions.filter(matchSearch), [todayMissions, matchSearch]);
  const filteredYesterday = useMemo(() => yesterdayMissions.filter(matchSearch), [yesterdayMissions, matchSearch]);

  // Window custom events from PageHeader
  useEffect(() => {
    const onOpenArchive = () => setIsArchiveOpen(true);
    const onOpenCreate = () => {
      setSelectedMission(null);
      setIsCreateOpen(true);
    };
    const onPrintReport = () => window.print();

    window.addEventListener("open-missions-archive", onOpenArchive);
    window.addEventListener("open-create-mission", onOpenCreate);
    window.addEventListener("print-missions-report", onPrintReport);

    return () => {
      window.removeEventListener("open-missions-archive", onOpenArchive);
      window.removeEventListener("open-create-mission", onOpenCreate);
      window.removeEventListener("print-missions-report", onPrintReport);
    };
  }, []);

  const handleEdit = (mission: Mission) => {
    setSelectedMission(mission);
    setIsCreateOpen(true);
  };

  const handleSave = () => {
    setIsCreateOpen(false);
    setSelectedMission(null);
    router.refresh();
  };

  // Reusable columns definition generator
  const getColumns = (type: "tomorrow" | "today" | "yesterday" | "ongoing"): TableColumn<Mission>[] => [
    {
      header: "عنوان المأمورية",
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
      render: (value: unknown) => (
        <span className="text-xs font-bold text-(--app-muted-foreground)">
          {(value as string) || "ـ"}
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
      header: "الحالة",
      accessor: "status",
      cellAlign: "center",
      headerAlign: "center",
      render: (value: unknown, row: Mission) => (
        <div className="flex flex-col items-center gap-1">
          <Badge
            variant="secondary"
            className="bg-(--app-surface-container) text-(--app-muted-foreground) border border-(--app-border) text-[10px] font-bold px-2 py-0.5 rounded-lg"
          >
            {getMissionStatusLabel(value as MissionStatus)}
          </Badge>
          {row.statusReason && (
            <span className="text-[10px] text-(--app-muted-foreground)/70 line-clamp-1 max-w-[120px]" title={row.statusReason}>
              {row.statusReason}
            </span>
          )}
        </div>
      ),
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
          {canEdit && row.status !== "completed" && row.status !== "cancelled" && (
            <>
              {(type === "today" || type === "ongoing") && (
                <ActionButton
                  icon={<CheckCircle2 className="h-3.5 w-3.5 text-(--color-primary) hover:text-(--app-info)" />}
                  color="btn-action-primary"
                  title="إكمال وتوثيق التقرير"
                  onClick={() => setCompleteMission(row)}
                />
              )}
              <ActionButton
                icon={<Clock className="h-3.5 w-3.5 text-(--color-primary) hover:text-(--app-info)" />}
                color="btn-action-primary"
                title="تأجيل المأمورية"
                onClick={() => setActionTarget({ mission: row, type: "postpone" })}
              />
              <ActionButton
                icon={<XCircle className="h-3.5 w-3.5 text-(--color-primary) hover:text-(--app-info)" />}
                color="btn-action-primary"
                title="إلغاء المأمورية"
                onClick={() => setActionTarget({ mission: row, type: "cancel" })}
              />
            </>
          )}
          {canEdit && (
            <ActionButton
              icon={<Edit className="h-3.5 w-3.5 text-(--color-primary) hover:text-(--app-info)" />}
              color="btn-action-primary"
              title="تعديل المأمورية"
              onClick={() => handleEdit(row)}
            />
          )}
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
    <div className="space-y-8">
      {/* Interactive view (hidden during print) */}
      <div className="space-y-8 print:hidden">
        {/* ---------------------------------------------------- */}
        {/* 0. TABLE 0: بيان المأموريات الممتدة والجارية */}
        {/* ---------------------------------------------------- */}
        {ongoingMissions.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-1.5 h-4 bg-(--color-primary) rounded-full" />
                <h2 className="text-base font-black text-(--color-primary) flex items-center gap-2">
                  <span>بيان المأموريات الممتدة والجارية</span>
                  <span className="text-xs px-2.5 py-0.5 rounded-full bg-(--app-surface-container) border border-(--app-border) text-(--app-muted-foreground) font-bold">
                    {filteredOngoing.length !== ongoingMissions.length
                      ? `${filteredOngoing.length} من ${ongoingMissions.length} مأمورية`
                      : `${ongoingMissions.length} مأمورية`}
                  </span>
                </h2>
              </div>
              <span className="text-xs font-bold text-(--app-muted-foreground) bg-(--app-surface-container) px-2.5 py-1 rounded-lg border border-(--app-border)">
                المستمرة والمتعددة الأيام
              </span>
            </div>

            <MainTable<Mission>
              columns={getColumns("ongoing")}
              data={filteredOngoing}
              showSerialNumber={true}
              emptyTitle="لا توجد مأموريات ممتدة جارية حالياً"
              emptyDescription={searchQuery ? "لا توجد نتائج مطابقة لبحثك في المأموريات الممتدة" : "لا يوجد ضباط في مأموريات ممتدة جارية"}
            />
          </div>
        )}

        {/* ---------------------------------------------------- */}
        {/* 1. TABLE 1: بيان مأموريات باكر */}
        {/* ---------------------------------------------------- */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-1.5 h-4 bg-(--color-primary) rounded-full" />
              <h2 className="text-base font-black text-(--color-primary) flex items-center gap-2">
                <span>بيان مأموريات باكر</span>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-(--app-surface-container) border border-(--app-border) text-(--app-muted-foreground) font-bold">
                  {filteredTomorrow.length !== tomorrowMissions.length
                    ? `${filteredTomorrow.length} من ${tomorrowMissions.length} مأمورية`
                    : `${tomorrowMissions.length} مأمورية`}
                </span>
              </h2>
            </div>
            <span className="text-xs font-bold text-(--app-muted-foreground) bg-(--app-surface-container) px-2.5 py-1 rounded-lg border border-(--app-border)">
              المجدولة لباكر
            </span>
          </div>

          <MainTable<Mission>
            columns={getColumns("tomorrow")}
            data={filteredTomorrow}
            showSerialNumber={true}
            emptyTitle="لا توجد مأموريات مجدولة لباكر"
            emptyDescription={searchQuery ? "لا توجد نتائج مطابقة لبحثك في مأموريات باكر" : "يمكنك إضافة مأمورية جديدة لباكر باستخدام زر الإضافة أعلاه"}
          />
        </div>

        {/* ---------------------------------------------------- */}
        {/* 2. TABLE 2: بيان مأموريات اليوم */}
        {/* ---------------------------------------------------- */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-1.5 h-4 bg-(--color-primary) rounded-full" />
              <h2 className="text-base font-black text-(--color-primary) flex items-center gap-2">
                <span>بيان مأموريات اليوم</span>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-(--app-surface-container) border border-(--app-border) text-(--app-muted-foreground) font-bold">
                  {filteredToday.length !== todayMissions.length
                    ? `${filteredToday.length} من ${todayMissions.length} مأمورية`
                    : `${todayMissions.length} مأمورية`}
                </span>
              </h2>
            </div>
            <span className="text-xs font-bold text-(--app-muted-foreground) bg-(--app-surface-container) px-2.5 py-1 rounded-lg border border-(--app-border)">
              الجارية والنشطة
            </span>
          </div>

          <MainTable<Mission>
            columns={getColumns("today")}
            data={filteredToday}
            showSerialNumber={true}
            emptyTitle="لا توجد مأموريات نشطة اليوم"
            emptyDescription={searchQuery ? "لا توجد نتائج مطابقة لبحثك في مأموريات اليوم" : "لا يوجد ضباط في مأموريات جارية في هذا اليوم"}
          />
        </div>

        {/* ---------------------------------------------------- */}
        {/* 3. TABLE 3: بيان مأموريات أمس */}
        {/* ---------------------------------------------------- */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-1.5 h-4 bg-(--color-primary) rounded-full" />
              <h2 className="text-base font-black text-(--color-primary) flex items-center gap-2">
                <span>بيان مأموريات أمس</span>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-(--app-surface-container) border border-(--app-border) text-(--app-muted-foreground) font-bold">
                  {filteredYesterday.length !== yesterdayMissions.length
                    ? `${filteredYesterday.length} من ${yesterdayMissions.length} مأمورية`
                    : `${yesterdayMissions.length} مأمورية`}
                </span>
              </h2>
            </div>
            <span className="text-xs font-bold text-(--app-muted-foreground) bg-(--app-surface-container) px-2.5 py-1 rounded-lg border border-(--app-border)">
              المنفذة والسابقة
            </span>
          </div>

          <MainTable<Mission>
            columns={getColumns("yesterday")}
            data={filteredYesterday}
            showSerialNumber={true}
            emptyTitle="لا توجد مأموريات مسجلة لأمس"
            emptyDescription={searchQuery ? "لا توجد نتائج مطابقة لبحثك في مأموريات أمس" : "لم يتم تسجيل أي مأموريات بتاريخ أمس"}
          />
        </div>
      </div>

      {/* Hidden printable sheet for missions (renders on paper when printed) */}
      <MissionsPrintReport
        ongoingMissions={ongoingMissions}
        tomorrowMissions={tomorrowMissions}
        todayMissions={todayMissions}
        yesterdayMissions={yesterdayMissions}
        unitName={unitName}
      />

      {/* Modals */}
      <MissionsArchiveModal
        isOpen={isArchiveOpen}
        onClose={() => setIsArchiveOpen(false)}
        canEdit={canEdit}
        isAdmin={isAdmin}
        officers={officers}
      />

      <MissionCompleteModal
        mission={completeMission}
        isOpen={!!completeMission}
        onClose={() => setCompleteMission(null)}
        onSuccess={() => {
          setCompleteMission(null);
          router.refresh();
        }}
      />

      <MissionDetailModal
        mission={detailMission}
        isOpen={!!detailMission}
        isAdmin={isAdmin}
        onClose={() => setDetailMission(null)}
        onSuccess={() => {
          setDetailMission(null);
          router.refresh();
        }}
        onEdit={canEdit ? handleEdit : undefined}
      />

      <MissionActionModal
        mission={actionTarget?.mission ?? null}
        actionType={actionTarget?.type ?? null}
        isOpen={!!actionTarget}
        onClose={() => setActionTarget(null)}
        onSuccess={() => {
          setActionTarget(null);
          router.refresh();
        }}
      />

      <MissionForm
        mission={selectedMission}
        officers={officers}
        isOpen={isCreateOpen}
        onClose={() => {
          setIsCreateOpen(false);
          setSelectedMission(null);
        }}
        onSave={handleSave}
      />

      <TravelOrderModal
        mission={travelOrderMission}
        isOpen={!!travelOrderMission}
        onClose={() => setTravelOrderMission(null)}
        unitName={unitName}
      />
    </div>
  );
}
