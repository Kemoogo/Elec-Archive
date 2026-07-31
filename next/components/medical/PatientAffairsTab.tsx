"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { PatientProfilePageClient } from "@/components/medical/PatientProfilePageClient";
import MainTable, { TableColumn } from "@/components/ui/Table";
import { SectionWrapper } from "@/components/ui/section-wrapper";
import { Users, Calendar } from "lucide-react";

interface PatientRow {
  _id: string;
  patientId: string;
  patientName: string;
  visitCount: number;
  lastVisitDate: string | null;
}

interface PatientAffairsTabProps {
  permissions: "none" | "view" | "edit";
  patients?: PatientRow[];
  searchQuery?: string;
}export function PatientAffairsTab({ permissions, patients = [], searchQuery = "" }: PatientAffairsTabProps) {
  const [now] = useState(() => Date.now());
  const router = useRouter();
  const searchParams = useSearchParams();
  const patientId = searchParams.get("patientId");

  // Handle patient selection — navigate to profile
  const handleViewProfile = (id: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("patientId", id);
    router.push(`/medical?${params.toString()}`, { scroll: false });
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "—";
    try {
      return new Date(dateStr).toLocaleDateString("ar-EG", {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    } catch {
      return dateStr;
    }
  };

  const columns: TableColumn<PatientRow>[] = [
    {
      header: "رقم المريض",
      accessor: "patientId",
      isNumeric: true,
    },
    {
      header: "اسم المريض",
      accessor: "patientName",
      render: (val, row) => (
        <button
          type="button"
          onClick={() => handleViewProfile(row.patientId)}
          className="hover:underline hover:text-(--app-info) cursor-pointer border-none bg-transparent text-inherit"
        >
          {val as string}
        </button>
      ),
    },
    {
      header: "عدد الزيارات",
      accessor: "visitCount",
      isNumeric: true,
      cellAlign: "center",
      render: (val) => {
        const count = val as number;
        return (
          <span className="font-bold text-(--color-primary)">
            {count}
          </span>
        );
      },
    },
    {
      header: "آخر زيارة",
      accessor: "lastVisitDate",
      render: (val) => {
        const dateStr = val as string | null;
        if (!dateStr) return "—";
        const date = new Date(dateStr);
        const now = new Date();
        const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

        let color = "text-(--app-muted-foreground)";
        if (diffDays <= 7) color = "text-(--app-success)";
        else if (diffDays <= 30) color = "text-(--app-warning)";
        else color = "text-(--app-error)";

        return (
          <span className={`font-bold ${color}`}>
            {formatDate(dateStr)}
          </span>
        );
      },
    },
  ];

  // If a patient is selected, render the profile component
  if (patientId) {
    return (
      <div className="animate-in fade-in duration-500">
        <PatientProfilePageClient
          patientId={patientId}
          permissions={permissions}
          backHref="/medical?tab=patients"
          backLabel="الرجوع لشئون المرضى"
        />
      </div>
    );
  }



  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Summary bar */}
      <div className="flex items-center gap-6 px-4 py-3 bg-(--app-surface) rounded-xl border border-(--app-border)">
        <div className="flex items-center gap-2">
          <Users className="w-5 h-5 text-(--color-primary)" />
          <span className="text-sm font-bold text-(--app-muted-foreground)">
            إجمالي المرضى: <span className="text-(--color-primary)">{patients.length}</span>
          </span>
        </div>
        <div className="w-px h-6 bg-(--app-border)" />
        <div className="flex items-center gap-2">
          <Calendar className="w-5 h-5 text-(--app-success)" />
          <span className="text-sm font-bold text-(--app-muted-foreground)">
            آخر 7 أيام: <span className="text-(--app-success)">{patients.filter((p) => {
              if (!p.lastVisitDate) return false;
              const diff = Math.floor((now - new Date(p.lastVisitDate).getTime()) / (1000 * 60 * 60 * 24));
              return diff <= 7;
            }).length}</span>
          </span>
        </div>
      </div>

      {/* Patients Table */}
      {patients.length === 0 ? (
        <section className="empty-section py-20">
          <SectionWrapper className="w-full max-w-lg">
            <div className="w-16 h-16 rounded-full bg-(--app-info)/10 text-(--app-info) flex items-center justify-center">
              <Users className="w-8 h-8" />
            </div>
            <h4 className="text-lg font-extrabold text-(--color-primary)">
              {searchQuery ? "لا توجد نتائج مطابقة" : "لا يوجد مرضى مسجلين"}
            </h4>
            <p className="text-sm font-bold text-(--app-muted-foreground) max-w-sm">
              {searchQuery
                ? `لم نجد أي مريض بالاسم أو الرقم «${searchQuery}».`
                : "لم يتم تسجيل أي زيارة طبية بعد. قم بتسجيل أول زيارة ليظهر المرضى هنا."}
            </p>
          </SectionWrapper>
        </section>
      ) : (
        <MainTable
          columns={columns}
          data={patients}
          showSerialNumber
          emptyTitle="لا يوجد مرضى"
          emptyDescription="لم يتم العثور على مرضى مسجلين لدى النقطة الطبية"
          emptyIcon={Users}
        />
      )}
    </div>
  );
}
