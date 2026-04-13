import { notFound } from "next/navigation";
import { authenticate } from "@/lib/auth/middleware";
import { connectToDatabase } from "@/lib/db/connect";
import { Mission, type IMission } from "@/lib/db/models/Mission";
import { canViewModule, canEditModule } from "@/lib/auth/authorization";
import { PageContainer } from "@/components/layout/PageContainer";
import { MissionsClient } from "@/components/arkan-harb/MissionsClient";

export default async function MissionsPage({
  searchParams,
}: {
  searchParams: Promise<{ officerId?: string; status?: string; page?: string; limit?: string }>;
}) {
  interface PopulatedMission extends Omit<IMission, 'officerId' | '_id'> {
    _id: { toString(): string };
    officerId: { _id: { toString(): string }, name: string, rank: string } | null;
  }

  const result = await authenticate();
  if (!result.success) {
    return notFound();
  }

  const user = result.user!;
  if (!canViewModule(user, "arkan_harb") && !canViewModule(user, "officers")) {
    return notFound();
  }

  const params = await searchParams;
  const page = Number(params.page) || 1;
  const limit = Number(params.limit) || 10;
  const officerFilter = params.officerId || "";
  const statusFilter = params.status || "";

  await connectToDatabase();
  
  const query: Record<string, unknown> = {};
  if (officerFilter) query.officerId = officerFilter;
  if (statusFilter) query.status = statusFilter;

  const skip = (page - 1) * limit;
  
  // Need to ensure Officer model is registered for populate
  const [items, totalCount] = await Promise.all([
    Mission.find(query)
      .sort({ startDate: -1 })
      .skip(skip)
      .limit(limit)
      .populate("officerId", "name rank")
      .lean(),
    Mission.countDocuments(query),
  ]);
  
  const formattedMissions = (items as unknown as PopulatedMission[]).map((m) => ({
    id: m._id.toString(),
    officerId: m.officerId?._id?.toString() || m.officerId?.toString() || "",
    officerName: m.officerId?.name || "ضابط غير معروف",
    title: m.title,
    description: m.description,
    destination: m.destination,
    startDate: m.startDate,
    endDate: m.endDate,
    status: m.status,
    createdBy: m.createdBy.toString(),
    createdAt: m.createdAt,
  }));

  return (
    <PageContainer>
      <MissionsClient
        initialMissions={formattedMissions}
        total={totalCount}
        page={page}
        limit={limit}
        officerFilter={officerFilter}
        statusFilter={statusFilter}
        canEdit={canEditModule(user, "arkan_harb")}
      />
    </PageContainer>
  );
}