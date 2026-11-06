export const dynamic = "force-dynamic";
export const revalidate = 0;

import { redirect } from "next/navigation";
import { format } from "date-fns";
import { authenticate } from "@/lib/auth/middleware";
import { canViewModule, canEditModule } from "@/lib/auth/authorization";
import { connectToDatabase } from "@/lib/db/connect";
import { Officer, DailyRollcall } from "@/lib/db/models";
import { getUtcDayRange, calculateDailyRollcallEntries } from "@/lib/arkan-harb/rollcall-engine";
import { getExcludedLeadershipOfficerIds } from "@/lib/arkan-harb/roster-engine";
import { getDayName } from "@/lib/utils/date-display";

import {
  fetchArkanHarbDashboardData,
  fetchArkanHarbMissionsData,
  fetchArkanHarbPositionsData,
  fetchArkanHarbLeavesData,
  fetchArkanHarbRollcallData,
  fetchCommanderDecisionsData,
  buildOfficersShortList,
} from "@/lib/arkan-harb/server-queries";

import { ArkanHarbClient } from "@/components/arkan-harb/ArkanHarbClient";
import { ArkanHarbDashboardTab } from "@/components/arkan-harb/ArkanHarbDashboardTab";
import { RollcallView } from "@/components/arkan-harb/RollcallView";
import { LeavesPageClient } from "@/components/officers/LeavesPageClient";
import { MissionsClient } from "@/components/arkan-harb/MissionsClient";
import { PositionsClient } from "@/components/arkan-harb/PositionsClient";
import { DutyRosterTab } from "@/components/arkan-harb/DutyRosterTab";
import { CommanderDecisionsTab } from "@/components/arkan-harb/CommanderDecisionsTab";

