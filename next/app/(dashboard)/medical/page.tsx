import { authenticate } from "@/lib/auth/middleware";
import { redirect } from "next/navigation";
import { getDashboardStats } from "@/lib/medical/queries";
import { PageContainer } from "@/components/layout/PageContainer";
import { ModernPageHeader as PageHeader } from "@/components/layout/ModernPageHeader";
import { Stethoscope } from "lucide-react";
import Link from "next/link";

export default async function MedicalDashboardPage() {
  const auth = await authenticate();
  if (!auth.success || auth.user!.permissions.medical === "none") {
    redirect("/unavailable");
  }

  const stats = await getDashboardStats();

  const cards = [
    { label: "زيارات اليوم", value: stats.visitsToday, color: "blue", href: "/medical/visits" },
    { label: "أدوية تحت الحد الأدنى", value: stats.lowStockCount, color: "orange", href: "/medical/medicines" },
    { label: "أدوية منتهية الصلاحية", value: stats.expiredCount, color: "red", href: "/medical/medicines" },
    { label: "إجمالي المخزون", value: stats.totalMedicines, color: "green", href: "/medical/medicines" },
  ];

  const colorClasses: Record<string, string> = {
    blue: "bg-(--app-info)/20 border-(--app-info)/30 text-(--app-info)",
    orange: "bg-(--app-warning)/20 border-(--app-warning)/30 text-(--app-warning)",
    red: "bg-(--app-error)/20 border-(--app-error)/30 text-(--app-error)",
    green: "bg-(--app-success)/20 border-(--app-success)/30 text-(--app-success)",
  };

  return (
    <PageContainer className="max-w-[1600px] mx-auto pb-12">
      <PageHeader 
        title="لوحة تحكم النقطة الطبية" 
        subtitle="متابعة الزيارات وتوافر الأدوية"
        icon={<Stethoscope className="w-6 h-6" />}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((card) => (
          <Link
            key={card.label}
            href={card.href}
            className={`rounded-xl border p-6 hover:shadow-lg transition-shadow text-foreground ${colorClasses[card.color]}`}
          >
            <div className="text-3xl font-bold mb-2">{card.value}</div>
            <div className="text-sm font-medium">{card.label}</div>
          </Link>
        ))}
      </div>

      <div className="flex gap-4">
        <Link
          href="/medical/visits"
          className="bg-(--app-surface) border border-(--app-border) rounded-xl p-4 hover:shadow-lg transition-shadow flex-1 text-center text-foreground"
        >
          <div className="text-lg font-medium">سجل الزيارات</div>
          <div className="text-sm text-(--app-muted-foreground)">عرض وإدارة الزيارات الطبية</div>
        </Link>
        <Link
          href="/medical/medicines"
          className="bg-(--app-surface) border border-(--app-border) rounded-xl p-4 hover:shadow-lg transition-shadow flex-1 text-center text-foreground"
        >
          <div className="text-lg font-medium">مخزون الأدوية</div>
          <div className="text-sm text-(--app-muted-foreground)">إدارة الأدوية والمخزون</div>
        </Link>
      </div>
    </PageContainer>
  );
}
