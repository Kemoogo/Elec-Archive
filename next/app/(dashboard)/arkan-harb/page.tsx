import { redirect } from "next/navigation";
import { authenticate } from "@/lib/auth/middleware";
import { canViewModule } from "@/lib/auth/authorization";
import { connectToDatabase } from "@/lib/db/connect";
import {
  Leave,
  Mission,
  DailyRollcall,
  PositionAssignment,
  AuditLog,
  Officer,
  type IRollcallEntry,
  type IAuditLog
} from "@/lib/db/models";
import { PageContainer } from "@/components/layout/PageContainer";
import { PageHeader } from "@/components/layout/ModernPageHeader";
import { DashboardCard } from "@/components/dashboard/DashboardCard";
import { CommanderSummary } from "@/components/arkan-harb/CommanderSummary";
import {
  Swords,
  Users,
  ScrollText,
  Shield,
  ArrowLeft,
  ClipboardList,
  FileText,
  Clock,
  Activity
} from "lucide-react";
import Link from "next/link";
import { format } from "date-fns";
import { ar } from "date-fns/locale";

export default async function ArkanHarbDashboard() {
  const result = await authenticate();
  if (!result.success) {
    redirect("/login");
  }

  const user = result.user!;
  // Only arkan_harb:view, admin, or commander can access
  if (!canViewModule(user, "arkan_harb") && user.role !== "admin" && user.role !== "commander") {
    redirect("/");
  }

  await connectToDatabase();

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const [
    activeLeaves,
    activeMissions,
    activePositions,
    todayRollcall,
    recentActivities,
    totalOfficers
  ] = await Promise.all([
    Leave.countDocuments({
      startDate: { $lte: new Date() },
      endDate: { $gte: new Date() },
      status: "approved"
    }),
    Mission.countDocuments({
      status: "active"
    }),
    PositionAssignment.countDocuments({
      status: "active"
    }),
    DailyRollcall.findOne({
      date: { $gte: today, $lt: tomorrow }
    }).lean(),
    AuditLog.find({ module: "arkan_harb" })
      .sort({ createdAt: -1 })
      .limit(5)
      .lean(),
    Officer.countDocuments({ employmentStatus: "active" })
  ]);

  const attendeesCount = todayRollcall?.entries?.filter((e: IRollcallEntry) => e.status === "present").length || 0;
  const rollcallSubmitted = todayRollcall?.status === "submitted";
  const absentCount = totalOfficers - attendeesCount - activeLeaves - activeMissions;

  const stats = [
    {
      title: "الحاضرين اليوم",
      count: rollcallSubmitted ? attendeesCount : null,
      icon: "👥",
      subtitle: rollcallSubmitted ? "بناءً على التمام المعتمد" : "التمام لم يُرسل بعد",
      emptyMessage: !rollcallSubmitted ? "بانتظار التمام" : undefined,
      color: rollcallSubmitted ? ("blue" as const) : ("yellow" as const),
    },
    {
      title: "إجازات اليوم",
      count: activeLeaves,
      icon: "📜",
      subtitle: "ضباط في إجازة حالياً",
      color: "yellow" as const,
    },
    {
      title: "مأموريات نشطة",
      count: activeMissions,
      icon: "🛡️",
      subtitle: "مهام خارجية جارية",
      color: "green" as const,
    },
    {
      title: "الوظائف المشغولة",
      count: activePositions,
      icon: "💼",
      subtitle: "تعيينات وظيفية سارية",
      color: "purple" as const,
    },
  ];

  return (
    <PageContainer>
      <PageHeader
        title="لوحة قيادة أركان الحرب"
        description="نظام إدارة القوة والتمام اليومي والمهام"
        icon={<Swords className="w-6 h-6" />}
      />

      {(user.role === "admin" || user.role === "commander") && (
        <CommanderSummary
          totalOfficers={totalOfficers}
          present={attendeesCount}
          mission={activeMissions}
          leave={activeLeaves}
          absent={absentCount}
        />
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {stats.map((stat, i) => (
          <DashboardCard key={i} {...stat} />
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Quick Links Section */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-(--color-surface) border border-(--color-border) rounded-2xl p-6 shadow-sm">
            <h3 className="text-sm font-black text-(--color-primary) mb-4 flex items-center gap-2">
              <div className="w-1.5 h-4 bg-(--color-primary) rounded-full"></div>
              روابط سريعة
            </h3>
            <div className="space-y-3">
              <QuickLink
                href="/arkan-harb/rollcall"
                label="تسجيل التمام اليومي"
                icon={<ClipboardList className="w-4 h-4" />}
              />
              <QuickLink
                href="/arkan-harb/leaves"
                label="سجل الإجازات"
                icon={<ScrollText className="w-4 h-4" />}
              />
              <QuickLink
                href="/arkan-harb/missions"
                label="المأموريات والمهام"
                icon={<FileText className="w-4 h-4" />}
              />
              <QuickLink
                href="/arkan-harb/positions"
                label="التنظيم والوظائف"
                icon={<Shield className="w-4 h-4" />}
              />
            </div>
          </div>
        </div>

        {/* Recent Activities Section */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-(--color-surface) border border-(--color-border) rounded-2xl p-6 shadow-sm min-h-[300px]">
            <h3 className="text-sm font-black text-(--color-primary) mb-6 flex items-center gap-2">
              <div className="w-1.5 h-4 bg-(--color-primary) rounded-full"></div>
              أحدث الأنشطة
            </h3>

            {recentActivities.length > 0 ? (
              <div className="space-y-4">
                {(recentActivities as unknown as IAuditLog[]).map((log: IAuditLog) => (
                  <div key={log._id?.toString()} className="flex items-start gap-4 p-3 bg-slate-50/50 rounded-xl border border-transparent hover:border-slate-100 transition-all group">
                    <div className="p-2 bg-white rounded-lg shadow-sm group-hover:bg-(--color-primary)/10 transition-colors">
                      <Activity className="w-4 h-4 text-slate-400 group-hover:text-(--color-primary)" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <span className="text-[13px] font-bold text-(--app-muted-foreground)">
                          {log.userName}
                        </span>
                        <span className="text-[11px] text-slate-400 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {format(new Date(log.createdAt), "p", { locale: ar })}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 line-clamp-2">
                        {log.description}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-center opacity-50">
                <Clock className="w-10 h-10 mb-3 text-slate-300" />
                <p className="text-sm font-medium text-slate-400">لا توجد أنشطة مسجلة بعد</p>
              </div>
            )}

            {recentActivities.length > 0 && (
              <div className="mt-6 pt-4 border-t border-slate-100">
                <Link href="/audit-logs?module=arkan_harb" className="text-[11px] font-bold text-(--color-primary) hover:underline flex items-center justify-center gap-1">
                  عرض سجل التدقيق الكامل
                  <ArrowLeft className="w-3 h-3 rotate-180" />
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </PageContainer>
  );
}

function QuickLink({ href, label, icon }: { href: string; label: string; icon: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="flex items-center justify-between p-3 bg-slate-50 hover:bg-(--color-primary)/5 border border-transparent hover:border-(--color-primary)/20 rounded-xl transition-all group"
    >
      <div className="flex items-center gap-3">
        <div className="text-slate-400 group-hover:text-(--color-primary) transition-colors">
          {icon}
        </div>
        <span className="text-sm font-bold text-(--app-muted-foreground) group-hover:text-(--color-primary)">
          {label}
        </span>
      </div>
      <ArrowLeft className="w-4 h-4 text-slate-300 group-hover:text-(--color-primary) -translate-x-2 opacity-0 group-hover:translate-x-0 group-hover:opacity-100 transition-all" />
    </Link>
  );
}




