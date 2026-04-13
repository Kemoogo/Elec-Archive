"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertTriangle, Award, ArrowRightCircle } from "lucide-react";
import { compareSeniority } from "@/lib/officers/seniority";
import MainTable, { TableColumn } from "@/components/ui/Table";
import { OfficerForm } from "./OfficerForm";
import { OfficerPromoteModal } from "./OfficerPromoteModal";
import { OfficerTransferModal } from "./OfficerTransferModal";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const ActionButton = ({ icon, color, title, onClick }: any) => {
    return (
        <div className="relative flex flex-col items-center group">
            <button
                type="button"
                onClick={onClick}
                className={`p-1.5 rounded-lg transition-all ${color} relative`}
            >
                {icon}
            </button>
            {title && (
                <div className="absolute bottom-full left-0 mb-2 z-50 w-max max-w-[150px] whitespace-normal bg-slate-800 text-white text-[10px] font-bold px-2 py-1.5 rounded shadow-xl hidden group-hover:block pointer-events-none">
                    {title}
                    <div className="absolute top-full left-3 -translate-x-1/2 border-x-4 border-x-transparent border-t-4 border-t-slate-800"></div>
                </div>
            )}
        </div>
    );
};

interface OfficerListItem {
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
  employmentStatus: string;
  employmentStatusLabel: string;
  file121Url: string;
}

interface OfficersTableProps {
  officers: OfficerListItem[];
  page: number;
  totalPages: number;
  total: number;
  canEdit: boolean;
}

export function OfficersTable({ officers, page, totalPages, total, canEdit }: OfficersTableProps) {
  const router = useRouter();
  // ترتيب الضباط وفق المنطق العسكري المتقدم وتقييم اكتمال البيانات
  const sortedOfficers = [...officers].sort((a, b) => compareSeniority(a.seniorityNumber, b.seniorityNumber))
  .map(officer => {
    // A record is complete if all descriptive fields are filled
    const isComplete = Boolean(officer.batch && officer.type && officer.weapon && officer.phone && officer.nationalId && officer.unit && officer.position && officer.militaryId);
    return {
      ...officer,
      _isComplete: isComplete,
    };
  });

  if (sortedOfficers.length === 0) {
    return (
      <div className="rounded-lg bg-(--app-surface) p-8 text-center text-(--app-muted-foreground)">
        لا توجد ضباط
      </div>
    );
  }

  const columns: TableColumn<OfficerListItem>[] = [
    {
      header: "أقدمية",
      accessor: "seniorityNumber",
      isNumeric: true
    },
    {
      header: "الرتبة",
      accessor: "rankLabel",
    },
    {
      header: "الأسم",
      accessor: "fullName",
      render: (val, row) => (
        <Link href={`/officers/${row.id}`} className="hover:underline hover:text-blue-600 cursor-pointer">
          {val as string}
        </Link>
      ),
    },
    {
      header: "الرقم العسكري",
      accessor: "militaryId",
      isNumeric: true
    },
    {
      header: "الدفعة",
      accessor: "batch",
      emptyValue: "---",
      isNumeric: true
    },
    {
      header: "رقم الموبايل",
      accessor: "phone",
      emptyValue: "---",
      isNumeric: true
    },
    {
      header: "التصنيف",
      accessor: "typeLabel",
      emptyValue: "---",
    },
    {
      header: "السلاح",
      accessor: "weaponLabel",
      emptyValue: "---",
    },
    {
      header: "الإجراءات",
      accessor: "id",
      cellAlign: "center",
      headerAlign: "center",
      minWidth: true,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      render: (_, row: any) => {
        return (
          <div className="flex items-center justify-center gap-1.5" onClick={(e) => e.stopPropagation()}>
            {!row._isComplete && (
              <OfficerForm
                mode="edit"
                initialValues={row}
                trigger={
                  <ActionButton
                    icon={<AlertTriangle className="w-4 h-4 text-amber-600" />}
                    color="bg-amber-50 hover:bg-amber-100 border border-amber-200"
                    title="بيانات غير مكتملة"
                  />
                }
              />
            )}
            
            {canEdit && row.employmentStatus === "active" && (
              <>
                <OfficerPromoteModal
                  officer={row}
                  trigger={
                    <ActionButton
                      icon={<Award className="w-4 h-4 text-amber-600" />}
                      color="bg-amber-50 hover:bg-amber-100 border border-amber-200"
                      title="تسجيل ترقية"
                    />
                  }
                />
                
                <OfficerTransferModal
                  officer={row}
                  trigger={
                    <ActionButton
                      icon={<ArrowRightCircle className="w-4 h-4 text-orange-600" />}
                      color="bg-orange-50 hover:bg-orange-100 border border-orange-200"
                      title="نقل / إنهاء خدمة"
                    />
                  }
                />
              </>
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
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        onRowClick={(row: any) => router.push(`/officers/${row.id}`)}
      // showSerialNumber 
      />


      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <span className="text-sm text-(--app-muted-foreground)">إجمالي: {total}</span>
          <div className="flex items-center gap-2" dir="ltr">
            <Link
              href={page > 1 ? `/officers?page=${page - 1}` : "#"}
              className={`rounded-md bg-(--app-surface) px-3 py-2 text-sm text-(--app-white) hover:bg-white/10 ${page <= 1 ? "opacity-30 pointer-events-none" : ""}`}
            >
              السابق
            </Link>
            <span className="text-sm text-(--app-muted-foreground)">صفحة {page} من {totalPages}</span>
            <Link
              href={page < totalPages ? `/officers?page=${page + 1}` : "#"}
              className={`rounded-md bg-(--app-surface) px-3 py-2 text-sm text-(--app-white) hover:bg-white/10 ${page >= totalPages ? "opacity-30 pointer-events-none" : ""}`}
            >
              التالي
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
