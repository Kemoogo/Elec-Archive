"use client";

import React from "react";
import { ModalShell, ModalBadge } from "@/components/ui/modal-shell";
import MainTable, { type TableColumn } from "@/components/ui/Table";
import { RANK_LABELS, type OfficerRank } from "@/lib/db/models/Officer.shared";
import { History, User, Briefcase, Award } from "lucide-react";
import { format } from "date-fns";
import { ar } from "date-fns/locale";
import { mergeHistoryIntervals } from "@/lib/utils/history-merge";

interface OfficerOption {
  id?: string;
  _id?: string;
  fullName: string;
  rank: string;
  militaryId?: string;
  officerLabel?: string;
  isArkanHarb?: boolean;
}

export interface PositionHistoryItem {
  _id?: string;
  officerId: OfficerOption | string;
  role: "primary" | "substitute";
  startDate: string | Date;
  endDate?: string | Date | null;
  notes?: string;
}

export interface PositionForHistory {
  id?: string;
  positionTitle: string;
  department: string;
  assignmentHistory?: PositionHistoryItem[];
}

interface PositionHistoryModalProps {
  isOpen: boolean;
  position: PositionForHistory | null;
  onClose: () => void;
}

interface HistoryRowData {
  id: string;
  officerLabel: string;
  role: "primary" | "substitute";
  roleLabel: string;
  startDate: string;
  endDate: string;
  isCurrent: boolean;
  notes: string;
}

export function PositionHistoryModal({ isOpen, position, onClose }: PositionHistoryModalProps) {
  if (!isOpen || !position) return null;

  const rawHistoryList = position.assignmentHistory || [];
  const historyList = mergeHistoryIntervals(rawHistoryList);

  const formattedHistory: HistoryRowData[] = historyList.map((h, idx) => {
    let officerDisplay = "غير محدد";
    if (h.officerId && typeof h.officerId === "object") {
      const off = h.officerId as OfficerOption;
      if (off.officerLabel) {
        officerDisplay = off.officerLabel;
      } else {
        const rKey = off.rank;
        const rLabel = rKey ? RANK_LABELS[rKey as OfficerRank] || rKey : "";
        const arkan = off.isArkanHarb ? " أ ح" : "";
        officerDisplay = rLabel ? `${rLabel}${arkan} / ${off.fullName}` : off.fullName;
      }
    } else if (typeof h.officerId === "string") {
      officerDisplay = h.officerId;
    }

    const sDate = h.startDate ? format(new Date(h.startDate), "yyyy/MM/dd", { locale: ar }) : "-";
    const eDate = h.endDate ? format(new Date(h.endDate), "yyyy/MM/dd", { locale: ar }) : "حالي ومستمر";
    const isCurrent = !h.endDate;

    return {
      id: h._id || String(idx),
      officerLabel: officerDisplay,
      role: h.role,
      roleLabel: h.role === "primary" ? "ضابط أساسي" : "ضابط بديل",
      startDate: sDate,
      endDate: eDate,
      isCurrent,
      notes: h.notes || "-",
    };
  });

  const columns: TableColumn<HistoryRowData>[] = [
    {
      header: "الضابط",
      accessor: "officerLabel",
      className: "text-xs font-bold text-(--app-muted-foreground)",
      render: (val) => (
        <div className="flex items-center gap-2">
          <User className="w-3.5 h-3.5 text-(--app-muted-foreground) shrink-0" />
          <span>{String(val)}</span>
        </div>
      ),
    },
    {
      header: "الصفة والتكليف",
      accessor: "roleLabel",
      render: (val, row) => (
        <ModalBadge
          icon={row.role === "substitute" ? <User className="w-3.5 h-3.5 text-(--app-muted-foreground)" /> : <Award className="w-3.5 h-3.5 text-(--color-primary)" />}
        >
          {String(val)}
        </ModalBadge>
      ),
    },
    {
      header: "تاريخ البدء",
      accessor: "startDate",
      cellAlign: "center",
      headerAlign: "center",
      className: "font-mono text-xs text-(--app-muted-foreground)",
    },
    {
      header: "تاريخ الانتهاء",
      accessor: "endDate",
      cellAlign: "center",
      headerAlign: "center",
      render: (val, row) => (
        <span
          className={`text-xs font-bold ${
            row.isCurrent ? "text-(--color-primary) font-black" : "text-(--app-muted-foreground) font-mono"
          }`}
        >
          {String(val)}
        </span>
      ),
    },
    {
      header: "ملاحظات",
      accessor: "notes",
      className: "text-xs text-(--app-muted-foreground)",
    },
  ];

  return (
    <ModalShell
      title={`السجل التاريخي للوظيفة: ${position.positionTitle}`}
      icon={<History className="w-4 h-4" />}
      onClose={onClose}
      overlayClassName="bg-black/40"
      panelClassName="max-w-3xl border-(--app-border) shadow-depth-xl"
      bodyClassName="p-5 space-y-4 no-scrollbar"
      footer={
        <div className="flex items-center justify-end w-full">
          <button
            type="button"
            onClick={onClose}
            className="btn-secondary text-xs"
          >
            إغلاق
          </button>
        </div>
      }
    >
      {/* Position Header Info */}
      <div className="p-4 bg-(--color-primary)/5 border border-(--color-primary)/10 shadow-sm rounded-2xl flex items-center justify-between text-right">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-(--color-primary)/10 border border-(--color-primary)/20 flex items-center justify-center text-(--color-primary)">
            <Briefcase className="w-6 h-6" />
          </div>
          <div>
            <h4 className="text-base font-extrabold text-(--color-primary)">{position.positionTitle}</h4>
            <p className="text-xs text-(--app-muted-foreground) font-bold">الفرع / القسم: {position.department}</p>
          </div>
        </div>
        <div className="text-left">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-(--app-surface-container) border border-(--app-border) rounded-xl shadow-sm">
            <span className="text-xs font-bold text-(--app-muted-foreground)">إجمالي الحركات:</span>
            <span className="text-xs font-black text-(--color-primary)">{formattedHistory.length}</span>
          </div>
        </div>
      </div>

      {/* History Table */}
      <div className="space-y-2 text-right">
        <MainTable
          columns={columns}
          data={formattedHistory}
          showSerialNumber
          emptyTitle="لا يوجد سجل حركات سابق"
          emptyDescription="لم يتم تسجيل حركات تعيين أو استبدال سابقة لهذه الوظيفة حتى الآن."
        />
      </div>
    </ModalShell>
  );
}
