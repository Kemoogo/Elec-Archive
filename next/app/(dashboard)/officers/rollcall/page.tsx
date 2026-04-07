import { redirect } from "next/navigation";
import { authenticate } from "@/lib/auth/middleware";
import { connectToDatabase } from "@/lib/db/connect";
import { Officer } from "@/lib/db/models/Officer";
import { DailyRollcall } from "@/lib/db/models/DailyRollcall";
import { canViewOfficers, canViewCommanderRollcall } from "@/lib/officers/access";
import { RANK_LABELS, type OfficerRank } from "@/lib/db/models/Officer";
import type { IRollcallEntry } from "@/lib/db/models/DailyRollcall";
import { RollcallSheet } from "@/components/officers/RollcallSheet";
import { RollcallSummary } from "@/components/officers/RollcallSummary";
import { PageContainer } from "@/components/layout/PageContainer";
import { PageHeader } from "@/components/layout/ModernPageHeader";

function getTodayDate(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

export default async function RollcallPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
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
  const date = params.date ?? getTodayDate();
  const isCommander = canViewCommanderRollcall(user);

  await connectToDatabase();

  const queryDate = new Date(date);
  queryDate.setHours(0, 0, 0, 0);
  const nextDay = new Date(queryDate);
  nextDay.setDate(nextDay.getDate() + 1);

  const rollcall = await DailyRollcall.findOne({
    date: { $gte: queryDate, $lt: nextDay },
  }).lean();

  const activeOfficers = await Officer.find({ employmentStatus: "active" })
    .sort({ rank: 1, fullName: 1 })
    .lean();

  const roster = activeOfficers.map((o) => ({
    id: o._id.toString(),
    militaryId: o.militaryId,
    fullName: o.fullName,
    rank: o.rank,
    rankLabel: RANK_LABELS[o.rank as OfficerRank] ?? o.rank,
  }));

  if (rollcall && rollcall.status === "submitted") {
    return (
      <PageContainer className="font-sans">
        <PageHeader
          title={
            <>
              تمام يوم <span className="text-(--color-primary)">{date}</span>
            </>
          }
          description="سجل حضور وغياب موثق نهائياً"
          backHref="/officers"
          backLabel="العودة لشئون الضباط"
        />

        <RollcallSummary
          rollcall={{
            date,
            status: rollcall.status,
            targetOfficerCount: rollcall.targetOfficerCount,
            entries: rollcall.entries.map((e: IRollcallEntry) => ({
              officerId: e.officerId.toString(),
              militaryId: e.militaryId,
              fullName: e.fullName,
              rank: e.rank,
              rankLabel: RANK_LABELS[e.rank as keyof typeof RANK_LABELS] ?? e.rank,
              status: e.status,
              note: e.note,
            })),
            submittedAt: rollcall.submittedAt?.toISOString() ?? "",
            viewedByCommander: rollcall.viewedByCommander,
          }}
          isCommander={isCommander}
        />
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <PageHeader
        title={
          <>
            كشف التمام <span className="text-(--color-primary)">اليومي</span>
          </>
        }
        description={`سجل التواجد والغياب ليوم ${date}`}
        backHref="/officers"
        backLabel="العودة لشئون الضباط"
      />

      <RollcallSheet
        date={date}
        roster={roster}
        existingEntries={
          rollcall?.entries.map((e: IRollcallEntry) => ({
            officerId: e.officerId.toString(),
            status: e.status,
            note: e.note,
          })) ?? []
        }
        isDraft={rollcall?.status === "draft"}
      />
    </PageContainer>
  );
}