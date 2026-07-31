import Link from "next/link";
import { authenticate } from "@/lib/auth/middleware";
import { redirect } from "next/navigation";
import { FaxUploadForm } from "@/components/fax/FaxUploadForm";
import { PageContainer } from "@/components/layout/PageContainer";
import { PageHeader } from "@/components/layout/ModernPageHeader";

export default async function NewFaxPage() {
  const auth = await authenticate();
  if (!auth.success) {
    redirect("/login");
  }

  if (auth.user!.permissions.fax !== "edit") {
    redirect("/fax");
  }

  return (
    <PageContainer className="mx-auto max-w-2xl">
      <PageHeader
        title={
          <span className="flex items-center gap-2 flex-wrap">
            <Link
              href="/fax"
              className="text-(--color-primary) hover:underline hover:text-blue-600 transition-colors"
            >
              الفاكسات والمكاتبات
            </Link>
            <span className="text-(--app-muted-foreground)/50 font-semibold">-</span>
            <span>تسجيل مكاتبة جديدة</span>
          </span>
        }
        description="أرشفة وتخزين المستندات الصادرة والواردة وتوجيهها حسب جهة الاختصاص"
      />

      <FaxUploadForm />
    </PageContainer>
  );
}
