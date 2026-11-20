import { redirect } from "next/navigation";
import { authenticate } from "@/lib/auth/middleware";
import { connectToDatabase } from "@/lib/db/connect";
import { Fax } from "@/lib/db/models/Fax";
import { DailyRollcall } from "@/lib/db/models/DailyRollcall";
import { Medicine } from "@/lib/db/models/Medicine";
import { Mission } from "@/lib/db/models/Mission";
import { Course } from "@/lib/db/models/Course";
import { Student } from "@/lib/db/models/Student";
import { ArkanHarbSummaryCard } from "@/components/dashboard/ArkanHarbSummaryCard";
import { DashboardCard } from "@/components/dashboard/DashboardCard";
import { headers } from "next/headers";
import { canViewModule } from "@/lib/auth/authorization";
import type { AuthUser } from "@/lib/auth/types";

async function getDashboardData(user: AuthUser) {
  await connectToDatabase();

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const canFax = canViewModule(user, "fax");
  const canOfficers = canViewModule(user, "officers");
  const canArkanHarb = canViewModule(user, "arkan_harb");
  const canMedical = canViewModule(user, "medical");
  const canEducation = canViewModule(user, "education");
  const canStudents = canViewModule(user, "students");

  const [
    faxTuple,
    todayRollcall,
    activeMissionsCount,
    medTuple,
    coursesCount,
    studentsCount,
  ] = await Promise.all([
    canFax
      ? Promise.all([
          Fax.countDocuments({ status: "pending" }),
          Fax.countDocuments(),
        ]).catch(() => null)
      : Promise.resolve(null),
    canOfficers || canArkanHarb
      ? DailyRollcall.findOne({ date: { $gte: today, $lt: tomorrow } }).lean().catch(() => null)
      : Promise.resolve(null),
    canArkanHarb
      ? Mission.countDocuments({
          status: { $in: ["scheduled", "ongoing"] },
          startDate: { $lte: new Date() },
        }).catch(() => 0)
      : Promise.resolve(null),
    canMedical
      ? Promise.all([
          Medicine.countDocuments({ batches: { $elemMatch: { quantity: { $gt: 0 }, expiryDate: { $lt: new Date() } } } }),
          Medicine.countDocuments({ $expr: { $lt: ["$totalQuantity", "$minThreshold"] } }),
        ]).catch(() => null)
      : Promise.resolve(null),
    canEducation
      ? Course.countDocuments({ status: { $in: ["ongoing", "upcoming"] } }).catch(() => null)
      : Promise.resolve(null),
    canStudents
      ? Student.countDocuments({ status: "active" }).catch(() => null)
      : Promise.resolve(null),
  ]);

  const data = {
    faxes: faxTuple ? { pendingCount: faxTuple[0], totalCount: faxTuple[1] } : null,
    rollcall: canOfficers
      ? todayRollcall
        ? {
            todaySubmitted: todayRollcall.status === "submitted",
            presentCount: (todayRollcall.entries || []).filter((e: { status: string }) => e.status === "present").length,
            absentCount: (todayRollcall.entries || []).filter((e: { status: string }) => e.status === "absent").length,
          }
        : { todaySubmitted: false, presentCount: 0, absentCount: 0 }
      : null,
    arkanHarb: canArkanHarb
      ? {
          rollcallSubmitted: todayRollcall?.status === "submitted",
          activeCount: activeMissionsCount ?? 0,
        }
      : null,
    medical: medTuple ? { expiredCount: medTuple[0], lowStockCount: medTuple[1] } : null,
    courses: coursesCount !== null ? { activeCount: coursesCount } : null,
    students: studentsCount !== null ? { totalCount: studentsCount } : null,
  };

  return data;
}

