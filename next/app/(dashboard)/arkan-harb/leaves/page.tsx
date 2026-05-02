import { redirect } from "next/navigation";
import { authenticate } from "@/lib/auth/middleware";
import { canViewModule, canEditModule } from "@/lib/auth/authorization";
import { connectToDatabase } from "@/lib/db/connect";
import { Leave, type ILeave } from "@/lib/db/models/Leave";
import { Officer, type IOfficer } from "@/lib/db/models/Officer";
import { LeavesPageClient } from "@/components/officers/LeavesPageClient";

export default async function LeavesPage() {
  const result = await authenticate();
  if (!result.success) {
    redirect("/login");
  }

  const user = result.user!;
  if (!canViewModule(user, "arkan_harb") && !canViewModule(user, "officers")) {
    redirect("/");
  }

  const canEdit = canEditModule(user, "arkan_harb") || canEditModule(user, "officers");

  await connectToDatabase();

  const officersData = await Officer.find({ employmentStatus: "active" })
    .select("fullName militaryId rank")
    .sort({ rank: 1, fullName: 1 })
    .lean();

  const officers = officersData.map((officer: unknown) => {
    const o = officer as { _id: { toString(): string }, fullName: string, militaryId: string };
    return {
      id: o._id.toString(),
      fullName: o.fullName,
      militaryId: o.militaryId,
    };
  });

  const leavesData = await Leave.find()
    .sort({ startDate: -1 })
    .lean();

  const officerMap = new Map(
    officers.map((officer) => [officer.id, officer])
  );

  const leaves = (leavesData as unknown as ILeave[]).map((leave) => {
    const l = leave as unknown as { _id: { toString(): string }, officerId: { toString(): string } } & ILeave;
    const officerIdStr = l.officerId.toString();
    const officer = officerMap.get(officerIdStr);
    return {
      id: l._id.toString(),
      officerId: officerIdStr,
      officerName: officer ? officer.fullName : "غير معروف",
      officerMilitaryId: officer ? officer.militaryId : "",
      category: leave.category,
      categoryLabel: leave.category === "leave" ? "إجازة رسمية" : "غياب / انقطاع",
      type: leave.type,
      typeLabel: leave.type,
      startDate: leave.startDate.toISOString(),
      endDate: leave.endDate.toISOString(),
      reason: leave.reason || "",
      status: leave.status,
      statusLabel: leave.status,
    };
  });

  return (
    <LeavesPageClient initialLeaves={leaves} officers={officers} canEdit={canEdit} />
  );
}