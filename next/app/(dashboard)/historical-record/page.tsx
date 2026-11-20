export const dynamic = "force-dynamic";
export const revalidate = 0;

import { redirect } from "next/navigation";
import { authenticate } from "@/lib/auth/middleware";
import { connectToDatabase } from "@/lib/db/connect";
import {
  canViewHistoricalRecord,
  getHistoricalRecordCapabilities,
} from "@/lib/historical-record/access";
import {
  getUnitHistoricalProfile,
  queryHistoricalCommanders,
  queryHistoricalVisits,
  queryUnitMilestones,
} from "@/lib/historical-record/queries";
import type { HistoricalRecordTab } from "@/types/historical-record";
import { HistoricalRecordClient } from "@/components/historical-record/HistoricalRecordClient";

const VALID_TABS: HistoricalRecordTab[] = ["visits", "commanders", "unit-info"];

function resolveInitialTab(tab?: string): HistoricalRecordTab {
  if (tab && VALID_TABS.includes(tab as HistoricalRecordTab)) {
    return tab as HistoricalRecordTab;
  }
  return "visits";
}

export default async function HistoricalRecordPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const auth = await authenticate();
  if (!auth.success || !auth.user) {
    redirect("/login?redirect=%2Fhistorical-record");
  }

  const user = auth.user;
  if (!canViewHistoricalRecord(user)) {
    redirect("/");
  }

  const params = await searchParams;
  const initialTab = resolveInitialTab(params.tab);
  const capabilities = getHistoricalRecordCapabilities(user);

  await connectToDatabase();

  const [visits, commanders, unitProfile, milestones] = await Promise.all([
    queryHistoricalVisits({ sortOrder: "desc" }),
    queryHistoricalCommanders({ sortOrder: "desc", status: "all" }),
    getUnitHistoricalProfile(),
    queryUnitMilestones({ sortOrder: "desc" }),
  ]);

  return (
    <HistoricalRecordClient
      initialTab={initialTab}
      capabilities={capabilities}
      initialVisits={visits}
      initialCommanders={commanders}
      initialUnitProfile={unitProfile}
      initialMilestones={milestones}
    />
  );
}
