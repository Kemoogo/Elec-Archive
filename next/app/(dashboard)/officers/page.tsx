import { redirect } from "next/navigation";
import { authenticate } from "@/lib/auth/middleware";
import { connectToDatabase } from "@/lib/db/connect";
import { Officer } from "@/lib/db/models/Officer";
import { canViewOfficers, canEditOfficers } from "@/lib/officers/access";
import { serializeOfficerListItem } from "@/lib/officers/queries";
import { escapeRegex } from "@/lib/utils";
import { OfficersPageClient } from "@/components/officers/OfficersPageClient";

export default async function OfficersListPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string; status?: string; page?: string; all?: string }>;
}) {
  const result = await authenticate();
  if (!result.success) {
    redirect("/login");
  }

  const user = result.user!;
  if (!canViewOfficers(user)) {
    redirect("/");
  }

  const params = await searchParams;
  const search = params.search ?? "";
  const status = params.status ?? "";
  const showAll = params.all === "true";
  const page = Math.max(1, parseInt(params.page ?? "1", 10) || 1);
  const limit = 20;

  await connectToDatabase();

  const query: Record<string, unknown> = {};
  if (status) query.employmentStatus = status;
  if (!showAll) {
    query.isInUnit = true;
  }
  
  if (search) {
    const searchRegex = { $regex: escapeRegex(search), $options: "i" };
    query.$or = [
      { fullName: searchRegex },
      { militaryId: searchRegex },
      { seniorityNumber: searchRegex },
      { nationalId: searchRegex },
      { phone: searchRegex },
      { batch: searchRegex },
      { position: searchRegex },
      { unit: searchRegex },
    ];
  }

  const [officers, total] = await Promise.all([
    Officer.find(query)
      .collation({ locale: "en", numericOrdering: true })
      .sort({ seniorityNumber: 1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    Officer.countDocuments(query),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / limit));
  const serialized = officers.map((o) => serializeOfficerListItem(o as Parameters<typeof serializeOfficerListItem>[0]));
  const canEdit = canEditOfficers(user);

  return (
    <OfficersPageClient
      initialSearch={search}
      initialStatus={status}
      initialShowAll={showAll}
      officers={serialized}
      page={page}
      totalPages={totalPages}
      total={total}
      canEdit={canEdit}
    />
  );
}
