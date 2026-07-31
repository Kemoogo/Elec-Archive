"use client";

import { useState, useEffect, useRef } from "react";
import { PageHeader } from "@/components/layout/ModernPageHeader";
import { VisitsTab } from "@/components/medical/VisitsTab";
import { MedicationsTab } from "@/components/medical/MedicationsTab";
import { MedicalDetailsTab } from "@/components/medical/MedicalDetailsTab";
import { Activity, Pill, FileText, User, Hash, Printer, type LucideIcon } from "lucide-react";
import { useToast } from "@/components/ui/toast";
import { useReactToPrint } from "react-to-print";
import { extractApiError } from "@/lib/utils";
import { SectionWrapper } from "@/components/ui/section-wrapper";
import type { MedicalRecord, Visit, Medication } from "@/lib/medical/types";

interface PatientProfilePageClientProps {
  patientId: string;
  permissions: "none" | "view" | "edit";
  backHref?: string;
  backLabel?: string;
}

interface InfoCardProps {
  icon: LucideIcon;
  label: string;
  value: string;
  mono?: boolean;
}

function InfoCard({ icon: Icon, label, value, mono = false }: InfoCardProps) {
  return (
    <div className="group flex gap-4 p-4 rounded-2xl transition-all hover:bg-(--color-primary)/5 border border-(--app-border) hover:border-(--color-primary)/20 bg-(--app-surface) shadow-sm">
      <div className="flex items-center justify-center h-12 w-12 rounded-xl bg-(--app-surface-container) border border-(--app-border) group-hover:bg-(--color-primary) group-hover:border-(--color-primary) group-hover:shadow-lg group-hover:shadow-(--color-primary)/20 transition-all duration-300">
        <Icon className="h-5 w-5 text-(--app-muted-foreground) group-hover:text-white transition-all duration-300" />
      </div>
      <div className="flex flex-col justify-center gap-0.5">
        <span className="text-[11px] font-bold uppercase tracking-wide text-(--app-muted-foreground)/70 group-hover:text-(--color-primary)/80 transition-colors">{label}</span>
        <div className={`text-base font-bold text-(--color-primary) leading-tight ${mono ? 'font-mono tracking-tight' : ''}`}>{value}</div>
      </div>
    </div>
  );
}

