import { connectToDatabase } from "@/lib/db/connect";
import { authenticate } from "@/lib/auth/middleware";
import { redirect } from "next/navigation";
import { Fax, type IFax } from "@/lib/db/models/Fax";
import { faxListQuerySchema } from "@/lib/validations/fax";
import { buildFaxListSort } from "@/lib/fax/queries";
import { FaxTable } from "@/components/fax/FaxTable";
import { FaxPageClient } from "@/components/fax/FaxPageClient";
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
    <FaxPageClient
      initialFaxes={serializedFaxes as unknown as IFax[]}
      total={total}
      totalPages={totalPages}
      page={page}
      canCreate={canCreate}
      initialFilters={{ search, status, dateFrom, dateTo }}
    />
  );
}
