import { authenticate } from "@/lib/auth/middleware";
import { redirect } from "next/navigation";
import { AuditLogTable } from "@/components/dashboard/AuditLogTable";
import { PageContainer } from "@/components/layout/PageContainer";
import { PageHeader } from "@/components/layout/ModernPageHeader";
import { History } from "lucide-react";

export default async function AuditLogPage() {
  const auth = await authenticate();

  if (!auth.success) {
    redirect("/login");
  }

  if (auth.user!.role !== "admin" && auth.user!.role !== "commander") {
    redirect("/");
  }

  return (
    <PageContainer className="max-w-[1600px] mx-auto pb-12">
      <PageHeader 
        title="سجل العمليات" 
        subtitle="متابعة التحركات والتغيرات في النظام"
        icon={<History className="w-6 h-6" />}
      />
      <AuditLogTable />
    </PageContainer>
  );
}