export default async function ArkanHarbPage({
  searchParams,
}: {
  searchParams: Promise<{
    tab?: string;
    date?: string;
    search?: string;
    officerId?: string;
    status?: string;
    page?: string;
    limit?: string;
  }>;
}) {
  const result = await authenticate();
  if (!result.success) {
    redirect("/login");
  }

  const user = result.user!;
  if (!canViewModule(user, "arkan_harb") && user.role !== "admin" && user.role !== "commander") {
    redirect("/");
  }

  const params = await searchParams;
  const canEdit = canEditModule(user, "arkan_harb") || canEditModule(user, "officers");

  await connectToDatabase();

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  // Determine active rollcall date
  const now = new Date();
  const isAfter6PM = now.getHours() >= 18;
  const tomorrowDate = new Date(now);
  tomorrowDate.setDate(tomorrowDate.getDate() + 1);

  const rawDate = typeof params.date === "string" ? params.date : "";
  const isValidDate = Boolean(
    rawDate && !isNaN(Date.parse(rawDate)) && /^\d{4}-\d{2}-\d{2}$/.test(rawDate.split("T")[0])
  );

  const rollcallDate = isValidDate
    ? rawDate.split("T")[0]
    : format(isAfter6PM ? tomorrowDate : now, "yyyy-MM-dd");
  const { startOfDay: qDate, nextDay: nDay } = getUtcDayRange(rollcallDate);

  // Parallel database fetch for core domain records
  const [
    dashboardData,
    missionsData,
    positionsData,
    decisionsData,
    activeOfficersList,
    suggestedEntries,
    selectedRollcall,
  ] = await Promise.all([
    fetchArkanHarbDashboardData(),
    fetchArkanHarbMissionsData(today, tomorrow),
    fetchArkanHarbPositionsData(),
    fetchCommanderDecisionsData(typeof params.search === "string" ? params.search : undefined),
    Officer.find({ isInUnit: true, employmentStatus: "active" })
      .collation({ locale: "en", numericOrdering: true })
      .sort({ seniorityNumber: 1 })
      .lean(),
    calculateDailyRollcallEntries(qDate),
    DailyRollcall.findOne({ date: { $gte: qDate, $lt: nDay } }).lean(),
  ]);

  // Inherit latest active custom tables if current day does not have any saved
  const latestRollcallWithTables =
    !selectedRollcall || !selectedRollcall.customTables || selectedRollcall.customTables.length === 0
      ? await DailyRollcall.findOne({
          date: { $lte: qDate },
          "customTables.0": { $exists: true },
        })
          .sort({ date: -1 })
          .lean()
      : null;

  const rosterMap = new Map(suggestedEntries.map((s) => [s.officerId.toString(), s]));
  const officersShort = buildOfficersShortList(activeOfficersList, rosterMap);

  // Fetch leaves data with calculated return times & commander sync
  const leavesData = await fetchArkanHarbLeavesData({
    userRole: user.role,
    today,
    qDate,
    activeOfficersList,
    officersShort,
    externalMissionOfficerIds: missionsData.externalMissionOfficerIds,
  });

  const isRollcallSubmitted = selectedRollcall?.status === "submitted";
  const isRollcallDraft = selectedRollcall?.status === "draft";
  const rollcallDayName = getDayName(qDate);
  const rollcallDateDisplay = `${rollcallDayName} ${format(qDate, "dd-MM-yyyy")}`;

  // Build enriched rollcall officers data & tables
  const rollcallData = await fetchArkanHarbRollcallData({
    rollcallDate,
    selectedRollcall,
    latestRollcallWithTables,
    officerRows: leavesData.officerRows,
    rosterMap,
    primaryPosMap: positionsData.primaryPosMap,
    substitutePosMap: positionsData.substitutePosMap,
    isRollcallSubmitted,
    todayMissionsList: [...missionsData.todayMissionsList, ...missionsData.ongoingMissionsList],
    activeOfficersList,
  });

  // Render individual tab contents cleanly
  const dashboardContent = (
    <ArkanHarbDashboardTab
      userRole={user.role}
      totalOfficers={dashboardData.totalOfficers}
      attendeesCount={dashboardData.attendeesCount}
      activeLeavesCount={dashboardData.activeLeavesCount}
      activeMissionsCount={dashboardData.activeMissionsCount}
      absentCount={dashboardData.absentCount}
      rollcallSubmitted={dashboardData.rollcallSubmitted}
      recentActivities={dashboardData.recentActivities}
      weeklyTrend={dashboardData.weeklyTrend}
      officersData={rollcallData.rollcallOfficersData}
      positionsData={positionsData.formattedPositions}
      pendingLeavesCount={leavesData.pendingRequestsFormatted.length}
    />
  );

  const rollcallContent = (
    <RollcallView
      key={`${rollcallDate}-${selectedRollcall?._id ? String(selectedRollcall._id) : "new"}`}
      date={rollcallDate}
      dateDisplay={rollcallDateDisplay}
      officers={rollcallData.rollcallOfficersData}
      initialCustomTables={rollcallData.serializedCustomTables}
      initialConfirmedOfficerIds={rollcallData.initialConfirmedOfficerIds}
      isSubmitted={isRollcallSubmitted}
      isDraft={isRollcallDraft}
      canEdit={canEdit}
      isAdmin={user.role === "admin"}
      isCommander={user.role === "commander"}
      unitName={missionsData.unitName}
    />
  );

  const leavesContent = (
    <LeavesPageClient
      officerRows={leavesData.officerRows}
      officers={officersShort}
      pendingRequests={leavesData.pendingRequestsFormatted}
      canEdit={canEdit}
      isCommander={user.role === "commander"}
      isAdmin={user.role === "admin"}
      hideHeader={true}
    />
  );

  const missionsContent = (
    <MissionsClient
      ongoingMissions={missionsData.ongoingMissionsList}
      tomorrowMissions={missionsData.tomorrowMissionsList}
      todayMissions={missionsData.todayMissionsList}
      yesterdayMissions={missionsData.yesterdayMissionsList}
      canEdit={canEdit}
      isAdmin={user.role === "admin"}
      hideHeader={true}
      officers={officersShort}
      unitName={missionsData.unitName}
    />
  );

  const positionsContent = (
    <PositionsClient
      initialPositions={positionsData.formattedPositions}
      departments={positionsData.allDepartmentNames}
      officers={officersShort}
      canEdit={canEdit}
      isCommander={user.role === "commander"}
    />
  );

  const excludedRosterOfficerIds = getExcludedLeadershipOfficerIds(
    activeOfficersList,
    positionsData.formattedPositions
  );
  const rosterOfficersShort = officersShort.filter(
    (o) => !excludedRosterOfficerIds.has(o.id)
  );

  const rosterContent = (
    <DutyRosterTab
      officers={rosterOfficersShort}
      canEdit={canEdit}
      isAdmin={user.role === "admin"}
      isCommander={user.role === "commander"}
    />
  );

  const notificationsContent = (
    <CommanderDecisionsTab
      totalDecisions={decisionsData.totalDecisions}
      approvedDecisions={decisionsData.approvedDecisions}
      rejectedDecisions={decisionsData.rejectedDecisions}
      otherOrdersDecisions={decisionsData.otherOrdersDecisions}
      displayedDecisions={decisionsData.displayedDecisions}
      totalCount={decisionsData.totalCount}
      searchQuery={decisionsData.searchQuery}
    />
  );

  return (
    <ArkanHarbClient
      dashboardContent={dashboardContent}
      rollcallContent={rollcallContent}
      leavesContent={leavesContent}
      missionsContent={missionsContent}
      positionsContent={positionsContent}
      rosterContent={rosterContent}
      notificationsContent={notificationsContent}
      officers={officersShort}
      canEdit={canEdit}
      isAdmin={user.role === "admin"}
      isCommander={user.role === "commander"}
      rollcallDate={rollcallDate}
      rollcallDateDisplay={rollcallDateDisplay}
      isRollcallSubmitted={isRollcallSubmitted}
    />
  );
}
