import { connectToDatabase } from "@/lib/db/connect";
import { authenticate } from "@/lib/auth/middleware";
import { redirect } from "next/navigation";
import { Patient } from "@/lib/db/models/Patient";
import { PageContainer } from "@/components/layout/PageContainer";
import { PageHeader, PrimaryHeaderBtn } from "@/components/layout/ModernPageHeader";
import { Activity, Plus } from "lucide-react";

import { VisitTable } from "@/components/medical/VisitTable";

import type { Types } from "mongoose";

export default async function MedicalVisitsPage() {
  const auth = await authenticate();
  if (!auth.success || auth.user!.permissions.medical === "none") {
    redirect("/unavailable");
  }

  await connectToDatabase();

  const rawVisits = await Patient.find()
    .sort({ visitDate: -1 })
    .limit(20)
    .lean();

  const visits = rawVisits.map(v => ({
    ...v,
    _id: (v._id as Types.ObjectId).toString(),
    visitDate: (v.visitDate as Date).toISOString(),
    dispensedMedicines: (v.dispensedMedicines as Array<{ medicineId: Types.ObjectId; quantity: number }>).map(m => ({
      ...m,
      medicineId: m.medicineId.toString()
    }))
  }));

  return (
    <PageContainer className="max-w-[1600px] mx-auto pb-12">
      <PageHeader
        title="سجل الزيارات الطبية"
        subtitle="عرض وتسجيل الزيارات الطبية"
        icon={<Activity className="w-6 h-6" />}
        action={
          <PrimaryHeaderBtn href="/medical/visits/new" label="زيارة جديدة" icon={<Plus className="w-4 h-4" />} />
        }
      />

      {visits.length === 0 ? (
        <div className="rounded-lg bg-(--app-surface) p-8 text-center text-(--app-muted-foreground)">
          لا توجد زيارات مسجلة
        </div>
      ) : (
        <VisitTable visits={visits} />
      )}
    </PageContainer>
  );
}
