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

async function getDashboardData(userRole: string, department: string, canViewArkanHarb: boolean) {
  await connectToDatabase();

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const isAdminOrCommander = userRole === "admin" || userRole === "commander";

  const data = {
    faxes: null as { pendingCount: number; totalCount: number } | null,
    rollcall: null as {
      todaySubmitted: boolean;
      presentCount: number;
      absentCount: number;
    } | null,
    arkanHarb: null as {
        rollcallSubmitted: boolean;
        activeCount: number;
    } | null,
    medical: null as { expiredCount: number; lowStockCount: number } | null,
    courses: null as { activeCount: number } | null,
    students: null as { totalCount: number } | null,
  };

  try {
    if (isAdminOrCommander || department === "fax") {
      const pendingCount = await Fax.countDocuments({ status: "pending" });
      const totalCount = await Fax.countDocuments();
      data.faxes = { pendingCount, totalCount };
    }
  } catch {
    // graceful per-card failure
  }

  try {
    if (isAdminOrCommander || department === "officers") {
      const todayRollcall = await DailyRollcall.findOne({
        date: { $gte: today, $lt: tomorrow },
      });

      if (todayRollcall) {
        const entries = todayRollcall.entries;
        data.rollcall = {
          todaySubmitted: todayRollcall.status === "submitted",
          presentCount: entries.filter((e: { status: string }) => e.status === "present").length,
          absentCount: entries.filter((e: { status: string }) => e.status === "absent").length,
        };
      } else {
        data.rollcall = { todaySubmitted: false, presentCount: 0, absentCount: 0 };
      }
    }
  } catch {
    // graceful per-card failure
  }

  try {
    if (isAdminOrCommander || canViewArkanHarb) {
      const todayRollcall = await DailyRollcall.findOne({
        date: { $gte: today, $lt: tomorrow },
      });
      const activeMissionsCount = await Mission.countDocuments({ 
          status: { $in: ["scheduled", "ongoing"] },
          startDate: { $lte: new Date() }
      });
      // Simplified active count for demo purposes
      data.arkanHarb = {
        rollcallSubmitted: todayRollcall?.status === "submitted",
        activeCount: activeMissionsCount,
      };
    }
  } catch {
    // graceful
  }

  try {
    if (isAdminOrCommander || department === "medical") {
      const expiredCount = await Medicine.countDocuments({ "batches.expiryDate": { $lt: new Date() } });
      const lowStockCount = await Medicine.countDocuments({ $expr: { $lt: ["$totalQuantity", "$minThreshold"] } });
      data.medical = { expiredCount, lowStockCount };
    }
  } catch {
    // graceful per-card failure
  }

  try {
    if (isAdminOrCommander || department === "education") {
      const activeCount = await Course.countDocuments({ status: { $in: ["ongoing", "upcoming"] } });
      data.courses = { activeCount };
    }
  } catch {
    // graceful per-card failure
  }

  try {
    if (isAdminOrCommander || department === "students") {
      const totalCount = await Student.countDocuments();
      data.students = { totalCount };
    }
  } catch {
    // graceful per-card failure
  }

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
    const data = await getDashboardData(user.role, user.department, true);

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
            color="yellow"
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
        </div>
      </div>
    );
  }

  if (user.role === "employee") {
    const permissions = user.permissions;
    const canViewArkanHarb = permissions.arkan_harb !== "none";
    const assignedModules = Object.entries(permissions)
      .filter(([, level]) => level !== "none")
      .map(([module]) => module);

    if (assignedModules.length === 1 && !canViewArkanHarb) {
      redirect(`/${assignedModules[0]}`);
    }

    const data = await getDashboardData(user.role, user.department, canViewArkanHarb);

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
          color: "yellow",
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