export default async function DashboardPage() {
  const result = await authenticate();

  if (!result.success) {
    const headersList = await headers();
    const pathname = headersList.get("x-pathname") ?? "/";
    redirect(`/login?redirect=${encodeURIComponent(pathname)}`);
  }

  const user = result.user!;

  if (user.role === "admin") {
    redirect("/admin/users");
  }

  if (user.role === "commander") {
    const data = await getDashboardData(user);

    return (
      <div className="space-y-8">
        <h1 className="text-2xl font-bold text-foreground">نظرة عامة على الأقسام</h1>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {data.arkanHarb && (
            <ArkanHarbSummaryCard 
                rollcallSubmitted={data.arkanHarb.rollcallSubmitted}
                activeCount={data.arkanHarb.activeCount}
            />
          )}
          <DashboardCard
            title="الفاكسات"
            count={data.faxes?.pendingCount ?? null}
            subtitle={data.faxes ? `من أصل ${data.faxes.totalCount} فاكس` : ""}
            color="blue"
            icon="📠"
            href="/fax?status=pending"
            emptyMessage="لا توجد فاكسات معلقة"
          />
          <DashboardCard
            title="تمام اليوم"
            count={data.rollcall?.presentCount ?? null}
            subtitle={
              data.rollcall
                ? data.rollcall.todaySubmitted
                  ? `حاضر: ${data.rollcall.presentCount} | غائب: ${data.rollcall.absentCount}`
                  : "لم يتم التسليم بعد"
                : ""
            }
            color="green"
            icon="👥"
            href="/officers/rollcall"
          />
          <DashboardCard
            title="النقطة الطبية"
            count={
              data.medical
                ? data.medical.expiredCount + data.medical.lowStockCount
                : null
            }
            subtitle={
              data.medical
                ? `منتهي: ${data.medical.expiredCount} | نقص مخزون: ${data.medical.lowStockCount}`
                : ""
            }
            color={data.medical && (data.medical.expiredCount > 0 || data.medical.lowStockCount > 0) ? "red" : "purple"}
            icon="💊"
            href="/medical"
          />
          <DashboardCard
            title="الطلبة"
            count={data.students?.totalCount ?? null}
            subtitle="إجمالي الطلبة"
            color="blue"
            icon="🎓"
            href="/students"
          />
          <DashboardCard
            title="التعليم والدورات"
            count={data.courses?.activeCount ?? null}
            subtitle="دورات نشطة"
            color="red"
            icon="📚"
            href="/education"
          />
          <DashboardCard
            title="السجل التاريخي"
            count={null}
            subtitle="الذاكرة التاريخية للوحدة"
            color="blue"
            icon="🏛️"
            href="/historical-record"
          />
        </div>
      </div>
    );
  }

  if (user.role === "employee") {
    const permissions = user.permissions;
    const canViewArkanHarb = permissions.arkan_harb !== "none";
    const assignedModules = Object.entries(permissions)
      .filter(([, level]) => Boolean(level) && level !== "none")
      .map(([module]) => module);

    if (assignedModules.length === 1 && !canViewArkanHarb) {
      redirect(`/${assignedModules[0].replace("_", "-")}`);
    }

    const data = await getDashboardData(user);

    const moduleCards: {
      module: string;
      title: string;
      color: "blue" | "green" | "purple" | "yellow" | "red";
      icon: string;
      count: number | null;
      subtitle: string;
    }[] = [];

    for (const mod of assignedModules) {
      if (mod === "fax" && data.faxes) {
        moduleCards.push({
          module: "fax",
          title: "الفاكسات",
          color: "blue",
          icon: "📠",
          count: data.faxes.pendingCount,
          subtitle: `من أصل ${data.faxes.totalCount}`,
        });
      }
      if (mod === "officers" && data.rollcall) {
        moduleCards.push({
          module: "officers",
          title: "الضباط",
          color: "green",
          icon: "👥",
          count: data.rollcall.presentCount,
          subtitle: data.rollcall.todaySubmitted ? "تم التمام" : "لم يتم التسليم",
        });
      }
      if (mod === "medical" && data.medical) {
        moduleCards.push({
          module: "medical",
          title: "الطبي",
          color: "purple",
          icon: "💊",
          count: data.medical.expiredCount + data.medical.lowStockCount,
          subtitle: "تنبيهات",
        });
      }
      if (mod === "students" && data.students) {
        moduleCards.push({
          module: "students",
          title: "الطلبة",
          color: "blue",
          icon: "🎓",
          count: data.students.totalCount,
          subtitle: "إجمالي",
        });
      }
      if (mod === "education" && data.courses) {
        moduleCards.push({
          module: "education",
          title: "التعليم",
          color: "red",
          icon: "📚",
          count: data.courses.activeCount,
          subtitle: "دورات نشطة",
        });
      }
      if (mod === "historical_record") {
        moduleCards.push({
          module: "historical-record",
          title: "السجل التاريخي",
          color: "blue",
          icon: "🏛️",
          count: null,
          subtitle: "الذاكرة التاريخية للوحدة",
        });
      }
    }

    return (
      <div className="space-y-8">
        <h1 className="text-2xl font-bold text-foreground">لوحة التحكم</h1>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {data.arkanHarb && (
            <ArkanHarbSummaryCard 
                rollcallSubmitted={data.arkanHarb.rollcallSubmitted}
                activeCount={data.arkanHarb.activeCount}
            />
          )}
          {moduleCards.map((card) => (
            <DashboardCard
              key={card.module}
              title={card.title}
              count={card.count}
              subtitle={card.subtitle}
              color={card.color}
              icon={card.icon}
              href={`/${card.module}`}
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold text-foreground">ملخص القراءة فقط</h1>
      <div className="archive-card">
        <p className="text-foreground">مرحباً، {user.fullName}</p>
        <p className="mt-1 text-sm text-(--app-muted-foreground)">صلاحيات: قراءة فقط</p>
      </div>
    </div>
  );
}
