import { connectToDatabase } from "@/lib/db/connect";
import { authenticate } from "@/lib/auth/middleware";
import { redirect } from "next/navigation";
import { Medicine } from "@/lib/db/models/Medicine";
import { PageContainer } from "@/components/layout/PageContainer";
import { MedicineTable } from "@/components/medical/MedicineTable";
import { PageHeader } from "@/components/layout/ModernPageHeader";

import type { Types } from "mongoose";

export default async function MedicalMedicinesPage() {
  const auth = await authenticate();
  if (!auth.success || auth.user!.permissions.medical === "none") {
    redirect("/unavailable");
  }

  await connectToDatabase();

  const rawMedicines = await Medicine.find().sort({ name: 1 }).lean();
  const medicines = rawMedicines.map(m => ({
    ...m,
    _id: (m._id as Types.ObjectId).toString(),
    expiryDate: (m.expiryDate as Date).toISOString(),
  }));

  const now = new Date().toISOString();

  return (
    <PageContainer className="max-w-[1600px] mx-auto pb-12">
      <PageHeader
        title="مخزون الأدوية"
        action={
          <button className="btn-accent">
            إضافة دواء
          </button>
        }
      />

      {medicines.length === 0 ? (
        <div className="rounded-lg bg-(--app-surface) p-8 text-center text-(--app-muted-foreground)">
          لا توجد أدوية مسجلة
        </div>
      ) : (
        <MedicineTable medicines={medicines} now={now} />
      )}
    </PageContainer>
  );
}
