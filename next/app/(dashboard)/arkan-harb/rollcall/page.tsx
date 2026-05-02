import { redirect } from "next/navigation";
import { authenticate } from "@/lib/auth/middleware";
import { connectToDatabase } from "@/lib/db/connect";
import { DailyRollcall } from "@/lib/db/models/DailyRollcall";
import { canViewModule, canEditModule } from "@/lib/auth/authorization";
import type { IRollcallEntry } from "@/lib/db/models/DailyRollcall";
import { RollcallSheet } from "@/components/officers/RollcallSheet";
import { RollcallSummary } from "@/components/officers/RollcallSummary";
import { PageContainer } from "@/components/layout/PageContainer";
import { PageHeader } from "@/components/layout/ModernPageHeader";
import { ClipboardList } from "lucide-react";
import { RollcallDateSelector } from "@/components/arkan-harb/RollcallDateSelector";

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
  if (!canViewModule(user, "arkan_harb") && !canViewModule(user, "officers")) {
    redirect("/");
  }

  const params = await searchParams;
  const date = params.date ?? getTodayDate();
  const isCommander = canEditModule(user, "arkan_harb") || canEditModule(user, "officers"); // Either can edit if they have edit permission

  await connectToDatabase();

  const queryDate = new Date(date);
  queryDate.setHours(0, 0, 0, 0);
  const nextDay = new Date(queryDate);
  nextDay.setDate(nextDay.getDate() + 1);

  const rollcall = await DailyRollcall.findOne({
    date: { $gte: queryDate, $lt: nextDay },
  }).lean();

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
          icon={<ClipboardList className="w-6 h-6" />}
          backHref="/arkan-harb"
          backLabel="العودة لأركان الحرب"
          action={<RollcallDateSelector initialDate={date} />}
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
              rankLabel: e.rank, // Assuming rankLabel is stored or can be derived
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

  // For draft or new rollcall, we need to get the officer roster
  // Since we're using the ark-harb API which proxies to officers, we'll reuse the same logic
  // but we need to get active officers from the database
  const Officer = await import("@/lib/db/models/Officer").then(
    (mod) => mod.Officer
  );
  const { RANK_LABELS } = await import("@/lib/db/models/Officer");
  type OfficerRank = keyof typeof RANK_LABELS;

  const activeOfficers = await Officer.find({ employmentStatus: "active" })
    .sort({ rank: 1, fullName: 1 })
    .lean();

  const roster = activeOfficers.map((o) => ({
    id: o._id.toString(),
    militaryId: o.militaryId,
    fullName: o.fullName,
    rank: o.rank,
    rankLabel: `${RANK_LABELS[o.rank as OfficerRank] ?? o.rank}${o.isArkanHarb ? " أ ح" : ""}`,
  }));

  return (
    <PageContainer>
      <PageHeader
        title={
          <>
            كشف التمام <span className="text-(--color-primary)">اليومي</span>
          </>
        }
        description={`سجل التواجد والغياب ليوم ${date}`}
        icon={<ClipboardList className="w-6 h-6" />}
        backHref="/arkan-harb"
        backLabel="العودة لأركان الحرب"
        action={<RollcallDateSelector initialDate={date} />}
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