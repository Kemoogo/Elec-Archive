import { notFound } from "next/navigation";
import { authenticate } from "@/lib/auth/middleware";
import { connectToDatabase } from "@/lib/db/connect";
import { PositionAssignment, type IPositionAssignment } from "@/lib/db/models/PositionAssignment";
import { Officer, type IOfficer } from "@/lib/db/models/Officer";
import { canViewModule, canEditModule } from "@/lib/auth/authorization";
import { PageContainer } from "@/components/layout/PageContainer";
import { PositionsClient } from "@/components/arkan-harb/PositionsClient";

export default async function PositionsPage({
  searchParams,
}: {
  searchParams: Promise<{ officerId?: string; status?: string; page?: string; limit?: string }>;
}) {
  interface PopulatedPosition extends Omit<IPositionAssignment, 'officerId' | 'substituteForOfficerId' | '_id'> {
    _id: { toString(): string };
    officerId: { _id: { toString(): string }, fullName: string, rank: string } | null;
    substituteForOfficerId: { _id: { toString(): string }, fullName: string, rank: string } | null;
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
  const [items, totalCount, allOfficers] = await Promise.all([
    PositionAssignment.find(query)
      .sort({ startDate: -1 })
      .skip(skip)
      .limit(limit)
      .populate("officerId", "fullName rank")
      .populate("substituteForOfficerId", "fullName rank")
      .lean(),
    PositionAssignment.countDocuments(query),
    Officer.find({ employmentStatus: "active" }).select("_id fullName rank militaryId").sort({ fullName: 1 }).lean(),
  ]);
  
  const formattedPositions = (items as unknown as PopulatedPosition[]).map((p) => ({
    id: p._id.toString(),
    officerId: p.officerId?._id?.toString() || p.officerId?.toString() || "",
    officerName: p.officerId?.fullName || "ضابط غير معروف",
    positionTitle: p.positionTitle,
    positionType: p.positionType,
    substituteForOfficerId: p.substituteForOfficerId?._id?.toString() || "",
    substituteForOfficerName: p.substituteForOfficerId?.fullName || "",
    startDate: p.startDate,
    endDate: p.endDate,
    orderNumber: p.orderNumber,
    status: p.status,
    notes: p.notes,
    createdBy: p.createdBy.toString(),
    createdAt: p.createdAt,
  }));

  const formattedOfficers = (allOfficers as unknown as IOfficer[]).map((o) => ({
    id: (o as { _id: { toString: () => string } })._id.toString(),
    name: o.fullName,
    rank: o.rank,
    militaryId: o.militaryId,
  }));

  return (
    <PageContainer>
      <PositionsClient
        initialPositions={formattedPositions}
        officers={formattedOfficers}
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