export function PatientProfilePageClient({
  patientId,
  permissions,
  backHref = "/medical",
  backLabel = "النقطة الطبية",
}: PatientProfilePageClientProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<{ patientName?: string; record: MedicalRecord | null; visits: Visit[]; medications: Medication[] } | null>(null);
  const { showToast } = useToast();
  const contentRef = useRef<HTMLDivElement>(null);

  const handlePrint = useReactToPrint({
    contentRef,
    documentTitle: `الملف الطبي - ${data?.patientName || data?.record?.patientName || patientId}`,
  });

  useEffect(() => {
    let cancelled = false;

    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(`/api/medical/patients/${encodeURIComponent(patientId)}/record`);
        if (!response.ok) {
          const data = await response.json();
          throw new Error(extractApiError(data, "فشل في تحميل البيانات"));
        }
        const result = await response.json();
        if (!cancelled) {
          setData({
            patientName: result.data.patientName,
            record: result.data.record,
            visits: result.data.visits || [],
            medications: result.data.medications || [],
          });
        }
      } catch (err: unknown) {
        if (!cancelled) {
          const message = err instanceof Error ? err.message : "حدث خطأ غير متوقع";
          setError(message);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    fetchData();
    return () => { cancelled = true; };
  }, [patientId]);

  const handleSave = async (saveData: Omit<MedicalRecord, "patientId">) => {
    const response = await fetch(`/api/medical/patients/${encodeURIComponent(patientId)}/record`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(saveData),
    });

    const result = await response.json();

    if (!response.ok) {
      if (response.status === 409) {
        setData((prev) => prev ? { ...prev, record: result.latestData } : null);
        showToast(result.error || "تم تعديل هذه البيانات بواسطة مستخدم آخر، يرجى المراجعة والمحاولة مرة أخرى", "error");
        throw new Error(result.error || "تم تعديل هذه البيانات بواسطة مستخدم آخر، يرجى المراجعة والمحاولة مرة أخرى");
      }
      const saveErr = extractApiError(result, "فشل في حفظ البيانات");
      showToast(saveErr, "error");
      throw new Error(saveErr);
    }

    showToast("تم حفظ البيانات الطبية بنجاح", "success");
    setData((prev) => prev ? { ...prev, record: result.data.record } : null);

    // Re-fetch full data
    setLoading(true);
    try {
      const res = await fetch(`/api/medical/patients/${encodeURIComponent(patientId)}/record`);
      const fullData = await res.json();
      setData({
        patientName: fullData.data.patientName,
        record: fullData.data.record,
        visits: fullData.data.visits || [],
        medications: fullData.data.medications || [],
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="text-lg font-bold text-(--app-muted-foreground)">جاري تحميل بيانات المريض...</div>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
        <div className="text-lg font-bold text-(--app-error)">{error}</div>
      </div>
    );
  }

  const patientName = data?.patientName || data?.record?.patientName || "مريض";

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <PageHeader
        title={patientName}
        backHref={backHref}
        backLabel={backLabel}
        actions={
          <button
            onClick={() => handlePrint()}
            className="flex items-center gap-2 px-4 py-2 bg-(--app-surface) border border-(--app-border) rounded-xl text-sm font-bold text-(--color-primary) hover:bg-(--app-surface-container) transition-all shadow-sm"
          >
            <Printer className="w-4 h-4" />
            طباعة الملف
          </button>
        }
      />

      <div ref={contentRef} className="space-y-10 print:p-8">
        {/* Basic Info Section */}
        <section className="space-y-6">
          <div className="flex items-center gap-4">
            <div className="p-2.5 bg-(--app-surface-container) border border-(--app-border) rounded-xl">
              <User className="h-6 w-6 text-(--color-primary)" />
            </div>
            <h2 className="text-2xl font-extrabold text-(--color-primary)">بيانات الشخص</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <InfoCard icon={User} label="اسم المريض" value={patientName} />
            <InfoCard icon={Hash} label="رقم المريض" value={patientId} mono />
          </div>
        </section>

        {/* Medical Details Section */}
        <section className="space-y-6">
          <div className="flex items-center gap-4">
            <div className="p-2.5 bg-(--app-surface-container) border border-(--app-border) rounded-xl">
              <FileText className="h-6 w-6 text-(--color-primary)" />
            </div>
            <h2 className="text-2xl font-extrabold text-(--color-primary)">التفاصيل الطبية</h2>
          </div>
          <SectionWrapper>
            <MedicalDetailsTab
              record={data?.record ?? null}
              patientName={patientName}
              canEdit={permissions === "edit"}
              onSave={permissions === "edit" ? handleSave : undefined}
            />
          </SectionWrapper>
        </section>

        {/* Visit History Section */}
        <section className="space-y-6 print:break-before-page">
          <div className="flex items-center gap-4">
            <div className="p-2.5 bg-(--app-surface-container) border border-(--app-border) rounded-xl">
              <Activity className="h-6 w-6 text-(--color-primary)" />
            </div>
            <h2 className="text-2xl font-extrabold text-(--color-primary)">سجل الزيارات</h2>
          </div>
          <SectionWrapper>
            <VisitsTab visits={data?.visits ?? []} />
          </SectionWrapper>
        </section>

        {/* Medications History Section */}
        <section className="space-y-6 print:break-before-page">
          <div className="flex items-center gap-4">
            <div className="p-2.5 bg-(--app-surface-container) border border-(--app-border) rounded-xl">
              <Pill className="h-6 w-6 text-(--color-primary)" />
            </div>
            <h2 className="text-2xl font-extrabold text-(--color-primary)">الأدوية المصروفة</h2>
          </div>
          <SectionWrapper>
            <MedicationsTab medications={data?.medications ?? []} />
          </SectionWrapper>
        </section>
      </div>
    </div>
  );
}
