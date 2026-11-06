"use client";

import React from "react";
import MainTable, { type TableColumn } from "@/components/ui/Table";
import { SectionWrapper } from "@/components/ui/section-wrapper";
import { ActionButton } from "@/components/officers/OfficersTable";
import { RANK_LABELS, type OfficerRank } from "@/lib/db/models/Officer.shared";
import { compareOfficers } from "@/lib/officers/seniority";
import { Edit, UserPlus, Briefcase, History, Building2, Database, AlertCircle } from "lucide-react";
import { ModalBadge } from "@/components/ui/modal-shell";
import type { PositionHistoryItem } from "./PositionHistoryModal";
import type { OfficerInfo, OfficerOption } from "@/types";

export type { OfficerInfo };

export interface PositionRowData {
  id: string;
  positionTitle: string;
  department: string;
  primaryOfficer?: OfficerInfo | null;
  substituteOfficers?: OfficerInfo[];
  hasNoSubstitute?: boolean;
  assignmentHistory?: PositionHistoryItem[];
  orderNumber?: string;
  notes?: string;
}

interface PositionAssignmentTableProps {
  viewMode: "by-position" | "by-officer";
  positions: PositionRowData[];
  officers: OfficerInfo[];
  canEdit: boolean;
  onViewPosition: (position: PositionRowData) => void;
  onEditPosition: (position: PositionRowData) => void;
  onAssignPosition?: (position: PositionRowData) => void;
  onViewHistory: (position: PositionRowData) => void;
  onDeletePosition?: (position: PositionRowData) => void;
  onSelectOfficer: (officer: OfficerInfo) => void;
}

export function extractOfficerId(officer: unknown): string {
  if (!officer) return "";
  if (typeof officer === "string") return officer.trim();
  if (typeof officer === "object" && officer !== null) {
    const obj = officer as { _id?: unknown; id?: unknown };
    if (obj._id && String(obj._id) !== "undefined" && String(obj._id) !== "null") {
      return typeof obj._id === "object" && "_id" in (obj._id as object)
        ? String((obj._id as { _id: unknown })._id)
        : String(obj._id);
    }
    if (obj.id && String(obj.id) !== "undefined" && String(obj.id) !== "null") {
      return String(obj.id);
    }
  }
  return "";
}

