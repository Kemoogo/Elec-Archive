import { TabSection } from "@/components/ui/tab-section";
import { connectToDatabase } from "@/lib/db/connect";
import { authenticate } from "@/lib/auth/middleware";
import { redirect } from "next/navigation";
import { getDashboardStats } from "@/lib/medical/queries";
import { PageContainer } from "@/components/layout/PageContainer";
import { Activity, Pill } from "lucide-react";
import { MedicalVisit as MedicalVisitModel, IMedicalVisit } from "@/lib/db/models/MedicalVisit";
import { Medicine as MedicineModel, IMedicine, IMedicineBatch } from "@/lib/db/models/Medicine";
import { MedicalPatient as MedicalPatientModel } from "@/lib/db/models/MedicalPatient";
import { type Types, type PipelineStage } from "mongoose";
import type { QueryFilter } from "mongoose";

import { VisitTable } from "@/components/medical/VisitTable";
import { MedicineTable } from "@/components/medical/MedicineTable";
import { PatientAffairsTab } from "@/components/medical/PatientAffairsTab";
import { MedicalWorkspaceClient } from "@/components/medical/MedicalWorkspaceClient";
import { escapeRegex } from "@/lib/utils";

import { PopulatedVisit } from "@/lib/medical/types";

export default async function MedicalDashboardPage({
  searchParams,
}: {
  searchParams: Promise<{
    tab?: string;
    search?: string;
    fitness?: string;
    rest?: string;
    period?: string;
    medStatus?: string;
    frequency?: string;
  }>;
}) {
  const auth = await authenticate();
  if (!auth.success || auth.user!.permissions.medical === "none") {
    redirect("/unavailable");
  }

  const { tab, search, fitness, rest, period, medStatus, frequency } = await searchParams;

  await connectToDatabase();

  const escapedSearch = search ? escapeRegex(search) : "";
  const statsPromise = getDashboardStats();

  // Visit query with search and filters
  const visitQuery: QueryFilter<IMedicalVisit> = {};
  if (escapedSearch && tab === "visits") {
    // First find any patients matching the search
    const matchingPatients = await MedicalPatientModel.find({
      $or: [
        { patientName: { $regex: escapedSearch, $options: "i" } },
        { patientId: { $regex: escapedSearch, $options: "i" } },
      ],
    })
      .select("_id")
      .lean();

    const matchingPatientIds = matchingPatients.map((p) => p._id);

    visitQuery.$or = [
      { patientId: { $in: matchingPatientIds } },
      { diagnosis: { $regex: escapedSearch, $options: "i" } },
    ];
  }

  // Apply fitness filter
  if (fitness && fitness !== "all") {
    visitQuery.fitnessCategory = fitness;
  }

  // Apply rest type filter
  if (rest && rest !== "all") {
    visitQuery.restType = rest;
  }

  // Apply period filter
  if (period && period !== "all") {
    const startDate = new Date();
    if (period === "today") {
      startDate.setHours(0, 0, 0, 0);
    } else if (period === "week") {
      startDate.setDate(startDate.getDate() - 7);
    } else if (period === "month") {
      startDate.setMonth(startDate.getMonth() - 1);
    }
    visitQuery.visitDate = { $gte: startDate };
  }

  const visitsPromise = MedicalVisitModel.find(visitQuery)
    .sort({ visitDate: -1 })
    .limit(50)
    .populate("patientId", "patientId patientName")
    .populate("dispensedMedicines.medicineId", "name concentration unit")
    .lean();

  // Medicine query with search and filters
  const medicineQuery: QueryFilter<IMedicine> = {};
  if (escapedSearch && tab === "medicines") {
    medicineQuery.$or = [
      { name: { $regex: escapedSearch, $options: "i" } },
      { concentration: { $regex: escapedSearch, $options: "i" } },
    ];
  }

  // Apply stock status filter
  if (medStatus && medStatus !== "all") {
    if (medStatus === "low_stock") {
      medicineQuery.$expr = { $lt: ["$totalQuantity", "$minThreshold"] };
    } else if (medStatus === "expired") {
      medicineQuery.batches = {
        $elemMatch: { quantity: { $gt: 0 }, expiryDate: { $lt: new Date() } }
      };
    } else if (medStatus === "valid") {
      medicineQuery.batches = {
        $not: {
          $elemMatch: { quantity: { $gt: 0 }, expiryDate: { $lt: new Date() } }
        }
      };
      medicineQuery.totalQuantity = { $gt: 0 };
    }
  }

  const medicinesPromise = MedicineModel.find(medicineQuery).sort({ name: 1 }).lean();

  // Patient query — patients with medical data (at least one visit)
  const patientsPromise = (async () => {
    const pipeline: PipelineStage[] = [
      // Lookup visits from medicalvisits collection
      {
        $lookup: {
          from: "medicalvisits",
          localField: "_id",
          foreignField: "patientId",
          as: "visits",
        },
      },
      // Only patients with at least one visit
      { $match: { "visits.0": { $exists: true } } },
      // Add computed stats
      {
        $addFields: {
          visitCount: { $size: "$visits" },
          lastVisitDate: { $max: "$visits.visitDate" },
        },
      },
    ];

    // Apply search filter for patients tab
    if (escapedSearch && tab === "patients") {
      pipeline.push({
        $match: {
          $or: [
            { patientName: { $regex: escapedSearch, $options: "i" } },
            { patientId: { $regex: escapedSearch, $options: "i" } },
          ],
        },
      });
    }

    // Apply frequency filter (frequent > 3 visits)
    if (frequency === "frequent" && tab === "patients") {
      pipeline.push({
        $match: {
          visitCount: { $gt: 3 }
        }
      });
    }

    pipeline.push(
      { $sort: { lastVisitDate: -1 } },
      { $limit: 50 },
      {
        $project: {
          _id: 1,
          patientId: 1,
          patientName: 1,
          visitCount: 1,
          lastVisitDate: 1,
        },
      },
    );

    return MedicalPatientModel.aggregate(pipeline);
  })();

  const [stats, rawVisits, rawMedicines, rawPatientsWithStats] = await Promise.all([
    statsPromise,
    visitsPromise,
    medicinesPromise,
    patientsPromise,
  ]);

  const patientsWithStats = (rawPatientsWithStats as Array<{
    _id: Types.ObjectId;
    patientId: string;
    patientName: string;
    visitCount: number;
    lastVisitDate: Date | null;
  }>).map((p) => ({
    _id: p._id.toString(),
    patientId: p.patientId,
    patientName: p.patientName,
    visitCount: p.visitCount,
    lastVisitDate: p.lastVisitDate ? p.lastVisitDate.toISOString() : null,
  }));

  const visits = (rawVisits as unknown as PopulatedVisit[]).map((v) => ({
    _id: (v._id as Types.ObjectId).toString(),
    patientId: v.patientId?.patientId || "غير معروف",
    patientName: v.patientId?.patientName || "غير معروف",
    visitDate: (v.visitDate as Date).toISOString(),
    diagnosis: v.diagnosis as string,
    treatment: v.treatment as string,
    restType: v.restType,
    restDays: v.restDays,
    fitnessCategory: v.fitnessCategory,
    dispensedMedicines: (v.dispensedMedicines || []).map((m) => {
      const med = m.medicineId;
      const isObject = med && typeof med === "object" && "name" in med;
      const medicineName = isObject
        ? `${med.name} ${med.concentration || ""} ${med.unit || ""}`.trim()
        : "دواء غير معروف";
      const medicineId = isObject
        ? med._id.toString()
        : med ? med.toString() : "";
      return {
        medicineId,
        medicineName,
        quantity: m.quantity as number,
      };
    }),
  }));

  const now = new Date();
  const medicines = (rawMedicines as unknown as IMedicine[]).map((m) => {
    const batches: IMedicineBatch[] = m.batches || [];
    const activeBatches = batches.filter((b) => b.quantity > 0);

    let closestExpiryDate: Date | null = null;
    let isExpired = false;

    if (activeBatches.length > 0) {
      const minTime = Math.min(
        ...activeBatches.map((b) => new Date(b.expiryDate).getTime())
      );
      closestExpiryDate = new Date(minTime);
      isExpired = closestExpiryDate < now;
    }

    return {
      _id: (m._id as Types.ObjectId).toString(),
      name: m.name as string,
      unit: m.unit as string,
      concentration: (m.concentration || "") as string,
      quantity: (m.totalQuantity ?? 0) as number,
      expiryDate: closestExpiryDate
        ? closestExpiryDate.toISOString()
        : new Date().toISOString(),
      minThreshold: (m.minThreshold ?? 0) as number,
      isExpired,
    };
  });

  const medicalPermission = auth.user!.permissions.medical;

  const visitsContent = (
    <TabSection
      title={search ? `نتائج البحث عن: ${search}` : "أحدث الزيارات"}
      icon={Activity}
    >
      <VisitTable
        visits={visits}
        emptyTitle={search ? "لا توجد نتائج بحث" : "لا توجد زيارات مسجلة"}
        emptyDescription={
          search
            ? "جرب البحث بكلمة أخرى"
            : "سجل أول زيارة طبية للبدء في بناء قاعدة البيانات"
        }
        permissions={medicalPermission}
      />
    </TabSection>
  );

  const medicinesContent = (
    <TabSection
      title={search ? `نتائج البحث عن: ${search}` : "الأدوية المتاحة"}
      icon={Pill}
    >
      <MedicineTable
        medicines={medicines}
        now={now.toISOString()}
        emptyTitle={search ? "لا توجد نتائج بحث" : "لا توجد أدوية مسجلة"}
        emptyDescription={
          search
            ? "جرب البحث بكلمة أخرى"
            : "قم بإضافة أدوية جديدة للبدء في تتبع المخزون"
        }
      />
    </TabSection>
  );

  const patientsContent = (
    <PatientAffairsTab
      permissions={medicalPermission}
      patients={patientsWithStats}
      searchQuery={search || ""}
    />
  );

  return (
    <PageContainer className="max-w-[1600px] mx-auto pb-12">
      <MedicalWorkspaceClient
        activeTab={tab}
        searchQuery={search || ""}
        stats={stats}
        visits={visits}
        medicines={medicines}
        patients={patientsWithStats}
        permissions={medicalPermission}
        visitsContent={visitsContent}
        medicinesContent={medicinesContent}
        patientsContent={patientsContent}
      />
    </PageContainer>
  );
}
