"use client";

import Link from "next/link";
import { AlertTriangle, Award, ArrowRightCircle } from "lucide-react";
import { compareSeniority } from "@/lib/officers/seniority";
import MainTable, { TableColumn } from "@/components/ui/Table";
import { Paginator } from "@/components/ui/paginator";
import { OfficerForm } from "./OfficerForm";
import { OfficerPromoteModal } from "./OfficerPromoteModal";
import { OfficerTransferModal } from "./OfficerTransferModal";
import { OfficerReturnModal } from "./OfficerReturnModal";

interface ActionButtonProps {
  icon: React.ReactNode;
  color: string;
  title: string;
  onClick?: () => void;
  placement?: "top" | "bottom";
}

export const ActionButton = ({ icon, color, title, onClick, placement = "top" }: ActionButtonProps) => {
  const isBottom = placement === "bottom";

  return (
    <div className="relative flex flex-col items-center group">
      <button
        type="button"
        onClick={onClick}
        className={`p-1.5 rounded-lg transition-all ${color} relative cursor-pointer`}
      >
        {icon}
      </button>
      {title && (
        <div
          className={`absolute left-0 z-50 w-max max-w-[220px] whitespace-normal bg-(--app-foreground) text-(--app-surface) text-[10px] font-bold px-2.5 py-1.5 rounded-xl shadow-2xl hidden group-hover:block pointer-events-none border border-(--app-border)/20 ${
            isBottom ? "top-full mt-2" : "bottom-full mb-2"
          }`}
        >
          {title}
          <div
            className={`absolute left-3 -translate-x-1/2 border-x-4 border-x-transparent ${
              isBottom
                ? "bottom-full border-b-4 border-b-(--app-foreground)"
                : "top-full border-t-4 border-t-(--app-foreground)"
            }`}
          ></div>
        </div>
      )}
    </div>
  );
};

interface OfficerListItem {
  _isComplete?: boolean;
  _missingFields?: string[];
  id: string;
  militaryId: string;
  seniorityNumber: string;
  fullName: string;
  rank: string;
  rankLabel: string;
  batch: string;
  type: string;
  typeLabel: string;
  weapon: string;
  weaponLabel: string;
  phone: string;
  unit: string;
  position: string;
  nationalId: string;
  joinDate: string;
  birthDate: string;
  graduationDate?: string;
  bloodType?: string;
  religion?: string;
  maritalStatus?: string;
  faculty?: string;
  file121IssueDate?: string;
  employmentStatus: string;
  employmentStatusLabel: string;
  isInUnit: boolean;
  isArkanHarb: boolean;
  file121Url: string;
}

export function getMissingFields(officer: OfficerListItem): string[] {
  const missing: string[] = [];
  if (!officer.militaryId) missing.push("الرقم العسكري");
  if (!officer.nationalId) missing.push("الرقم القومي");
  if (!officer.phone) missing.push("الهاتف");
  if (!officer.batch) missing.push("الدفعة");
  if (!officer.type) missing.push("النوع");
  if (!officer.weapon) missing.push("السلاح");
  if (!officer.birthDate) missing.push("تاريخ الميلاد");
  if (!officer.graduationDate) missing.push("تاريخ التخرج");
  if (!officer.bloodType) missing.push("فصيلة الدم");
  if (!officer.religion) missing.push("الديانة");
  if (!officer.maritalStatus) missing.push("الحالة الاجتماعية");
  if (!officer.faculty) missing.push("الكلية / المعهد");
  if (!officer.file121Url) missing.push("وثيقة 121 (PDF)");
  return missing;
}

interface OfficersTableProps {
  officers: OfficerListItem[];
  page: number;
  totalPages: number;
  total: number;
  canEdit: boolean;
}