export function PositionAssignmentTable({
  viewMode,
  positions,
  officers,
  canEdit,
  onViewPosition,
  onEditPosition,
  onAssignPosition,
  onViewHistory,
  onDeletePosition: _onDeletePosition,
  onSelectOfficer,
}: PositionAssignmentTableProps) {
  const officerMap = React.useMemo(() => {
    const map = new Map<string, OfficerInfo>();
    (officers || []).forEach((o) => {
      const id = extractOfficerId(o);
      if (id) map.set(id, o);
    });
    return map;
  }, [officers]);

  const sortSubstituteOfficers = React.useCallback(
    (subs?: OfficerInfo[]): OfficerInfo[] => {
      if (!subs || subs.length === 0) return [];
      return [...subs].sort((a, b) => compareOfficers(a, b, officerMap));
    },
    [officerMap]
  );

  function getOfficerDisplay(officer?: OfficerInfo | null): string {
    if (!officer) return "شاغر";
    const id = extractOfficerId(officer);
    const full = officerMap.get(id) || officer;
    if (full.officerLabel) return full.officerLabel;
    const rLabel = full.rank ? RANK_LABELS[full.rank as OfficerRank] || full.rank : "";
    const arkan = full.isArkanHarb ? " أ ح" : "";
    return rLabel ? `${rLabel}${arkan} / ${full.fullName}` : full.fullName;
  }

  // -------------------------------------------------------------
  // VIEW 1: BY POSITION (Grouped Department rowSpan + Officers Table Styling)
  // -------------------------------------------------------------
  if (viewMode === "by-position") {
    if (positions.length === 0) {
      return (
        <SectionWrapper noPadding className="overflow-hidden rounded-2xl border border-(--app-border)/80 shadow-sm">
          <div className="p-12 text-center flex flex-col items-center justify-center gap-3">
            <Database className="w-12 h-12 text-slate-300 dark:text-slate-600" />
            <h3 className="text-base font-bold text-(--app-foreground)">لا توجد وظائف مسجلة</h3>
            <p className="text-xs text-(--app-muted-foreground)">لم يتم العثور على أي وظائف في الهيكل الإداري حالياً. اضغط على (+ إضافة وظيفة) للبدء.</p>
          </div>
        </SectionWrapper>
      );
    }

    // Group consecutive positions by department to calculate rowSpan
    interface DepartmentGroup {
      department: string;
      items: PositionRowData[];
    }

    const departmentGroups: DepartmentGroup[] = [];
    let currentGroup: DepartmentGroup | null = null;

    positions.forEach((pos) => {
      if (!currentGroup || currentGroup.department !== pos.department) {
        currentGroup = {
          department: pos.department,
          items: [pos],
        };
        departmentGroups.push(currentGroup);
      } else {
        currentGroup.items.push(pos);
      }
    });

    let runningSerial = 1;

    return (
      <SectionWrapper noPadding className="overflow-hidden rounded-2xl border border-(--app-border)/80 shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full table-auto min-w-full text-right border-collapse" dir="rtl">
            <thead className="bg-[var(--color-primary)] dark:bg-(--color-primary)/10 text-white dark:text-(--color-primary) border-b border-(--app-border) text-xs">
              <tr>
                <th className="px-5 py-3 text-center font-bold" style={{ width: "1%", whiteSpace: "nowrap" }}>
                  م
                </th>
                <th className="px-5 py-3 text-right font-bold" style={{ width: "1%", whiteSpace: "nowrap" }}>
                  اسم الفرع
                </th>
                <th className="px-5 py-3 text-right font-bold">الوظيفة</th>
                <th className="px-5 py-3 text-right font-bold">الضابط الأساسي</th>
                <th className="px-5 py-3 text-right font-bold">الضابط البديل</th>
                <th className="px-5 py-3 text-center font-bold" style={{ width: "1%", whiteSpace: "nowrap" }}>
                  الإجراءات
                </th>
              </tr>
            </thead>

            {departmentGroups.map((group, gIdx) => {
              const rowSpan = group.items.length;
              const firstItem = group.items[0];

              return (
                <tbody key={`${group.department}-${gIdx}`} className="group/branch divide-y divide-(--app-border)/40 text-xs border-b border-(--app-border)/40 has-[.branch-cell:hover]:bg-(--app-surface-container) transition-colors duration-150">
                  {/* Row 0 of this department group */}
                  <tr className="hover:bg-(--app-surface-container) group-has-[.branch-cell:hover]/branch:bg-(--app-surface-container) transition-colors duration-150">
                    {/* Serial Number */}
                    <td
                      className="px-5 py-3 text-center font-mono font-bold text-(--app-muted-foreground) align-middle whitespace-nowrap tabular-nums"
                      style={{ width: "1%" }}
                    >
                      {runningSerial++}
                    </td>

                    {/* Merged Branch / Department Cell with rowSpan */}
                    <td
                      rowSpan={rowSpan}
                      className="branch-cell px-5 py-3 align-middle group-hover/branch:bg-(--app-surface-container) hover:!bg-blue-500/10 dark:hover:!bg-blue-900/20 transition-colors duration-150 whitespace-nowrap bg-(--app-surface) cursor-default"
                      style={{ width: "1%" }}
                    >
                      <div className="flex items-center gap-2.5">
                        <Building2 className="w-4 h-4 text-(--color-primary) shrink-0" />
                        <span className="font-bold text-xs text-(--app-muted-foreground)">{group.department}</span>
                      </div>
                    </td>

                    {/* Position Title */}
                    <td className="px-5 py-3 text-xs font-bold text-(--app-muted-foreground) align-middle">
                      <button
                        type="button"
                        onClick={() => onViewPosition(firstItem)}
                        className="font-black text-xs text-(--color-primary) hover:underline hover:text-(--app-info) cursor-pointer transition-colors text-right"
                        title="عرض تفاصيل وبيانات الوظيفة"
                      >
                        {firstItem.positionTitle}
                      </button>
                    </td>

                    {/* Primary Officer */}
                    <td className="px-5 py-3 text-xs font-bold text-(--app-muted-foreground) align-middle">
                      {!firstItem.primaryOfficer ? (
                        <ModalBadge icon={<AlertCircle className="w-3.5 h-3.5 text-(--app-muted-foreground) shrink-0" />}>
                          شاغر
                        </ModalBadge>
                      ) : (
                        <button
                          type="button"
                          onClick={() => onSelectOfficer(firstItem.primaryOfficer!)}
                          className="font-bold text-xs text-(--app-muted-foreground) hover:underline hover:text-(--app-info) cursor-pointer transition-colors text-right"
                        >
                          {getOfficerDisplay(firstItem.primaryOfficer)}
                        </button>
                      )}
                    </td>

                    {/* Substitute Officer */}
                    <td className="px-5 py-3 text-xs font-bold text-(--app-muted-foreground) align-middle">
                      {firstItem.hasNoSubstitute ? null : (!firstItem.substituteOfficers || firstItem.substituteOfficers.length === 0) ? (
                        <span className="text-xs font-bold text-(--app-muted-foreground)">بدون بديل</span>
                      ) : (
                        <div className="flex flex-col items-start gap-1">
                          {sortSubstituteOfficers(firstItem.substituteOfficers).map((sub, i) => (
                            <ModalBadge
                              key={extractOfficerId(sub) || i}
                              onClick={() => onSelectOfficer(officerMap.get(extractOfficerId(sub)) || sub)}
                            >
                              {getOfficerDisplay(sub)}
                            </ModalBadge>
                          ))}
                        </div>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="px-5 py-3 text-center align-middle whitespace-nowrap" style={{ width: "1%" }}>
                      <div className="flex items-center justify-center gap-1">
                        <ActionButton
                          icon={<History className="w-4 h-4 text-(--color-primary) hover:text-(--app-info)" />}
                          color="btn-action-primary"
                          title="السجل التاريخي للوظيفة"
                          onClick={() => onViewHistory(firstItem)}
                        />
                        {canEdit && onAssignPosition && (
                          <ActionButton
                            icon={<UserPlus className="w-4 h-4 text-(--color-primary) hover:text-(--app-info)" />}
                            color="btn-action-primary"
                            title="تسكين وتكليف ضابط للوظيفة"
                            onClick={() => onAssignPosition(firstItem)}
                          />
                        )}
                        {canEdit && (
                          <ActionButton
                            icon={<Edit className="w-4 h-4 text-(--color-primary) hover:text-(--app-info)" />}
                            color="btn-action-primary"
                            title="تعديل بيانات الوظيفة"
                            onClick={() => onEditPosition(firstItem)}
                          />
                        )}
                      </div>
                    </td>
                  </tr>

                  {/* Remaining rows in this department group */}
                  {group.items.slice(1).map((item) => (
                    <tr key={item.id} className="hover:bg-(--app-surface-container) group-has-[.branch-cell:hover]/branch:bg-(--app-surface-container) transition-colors duration-150">
                      {/* Serial Number */}
                      <td
                        className="px-5 py-3 text-center font-mono font-bold text-(--app-muted-foreground) align-middle whitespace-nowrap tabular-nums"
                        style={{ width: "1%" }}
                      >
                        {runningSerial++}
                      </td>

                      {/* Position Title */}
                      <td className="px-5 py-3 text-xs font-bold text-(--app-muted-foreground) align-middle">
                        <button
                          type="button"
                          onClick={() => onViewPosition(item)}
                          className="font-black text-xs text-(--color-primary) hover:underline hover:text-(--app-info) cursor-pointer transition-colors text-right"
                          title="عرض تفاصيل وبيانات الوظيفة"
                        >
                          {item.positionTitle}
                        </button>
                      </td>

                      {/* Primary Officer */}
                      <td className="px-5 py-3 text-xs font-bold text-(--app-muted-foreground) align-middle">
                        {!item.primaryOfficer ? (
                          <ModalBadge icon={<AlertCircle className="w-3.5 h-3.5 text-(--app-muted-foreground) shrink-0" />}>
                            شاغر
                          </ModalBadge>
                        ) : (
                          <button
                            type="button"
                            onClick={() => onSelectOfficer(item.primaryOfficer!)}
                            className="font-bold text-xs text-(--app-muted-foreground) hover:underline hover:text-(--app-info) cursor-pointer transition-colors text-right"
                          >
                            {getOfficerDisplay(item.primaryOfficer)}
                          </button>
                        )}
                      </td>

                      {/* Substitute Officer */}
                      <td className="px-5 py-3 text-xs font-bold text-(--app-muted-foreground) align-middle">
                        {item.hasNoSubstitute ? null : (!item.substituteOfficers || item.substituteOfficers.length === 0) ? (
                          <span className="text-xs font-bold text-(--app-muted-foreground)">بدون بديل</span>
                        ) : (
                          <div className="flex flex-col items-start gap-1">
                            {sortSubstituteOfficers(item.substituteOfficers).map((sub, i) => (
                              <ModalBadge
                                key={extractOfficerId(sub) || i}
                                onClick={() => onSelectOfficer(officerMap.get(extractOfficerId(sub)) || sub)}
                              >
                                {getOfficerDisplay(sub)}
                              </ModalBadge>
                            ))}
                          </div>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="px-5 py-3 text-center align-middle whitespace-nowrap" style={{ width: "1%" }}>
                        <div className="flex items-center justify-center gap-1">
                          <ActionButton
                            icon={<History className="w-4 h-4 text-(--color-primary) hover:text-(--app-info)" />}
                            color="btn-action-primary"
                            title="السجل التاريخي للوظيفة"
                            onClick={() => onViewHistory(item)}
                          />
                          {canEdit && onAssignPosition && (
                            <ActionButton
                              icon={<UserPlus className="w-4 h-4 text-(--color-primary) hover:text-(--app-info)" />}
                              color="btn-action-primary"
                              title="تسكين وتكليف ضابط للوظيفة"
                              onClick={() => onAssignPosition(item)}
                            />
                          )}
                          {canEdit && (
                            <ActionButton
                              icon={<Edit className="w-4 h-4 text-(--color-primary) hover:text-(--app-info)" />}
                              color="btn-action-primary"
                              title="تعديل بيانات الوظيفة"
                              onClick={() => onEditPosition(item)}
                            />
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              );
            })}
          </table>
        </div>
      </SectionWrapper>
    );
  }

  // -------------------------------------------------------------
  // VIEW 2: BY OFFICER (Grouped & Merged Headers - Officers Table Styling)
  // -------------------------------------------------------------
  interface OfficerRowItem {
    id: string;
    officer: OfficerInfo;
    officerDisplay: string;
    militaryId: string;
    primaryPositions: PositionRowData[];
    substitutePositions: PositionRowData[];
    primaryDisplay: string;
    substituteDisplay: string;
    isUnassigned: boolean;
  }

  // Preserve the exact officers registry sorting (by seniority number, rank, and name)
  const sortedOfficers = [...officers].sort((a, b) => compareOfficers(a, b, officerMap));

  const officerRows: OfficerRowItem[] = sortedOfficers.map((off) => {
    const offId = extractOfficerId(off);
    const pPositions = positions.filter((p) => {
      const pId = extractOfficerId(p.primaryOfficer);
      return Boolean(pId && pId === offId);
    });

    const sPositions = positions.filter((p) =>
      (p.substituteOfficers || []).some((sub) => {
        const sId = extractOfficerId(sub);
        return Boolean(sId && sId === offId);
      })
    );

    const isUnassigned = pPositions.length === 0 && sPositions.length === 0;

    return {
      id: off.id,
      officer: off,
      officerDisplay: getOfficerDisplay(off),
      militaryId: off.militaryId || "",
      primaryPositions: pPositions,
      substitutePositions: sPositions,
      primaryDisplay: pPositions.map((p) => `${p.department}: ${p.positionTitle}`).join(" • ") || "-",
      substituteDisplay: sPositions.map((p) => `${p.department}: ${p.positionTitle}`).join(" • ") || "-",
      isUnassigned,
    };
  });

  const byOfficerColumns: TableColumn<OfficerRowItem>[] = [
    {
      header: "الرتبة",
      accessor: "officer.rank",
      headerAlign: "center" as const,
      cellAlign: "center" as const,
      minWidth: true,
      render: (_val, row) => {
        const rLabel = row.officer.rank ? RANK_LABELS[row.officer.rank as OfficerRank] || row.officer.rank : "-";
        const arkan = row.officer.isArkanHarb ? " أ ح" : "";
        return (
          <span className="font-bold text-xs text-(--app-muted-foreground) whitespace-nowrap">
            {rLabel}{arkan}
          </span>
        );
      },
    },
    {
      header: "الأسم",
      accessor: "officer.fullName",
      headerAlign: "right" as const,
      cellAlign: "right" as const,
      render: (val, row) => (
        <button
          type="button"
          onClick={() => onSelectOfficer(row.officer)}
          className="font-black text-xs text-(--color-primary) hover:underline hover:text-(--app-info) cursor-pointer text-right transition-colors"
          title="عرض وتعديل تكليفات الضابط"
        >
          {val as string}
        </button>
      ),
    },
    {
      header: "وظائف اساسية",
      accessor: "primaryDisplay",
      headerAlign: "right" as const,
      cellAlign: "right" as const,
      render: (_val, row) => {
        if (row.primaryPositions.length === 0) {
          return <span className="text-xs font-bold text-(--app-muted-foreground)/60">-</span>;
        }
        return (
          <div className="flex flex-col items-start gap-1">
            {row.primaryPositions.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => onViewPosition(p)}
                className="font-bold text-xs text-(--app-muted-foreground) hover:underline hover:text-(--app-info) cursor-pointer transition-colors text-right"
                title="عرض تفاصيل وبيانات الوظيفة"
              >
                {p.positionTitle}
              </button>
            ))}
          </div>
        );
      },
    },
    {
      header: "الوظائف البديل",
      accessor: "substituteDisplay",
      headerAlign: "right" as const,
      cellAlign: "right" as const,
      render: (_val, row) => {
        if (row.substitutePositions.length === 0) {
          return <span className="text-xs font-bold text-(--app-muted-foreground)/60">-</span>;
        }
        return (
          <div className="flex flex-col items-start gap-1">
            {row.substitutePositions.map((p) => (
              <ModalBadge
                key={p.id}
                onClick={() => onViewPosition(p)}
              >
                {p.positionTitle}
              </ModalBadge>
            ))}
          </div>
        );
      },
    },
    ...(canEdit
      ? [
          {
            header: "الإجراءات",
            accessor: "id",
            headerAlign: "center" as const,
            cellAlign: "center" as const,
            minWidth: true,
            render: (_val: unknown, row: OfficerRowItem) => (
              <div className="flex items-center justify-center gap-1">
                <ActionButton
                  icon={<Briefcase className="w-4 h-4 text-(--color-primary) hover:text-(--app-info)" />}
                  color="btn-action-primary"
                  title="عرض وتعديل تكليفات الضابط"
                  onClick={() => onSelectOfficer(row.officer)}
                />
              </div>
            ),
          },
        ]
      : []),
  ];

  return (
    <MainTable
      columns={byOfficerColumns}
      data={officerRows}
      showSerialNumber
      emptyTitle="لا توجد بيانات ضباط"
      emptyDescription="لم يتم العثور على أي ضباط مسجلين في النظام."
    />
  );
}
