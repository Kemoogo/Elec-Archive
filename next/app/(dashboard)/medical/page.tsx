import { TabSection } from "@/components/ui/tab-section";
import { connectToDatabase } from "@/lib/db/connect";
import { authenticate } from "@/lib/auth/middleware";
import { redirect } from "next/navigation";
import { getDashboardStats } from "@/lib/medical/queries";
import { PageContainer } from "@/components/layout/PageContainer";
import { Activity, Pill, Users } from "lucide-react";
import { FolderTabs } from "@/components/ui/folder-tabs";
import { MedicalVisit as MedicalVisitModel, IMedicalVisit } from "@/lib/db/models/MedicalVisit";
import { Medicine as MedicineModel, IMedicine, IMedicineBatch } from "@/lib/db/models/Medicine";
import { MedicalPatient as MedicalPatientModel } from "@/lib/db/models/MedicalPatient";
import Link from "next/link";
import { type Types } from "mongoose";
import type { QueryFilter } from "mongoose";

import { VisitTable } from "@/components/medical/VisitTable";
import { MedicineTable } from "@/components/medical/MedicineTable";
import { PatientAffairsTab } from "@/components/medical/PatientAffairsTab";
import { MedicalPageHeader } from "@/components/medical/MedicalPageHeader";
import { SectionWrapper } from "@/components/ui/section-wrapper";
import { cn } from "@/lib/utils";

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
  const isTabView = !!tab;

  await connectToDatabase();

  const statsPromise = getDashboardStats();

  // Visit query with search and filters
  const visitQuery: QueryFilter<IMedicalVisit> = {};
  if (search && tab === "visits") {
    // First find any patients matching the search
    const matchingPatients = await MedicalPatientModel.find({
      $or: [
        { patientName: { $regex: search, $options: "i" } },
        { patientId: { $regex: search, $options: "i" } },
      ],
    })
      .select("_id")
      .lean();

    const matchingPatientIds = matchingPatients.map((p) => p._id);

    visitQuery.$or = [
      { patientId: { $in: matchingPatientIds } },
      { diagnosis: { $regex: search, $options: "i" } },
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
  if (search && tab === "medicines") {
    medicineQuery.$or = [
      { name: { $regex: search, $options: "i" } },
      { concentration: { $regex: search, $options: "i" } },
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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const pipeline: any[] = [
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
    if (search && tab === "patients") {
      pipeline.push({
        $match: {
          $or: [
            { patientName: { $regex: search, $options: "i" } },
            { patientId: { $regex: search, $options: "i" } },
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
    dispensedMedicines: (v.dispensedMedicines || []).map((m) => {
      const med = m.medicineId;
      const isObject = med && typeof med === "object" && "name" in med;
      const medicineName = isObject
        ? `${med.name} ${med.concentration || ""} ${med.unit || ""}`.trim()
        : "دواء غير معروف";
      const medicineId = isObject
        ? med._id.toString()
        : med.toString();
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

  const cards = [
    { label: "زيارات اليوم", value: stats.visitsToday, color: "blue" },
    { label: "أدوية تحت الحد الأدنى", value: stats.lowStockCount, color: "orange" },
    { label: "أدوية منتهية الصلاحية", value: stats.expiredCount, color: "red" },
    { label: "إجمالي الأدوية", value: stats.totalMedicines, color: "green" },
  ];

  const colorClasses: Record<string, string> = {
    blue: "bg-(--app-info)/20 border-(--app-info)/30 text-(--app-info)",
    orange: "bg-(--app-warning)/20 border-(--app-warning)/30 text-(--app-warning)",
    red: "bg-(--app-error)/20 border-(--app-error)/30 text-(--app-error)",
    green: "bg-(--app-success)/20 border-(--app-success)/30 text-(--app-success)",
  };



  const medicalPermission = auth.user!.permissions.medical;

  const tabs = [
    {
      id: "visits",
      label: "سجل الزيارات",
      icon: <Activity className="w-[18px] h-[18px]" />,
      content: (
        <TabSection
          title={search ? `نتائج البحث عن: ${search}` : "أحدث الزيارات"}
          icon={Activity}
        >
          <VisitTable
            visits={visits}
            emptyTitle={search ? "لا توجد نتائج بحث" : "لا توجد زيارات مسجلة"}
            emptyDescription={search ? "جرب البحث بكلمة أخرى" : "سجل أول زيارة طبية للبدء في بناء قاعدة البيانات"}
            permissions={medicalPermission}
          />
        </TabSection>
      ),
    },
    {
      id: "medicines",
      label: "مخزون الأدوية",
      icon: <Pill className="w-[18px] h-[18px]" />,
      content: (
        <TabSection
          title={search ? `نتائج البحث عن: ${search}` : "الأدوية المتاحة"}
          icon={Pill}
        >
          <MedicineTable
            medicines={medicines}
            now={now.toISOString()}
            emptyTitle={search ? "لا توجد نتائج بحث" : "لا توجد أدوية مسجلة"}
            emptyDescription={search ? "جرب البحث بكلمة أخرى" : "قم بإضافة أدوية جديدة للبدء في تتبع المخزون"}
          />
        </TabSection>
      ),
    },
    {
      id: "patients",
      label: "شئون المرضى",
      icon: <Users className="w-[18px] h-[18px]" />,
      content: (
        <PatientAffairsTab
          permissions={medicalPermission}
          patients={patientsWithStats}
          searchQuery={search || ""}
        />
      ),
    },
  ];

  return (
    <PageContainer className="max-w-[1600px] mx-auto pb-12">
      <MedicalPageHeader tab={tab} searchQuery={search || ""} />

      {!isTabView ? (
        <div className="space-y-8 animate-in fade-in duration-500">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {cards.map((card) => (
              <div
                key={card.label}
                className={cn(
                  "rounded-2xl border p-6 shadow-sm text-foreground transition-all hover:shadow-md",
                  colorClasses[card.color as keyof typeof colorClasses]
                )}
              >
                <div className="text-3xl font-bold mb-2">{card.value}</div>
                <div className="text-sm font-medium">{card.label}</div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Link href="/medical?tab=visits" className="group block h-full">
              <SectionWrapper className="h-full flex flex-col items-center text-center gap-4 hover:shadow-2xl hover:-translate-y-1 transition-all">
                <div className="w-16 h-16 rounded-2xl bg-(--app-info)/10 text-(--app-info) flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Activity className="w-8 h-8" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-(--color-primary) mb-2">سجل الزيارات</h3>
                  <p className="text-(--app-muted-foreground)">عرض وإدارة كافة الزيارات الطبية المسجلة</p>
                </div>
                <div className="mt-4 px-6 py-2 rounded-xl bg-(--app-info)/10 text-(--app-info) text-sm font-bold opacity-0 group-hover:opacity-100 transition-opacity">
                  فتح السجل
                </div>
              </SectionWrapper>
            </Link>

            <Link href="/medical?tab=medicines" className="group block h-full">
              <SectionWrapper className="h-full flex flex-col items-center text-center gap-4 hover:shadow-2xl hover:-translate-y-1 transition-all">
                <div className="w-16 h-16 rounded-2xl bg-(--app-success)/10 text-(--app-success) flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Pill className="w-8 h-8" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-(--color-primary) mb-2">مخزون الأدوية</h3>
                  <p className="text-(--app-muted-foreground)">إدارة الأدوية، الشحنات، وتتبع تواريخ الصلاحية</p>
                </div>
                <div className="mt-4 px-6 py-2 rounded-xl bg-(--app-success)/10 text-(--app-success) text-sm font-bold opacity-0 group-hover:opacity-100 transition-opacity">
                  فتح المخزون
                </div>
              </SectionWrapper>
            </Link>

            <Link href="/medical?tab=patients" className="group block h-full">
              <SectionWrapper className="h-full flex flex-col items-center text-center gap-4 hover:shadow-2xl hover:-translate-y-1 transition-all">
                <div className="w-16 h-16 rounded-2xl bg-(--app-info)/10 text-(--app-info) flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Users className="w-8 h-8" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-(--color-primary) mb-2">شئون المرضى</h3>
                  <p className="text-(--app-muted-foreground)">البحث عن المرضى وعرض ملفات الطبية</p>
                </div>
                <div className="mt-4 px-6 py-2 rounded-xl bg-(--app-info)/10 text-(--app-info) text-sm font-bold opacity-0 group-hover:opacity-100 transition-opacity">
                  فتح القسم
                </div>
              </SectionWrapper>
            </Link>
          </div>
        </div>
      ) : (
        <div className="animate-tab-enter">
          <FolderTabs tabs={tabs} initialTab={tab || "visits"} />
        </div>
      )}
    </PageContainer>
  );
}
