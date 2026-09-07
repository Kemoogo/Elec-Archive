import { authenticate } from "@/lib/auth/middleware";
import { redirect } from "next/navigation";
import { AuditLogPageClient } from "@/components/dashboard/AuditLogPageClient";

export default async function AuditLogPage() {
  const auth = await authenticate();

  if (!auth.success) {
    redirect("/login");
  }

  if (auth.user!.role !== "admin") {
    redirect("/");
  }

  return <AuditLogPageClient />;
}
