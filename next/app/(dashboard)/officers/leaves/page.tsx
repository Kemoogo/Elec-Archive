import { redirect } from "next/navigation";
import { authenticate } from "@/lib/auth/middleware";
import { connectToDatabase } from "@/lib/db/connect";
import { Leave } from "@/lib/db/models/Leave";
import { Officer } from "@/lib/db/models/Officer";
import { canViewOfficers, canEditOfficers } from "@/lib/officers/access";
import { LEAVE_TYPE_LABELS, LEAVE_STATUS_LABELS } from "@/lib/db/models/Leave";
import { LeaveRegister } from "@/components/officers/LeaveRegister";
import { PageContainer } from "@/components/layout/PageContainer";
import { PageHeader } from "@/components/layout/ModernPageHeader";

export default async function LeavesPage() {
  const result = await authenticate();
  if (!result.success) {
    redirect("/login");
  }

  const user = result.user!;
  if (!canViewOfficers(user)) {
    redirect("/");
  }

  const canEdit = canEditOfficers(user);

  await connectToDatabase();

  const [leaves, officers] = await Promise.all([
    Leave.find({}).sort({ createdAt: -1 }).limit(50).lean(),
    Officer.find({ employmentStatus: "active" }).sort({ fullName: 1 }).lean(),
  ]);

  const officerMap = new Map(officers.map((o) => [o._id.toString(), o]));

  const serializedLeaves = leaves.map((l) => {
    const officer = officerMap.get(l.officerId.toString());
    return {
      id: l._id.toString(),
      officerId: l.officerId.toString(),
      officerName: officer?.fullName ?? "غير معروف",
      officerMilitaryId: officer?.militaryId ?? "",
      category: l.category,
      categoryLabel: l.category === "leave" ? "إجازة" : "غياب",
      type: l.type,
      typeLabel: LEAVE_TYPE_LABELS[l.type as keyof typeof LEAVE_TYPE_LABELS] ?? l.type,
      startDate: l.startDate ? l.startDate.toISOString() : new Date().toISOString(),
      endDate: l.endDate ? l.endDate.toISOString() : new Date().toISOString(),
      reason: l.reason ?? "",
      status: l.status,
      statusLabel: LEAVE_STATUS_LABELS[l.status as keyof typeof LEAVE_STATUS_LABELS] ?? l.status,
    };
  });

  return (
    <PageContainer>
      <PageHeader title="سجل الإجازات والغيابات" />
      <LeaveRegister
        leaves={serializedLeaves}
        officers={officers.map((o) => ({
          id: o._id.toString(),
          fullName: o.fullName,
          militaryId: o.militaryId,
        }))}
        canEdit={canEdit}
      />
    </PageContainer>
  );
}