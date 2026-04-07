import { connectToDatabase } from "@/lib/db/connect";
import { authenticate } from "@/lib/auth/middleware";
import { redirect } from "next/navigation";
import { Fax } from "@/lib/db/models/Fax";
import { faxListQuerySchema } from "@/lib/validations/fax";
import { buildFaxListSort } from "@/lib/fax/queries";
import { FaxTable } from "@/components/fax/FaxTable";
import { FaxFilters } from "@/components/fax/FaxFilters";
import { PageContainer } from "@/components/layout/PageContainer";
import { ModernPageHeader as PageHeader, PrimaryHeaderBtn } from "@/components/layout/ModernPageHeader";
import { Mail, Plus } from "lucide-react";
import type { Types } from "mongoose";

interface FaxListPageProps {
  searchParams: Promise<Record<string, string | undefined>>;
}

export default async function FaxListPage({ searchParams }: FaxListPageProps) {
  const auth = await authenticate();
  if (!auth.success) {
    redirect("/login");
  }

  const faxPermission = auth.user!.permissions.fax;
  if (faxPermission === "none") {
    redirect("/dashboard");
  }

  await connectToDatabase();

  const params = await searchParams;
  const parsed = faxListQuerySchema.safeParse(params);

  const { page, limit, status, search, dateFrom, dateTo, sort, forwardedToMe } = parsed.success
    ? parsed.data
    : { page: 1, limit: 20, status: undefined, search: undefined, dateFrom: undefined, dateTo: undefined, sort: "-date" as const, forwardedToMe: false };

  const query: Record<string, unknown> = {};

  if (status) query.status = status;
  if (search) {
    const searchRegex = { $regex: search, $options: "i" };
    query.$or = [
      { faxNumber: searchRegex },
      { subject: searchRegex },
      { fromEntity: searchRegex },
    ];
  }
  if (dateFrom || dateTo) {
    const dateQuery: Record<string, Date> = {};
    if (dateFrom) dateQuery.$gte = new Date(dateFrom);
    if (dateTo) dateQuery.$lte = new Date(dateTo);
    query.date = dateQuery;
  }
  if (forwardedToMe) {
    query.$or = [
      { forwardedToId: auth.user!.id, status: "forwarded" },
      { forwardedToDepartment: auth.user!.department, status: "forwarded" },
    ];
  }

  const sortObj = buildFaxListSort(sort);
  const skip = (page - 1) * limit;

  const [faxes, total] = await Promise.all([
    Fax.find(query)
      .sort(sortObj)
      .skip(skip)
      .limit(limit)
      .populate("uploadedBy", "fullName")
      .lean(),
    Fax.countDocuments(query),
  ]);

  const totalPages = Math.ceil(total / limit);

  const serializedFaxes = faxes.map((fax) => {
    const uploadedBy = fax.uploadedBy as { _id: Types.ObjectId; fullName: string };
    return {
      _id: (fax._id as Types.ObjectId).toString(),
      faxNumber: fax.faxNumber,
      date: (fax.date as Date)?.toISOString() ?? new Date().toISOString(),
      fromEntity: fax.fromEntity,
      subject: fax.subject,
      status: fax.status,
      uploadedBy: {
        _id: uploadedBy._id.toString(),
        fullName: uploadedBy.fullName,
      },
      createdAt: (fax.createdAt as Date)?.toISOString() ?? new Date().toISOString(),
    };
  });

  const canCreate = auth.user!.permissions.fax === "edit";

  return (
    <PageContainer className="max-w-[1600px] mx-auto pb-12">
      <PageHeader 
        title="قسم الفاكس"
        description={`إجمالي ${total} فاكس`}
        icon={<Mail className="w-6 h-6" />}
        action={
          canCreate && (
            <PrimaryHeaderBtn href="/fax/new" label="رفع فاكس جديد" icon={<Plus className="w-4 h-4" />} />
          )
        }
      />

      <FaxFilters />

      <FaxTable faxes={serializedFaxes} />

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2" dir="ltr">
          {page > 1 && (
            <a
              href={`/fax?${new URLSearchParams({ ...params, page: String(page - 1) }).toString()}`}
              className="rounded-md bg-(--app-surface) px-3 py-2 text-sm text-(--app-white) hover:bg-white/10"
            >
              السابق
            </a>
          )}
          <span className="text-sm text-(--app-muted-foreground)">
            صفحة {page} من {totalPages}
          </span>
          {page < totalPages && (
            <a
              href={`/fax?${new URLSearchParams({ ...params, page: String(page + 1) }).toString()}`}
              className="rounded-md bg-(--app-surface) px-3 py-2 text-sm text-(--app-white) hover:bg-white/10"
            >
              التالي
            </a>
          )}
        </div>
      )}
    </PageContainer>
  );
}