export function OfficersTable({ officers, page, totalPages, total, canEdit }: OfficersTableProps) {
  // ترتيب الضباط وفق المنطق العسكري المتقدم وتقييم اكتمال البيانات
  const sortedOfficers = [...officers].sort((a, b) => compareSeniority(a.seniorityNumber, b.seniorityNumber))
    .map(officer => {
      const missing = getMissingFields(officer);
      return {
        ...officer,
        _missingFields: missing,
        _isComplete: missing.length === 0,
      };
    });



  const columns: TableColumn<OfficerListItem>[] = [
    {
      header: "أقدمية",
      accessor: "seniorityNumber",
      isNumeric: true,
      cellAlign: "center",
      headerAlign: "center",
      minWidth: true,
    },
    {
      header: "الرتبة",
      accessor: "rankLabel",
      cellAlign: "right",
      headerAlign: "right",
    },
    {
      header: "الأسم",
      accessor: "fullName",
      cellAlign: "right",
      headerAlign: "right",
      render: (val, row) => (
        <Link href={`/officers/${row.id}`} className="hover:underline hover:text-(--app-info) cursor-pointer">
          {val as string}
        </Link>
      ),
    },
    {
      header: "الرقم العسكري",
      accessor: "militaryId",
      isNumeric: true,
      cellAlign: "center",
      headerAlign: "center",
    },
    {
      header: "الدفعة",
      accessor: "batch",
      emptyValue: "---",
      isNumeric: true,
      cellAlign: "center",
      headerAlign: "center",
    },
    {
      header: "رقم الموبايل",
      accessor: "phone",
      emptyValue: "---",
      isNumeric: true,
      cellAlign: "center",
      headerAlign: "center",
    },
    {
      header: "التصنيف",
      accessor: "typeLabel",
      emptyValue: "---",
      cellAlign: "center",
      headerAlign: "center",
    },
    {
      header: "السلاح",
      accessor: "weaponLabel",
      emptyValue: "---",
      cellAlign: "center",
      headerAlign: "center",
    },
    {
      header: "الإجراءات",
      accessor: "id",
      cellAlign: "center",
      headerAlign: "center",
      minWidth: true,
      render: (_, row: OfficerListItem) => {
        const isTopRow = sortedOfficers.findIndex(o => o.id === row.id) === 0;
        const placement = isTopRow ? "bottom" : "top";

        return (
          <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
            {!row._isComplete && (
              canEdit ? (
                <OfficerForm
                  mode="edit"
                  initialValues={row}
                  highlightIncomplete={true}
                  trigger={
                    <ActionButton
                      icon={<AlertTriangle className="w-4 h-4 text-amber-500 animate-pulse" />}
                      color="btn-action-warning"
                      title={`بيانات غير مكتملة (${row._missingFields?.join("، ") || "بيانات تنظيمية"})`}
                      placement={placement}
                    />
                  }
                />
              ) : (
                <ActionButton
                  icon={<AlertTriangle className="w-4 h-4 text-amber-500" />}
                  color="btn-action-warning !cursor-default"
                  title={`بيانات غير مكتملة (${row._missingFields?.join("، ") || "بيانات تنظيمية"})`}
                  placement={placement}
                />
              )
            )}

            {canEdit && row.isInUnit && (
              <>
                <OfficerPromoteModal
                  officer={row}
                  trigger={
                    <ActionButton
                      icon={<Award className="w-4 h-4" />}
                      color="btn-action-warning"
                      title="تسجيل ترقية"
                      placement={placement}
                    />
                  }
                />

                <OfficerTransferModal
                  officer={row}
                  trigger={
                    <ActionButton
                      icon={<ArrowRightCircle className="w-4 h-4" />}
                      color="btn-action-warning"
                      title="نقل / إنهاء خدمة"
                      placement={placement}
                    />
                  }
                />
              </>
            )}

            {canEdit && !row.isInUnit && (
              <OfficerReturnModal
                officer={row}
                trigger={
                  <ActionButton
                    icon={<ArrowRightCircle className="w-4 h-4 -rotate-180" />}
                    color="btn-action-info"
                    title="عودة للخدمة / إعادة انضمام"
                    placement={placement}
                  />
                }
              />
            )}
          </div>
        );
      },
    },
  ];

  return (
    <div className="space-y-4">
      <MainTable
        columns={columns}
        data={sortedOfficers}
        emptyTitle="لا يوجد ضباط مسجلين"
        emptyDescription="لم يتم العثور على أي ضباط يطابقون معايير البحث الحالية"
      />


      <Paginator page={page} totalPages={totalPages} total={total} />
    </div>
  );
}
