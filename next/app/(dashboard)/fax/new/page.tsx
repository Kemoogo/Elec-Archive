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
        title="رفع فاكس جديد"
        description="ارفع ملف الفاكس (PDF أو صورة) وأدخل بياناته"
        backHref="/fax"
        backLabel="العودة للقائمة"
      />

      <FaxUploadForm />
    </PageContainer>
  );
}
