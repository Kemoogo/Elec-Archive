import mongoose from "mongoose";
import { redirect } from "next/navigation";
import { authenticate } from "@/lib/auth/middleware";
import { canViewModule, canEditModule } from "@/lib/auth/authorization";
import { connectToDatabase } from "@/lib/db/connect";
import {
  Leave,
  Mission,
  DailyRollcall,
  PositionAssignment,
  AuditLog,
  Officer,
  type IRollcallEntry,
  type ILeave,
  type MissionStatus,
  type PositionType,
  type PositionStatus
} from "@/lib/db/models";
import { ArkanHarbClient } from "@/components/arkan-harb/ArkanHarbClient";
import { CommanderSummary } from "@/components/arkan-harb/CommanderSummary";
import { DashboardCard } from "@/components/dashboard/DashboardCard";
import { RollcallSheet } from "@/components/officers/RollcallSheet";
import { RollcallSummary } from "@/components/officers/RollcallSummary";
import { LeavesPageClient } from "@/components/officers/LeavesPageClient";
import { MissionsClient } from "@/components/arkan-harb/MissionsClient";
import { PositionsClient } from "@/components/arkan-harb/PositionsClient";
import { SectionWrapper } from "@/components/ui/section-wrapper";
import { format } from "date-fns";
import { ar } from "date-fns/locale";

import { Clock, Activity } from "lucide-react";

// Populated document shapes (Mongoose lean + populate)
interface PopulatedOfficer {
  _id: { toString(): string };
  fullName: string;
  rank: string;
  militaryId?: string;
  isArkanHarb?: boolean;
}
interface PopulatedMission {
  _id: { toString(): string };
  officerId: PopulatedOfficer | { toString(): string };
  title: string;
  description?: string;
  destination?: string;
  startDate: Date;
  endDate?: Date | null;
  status: MissionStatus;
  createdBy: { toString(): string };
  createdAt: Date;
}
interface PopulatedPosition {
  _id: { toString(): string };
  officerId: PopulatedOfficer | { toString(): string };
  substituteForOfficerId?: PopulatedOfficer | { toString(): string };
  positionTitle: string;
  positionType: PositionType;
  startDate: Date;
  endDate?: Date | null;
  orderNumber?: string;
  status: PositionStatus;
  notes?: string;
  createdBy: { toString(): string };
  createdAt: Date;
}
interface AuditLogPopulated {
  _id: { toString(): string };
  userId?: { username?: string; fullName?: string };
  userName: string;
  createdAt: Date | string;
  description: string;
}

export default async function ArkanHarbPage({
  searchParams,
}: {
  searchParams: Promise<{ 
    tab?: string;
    date?: string; 
    officerId?: string; 
    status?: string; 
    page?: string; 
    limit?: string 
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

  // 1. Fetch Dashboard Data
  const [
    activeLeavesCount,
    activeMissionsCount,
    activePositionsCount,
    todayRollcall,
    recentActivities,
    totalOfficers
  ] = await Promise.all([
    Leave.countDocuments({ startDate: { $lte: new Date() }, endDate: { $gte: new Date() }, status: "approved" }),
    Mission.countDocuments({ status: "active" }),
    PositionAssignment.countDocuments({ status: "active" }),
    DailyRollcall.findOne({ date: { $gte: today, $lt: tomorrow } }).lean(),
    AuditLog.find({ module: "arkan_harb" }).populate("userId", "username fullName").sort({ createdAt: -1 }).limit(5).lean(),
    Officer.countDocuments({ employmentStatus: "active" })
  ]);

  const attendeesCount = todayRollcall?.entries?.filter((e: IRollcallEntry) => e.status === "present").length || 0;
  const rollcallSubmitted = todayRollcall?.status === "submitted";
  const absentCount = totalOfficers - attendeesCount - activeLeavesCount - activeMissionsCount;

  const dashboardContent = (
    <div className="space-y-8">
      {(user.role === "admin" || user.role === "commander") && (
        <CommanderSummary
          totalOfficers={totalOfficers}
          present={attendeesCount}
          mission={activeMissionsCount}
          leave={activeLeavesCount}
          absent={absentCount}
        />
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <DashboardCard 
          title="الحاضرين اليوم" 
          count={rollcallSubmitted ? attendeesCount : null} 
          icon="👥" 
          subtitle={rollcallSubmitted ? "بناءً على التمام المعتمد" : "التمام لم يُرسل بعد"}
          color={rollcallSubmitted ? "blue" : "yellow"}
        />
        <DashboardCard title="إجازات اليوم" count={activeLeavesCount} icon="📜" subtitle="ضباط في إجازة حالياً" color="yellow" />
        <DashboardCard title="مأموريات نشطة" count={activeMissionsCount} icon="🛡️" subtitle="مهام خارجية جارية" color="green" />
        <DashboardCard title="الوظائف المشغولة" count={activePositionsCount} icon="💼" subtitle="تعيينات وظيفية سارية" color="purple" />
      </div>

      <SectionWrapper>
        <h3 className="text-sm font-black text-(--color-primary) mb-6 flex items-center gap-2">
          <div className="w-1.5 h-4 bg-(--color-primary) rounded-full"></div>
          أحدث الأنشطة
        </h3>
        <div className="space-y-4">
          {(recentActivities as AuditLogPopulated[]).map((log) => (
            <div key={log._id.toString()} className="flex items-start gap-4 p-3 bg-(--app-surface-container-low) rounded-xl border border-transparent hover:border-(--app-border) transition-all group">
              <div className="p-2 bg-(--app-surface) rounded-lg shadow-sm group-hover:bg-(--color-primary)/10 transition-colors">
                <Activity className="w-4 h-4 text-(--app-muted-foreground)/60 group-hover:text-(--color-primary)" />
              </div>
              <div className="flex-1 min-w-0 text-right">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <span className="text-[13px] font-bold text-(--app-foreground)">{log.userId?.fullName || log.userId?.username || log.userName}</span>
                  <span className="text-[11px] text-(--app-muted-foreground)/60 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {format(new Date(log.createdAt), "p", { locale: ar })}
                  </span>
                </div>
                <p className="text-xs text-(--app-muted-foreground)/80 line-clamp-2">{log.description}</p>
              </div>
            </div>
          ))}
        </div>
      </SectionWrapper>
    </div>
  );

  // 2. Fetch Rollcall Data
  const rollcallDate = params.date || format(new Date(), "yyyy-MM-dd");
  const qDate = new Date(rollcallDate);
  qDate.setHours(0, 0, 0, 0);
  const nDay = new Date(qDate);
  nDay.setDate(nDay.getDate() + 1);

  const selectedRollcall = await DailyRollcall.findOne({ date: { $gte: qDate, $lt: nDay } }).lean();
  const { RANK_LABELS } = await import("@/lib/db/models/Officer");
  const activeOfficersList = await Officer.find({ employmentStatus: "active" }).sort({ rank: 1, fullName: 1 }).lean();
  
  const roster = activeOfficersList.map((o) => ({
    id: o._id.toString(),
    militaryId: o.militaryId,
    fullName: o.fullName,
    rank: o.rank,
    rankLabel: `${RANK_LABELS[o.rank as keyof typeof RANK_LABELS] ?? o.rank}${o.isArkanHarb ? " أ ح" : ""}`,
  }));

  const rollcallContent = selectedRollcall && selectedRollcall.status === "submitted" ? (
    <RollcallSummary
      rollcall={{
        date: rollcallDate,
        status: selectedRollcall.status,
        targetOfficerCount: selectedRollcall.targetOfficerCount,
        entries: selectedRollcall.entries.map((e: IRollcallEntry) => ({
          officerId: e.officerId.toString(),
          militaryId: e.militaryId,
          fullName: e.fullName,
          rank: e.rank,
          rankLabel: e.rank,
          status: e.status,
          note: e.note,
        })),
        submittedAt: selectedRollcall.submittedAt?.toISOString() ?? "",
        viewedByCommander: selectedRollcall.viewedByCommander,
      }}
      isCommander={user.role === "commander" || user.role === "admin"}
    />
  ) : (
    <RollcallSheet
      date={rollcallDate}
      roster={roster}
      existingEntries={selectedRollcall?.entries.map((e: IRollcallEntry) => ({ officerId: e.officerId.toString(), status: e.status, note: e.note })) ?? []}
      isDraft={selectedRollcall?.status === "draft"}
    />
  );

  // 3. Fetch Leaves Data
  const officersShort = activeOfficersList.map(o => ({ id: o._id.toString(), fullName: o.fullName, militaryId: o.militaryId, rank: o.rank ?? "" }));
  const leavesData = await Leave.find().sort({ startDate: -1 }).limit(50).lean();
  const officerMap = new Map(officersShort.map(o => [o.id, o]));
  const formattedLeaves = (leavesData as unknown as (ILeave & { _id: { toString(): string }; officerId: { toString(): string } })[]).map((l) => {
    const off = officerMap.get(l.officerId.toString());
    return {
      id: l._id.toString(),
      officerId: l.officerId.toString(),
      officerName: off ? off.fullName : "غير معروف",
      officerMilitaryId: off ? off.militaryId : "",
      category: l.category,
      categoryLabel: l.category === "leave" ? "إجازة رسمية" : "غياب / انقطاع",
      type: l.type,
      typeLabel: l.type,
      startDate: l.startDate.toISOString(),
      endDate: l.endDate.toISOString(),
      reason: l.reason || "",
      status: l.status,
      statusLabel: l.status,
    };
  });
  const leavesContent = <LeavesPageClient initialLeaves={formattedLeaves} officers={officersShort} canEdit={canEdit} hideHeader={true} />;

  // 4. Fetch Missions Data
  const mPage = Number(params.page) || 1;
  const mLimit = Number(params.limit) || 10;
  const mOfficer = params.officerId || "";
  const mStatus = params.status || "";
  const mQuery: Record<string, unknown> = {};

  if (mOfficer) {
    if (mongoose.Types.ObjectId.isValid(mOfficer)) {
      mQuery.officerId = mOfficer;
    } else {
      const matchedOfficers = await Officer.find({
        $or: [
          { fullName: { $regex: mOfficer, $options: "i" } },
          { militaryId: { $regex: mOfficer, $options: "i" } },
        ],
      }).select("_id").lean();
      const matchedIds = matchedOfficers.map((o) => o._id);
      mQuery.officerId = { $in: matchedIds };
    }
  }
  if (mStatus) mQuery.status = mStatus;
  const [missionsItems, missionsTotal] = await Promise.all([
    Mission.find(mQuery).sort({ startDate: -1 }).skip((mPage - 1) * mLimit).limit(mLimit).populate("officerId", "fullName rank militaryId isArkanHarb").lean(),
    Mission.countDocuments(mQuery)
  ]);
  const formattedMissions = (missionsItems as PopulatedMission[]).map(m => {
    const officer = m.officerId as PopulatedOfficer;
    const rLabel = officer?.rank ? `${RANK_LABELS[officer.rank as keyof typeof RANK_LABELS] ?? officer.rank}${officer.isArkanHarb ? " أ ح" : ""}` : "";
    return {
      id: m._id.toString(),
      officerId: officer?._id?.toString() || (m.officerId as { toString(): string }).toString() || "",
      officerName: officer?.fullName || "ضابط غير معروف",
      officerRankLabel: rLabel,
      officerMilitaryId: officer?.militaryId || "",
      title: m.title,
      description: m.description,
      destination: m.destination,
      startDate: m.startDate,
      endDate: m.endDate,
      status: m.status,
      createdBy: m.createdBy.toString(),
      createdAt: m.createdAt,
    };
  });
  const missionsContent = <MissionsClient initialMissions={formattedMissions} total={missionsTotal} page={mPage} limit={mLimit} officerFilter={mOfficer} statusFilter={mStatus} canEdit={canEdit} hideHeader={true} />;

  // 5. Fetch Positions Data
  const [positionsItems, positionsTotal] = await Promise.all([
    PositionAssignment.find(mQuery).sort({ startDate: -1 }).skip((mPage - 1) * mLimit).limit(mLimit).populate("officerId", "fullName rank militaryId isArkanHarb").populate("substituteForOfficerId", "fullName rank militaryId isArkanHarb").lean(),
    PositionAssignment.countDocuments(mQuery)
  ]);
  const formattedPositions = (positionsItems as PopulatedPosition[]).map(p => {
    const officer = p.officerId as PopulatedOfficer;
    const substitute = p.substituteForOfficerId as PopulatedOfficer | undefined;
    const rLabel = officer?.rank ? `${RANK_LABELS[officer.rank as keyof typeof RANK_LABELS] ?? officer.rank}${officer.isArkanHarb ? " أ ح" : ""}` : "";
    const subLabel = substitute?.rank ? `${RANK_LABELS[substitute.rank as keyof typeof RANK_LABELS] ?? substitute.rank}${substitute.isArkanHarb ? " أ ح" : ""}` : "";
    return {
      id: p._id.toString(),
      officerId: officer?._id?.toString() || (p.officerId as { toString(): string }).toString() || "",
      officerName: officer?.fullName || "ضابط غير معروف",
      officerRankLabel: rLabel,
      officerMilitaryId: officer?.militaryId || "",
      positionTitle: p.positionTitle,
      positionType: p.positionType,
      substituteForOfficerId: substitute?._id?.toString() || "",
      substituteForOfficerName: substitute?.fullName || "",
      substituteRankLabel: subLabel,
      substituteMilitaryId: substitute?.militaryId || "",
      startDate: p.startDate,
      endDate: p.endDate,
      orderNumber: p.orderNumber,
      status: p.status,
      notes: p.notes,
      createdBy: p.createdBy.toString(),
      createdAt: p.createdAt,
    };
  });
  const positionsContent = <PositionsClient initialPositions={formattedPositions} officers={officersShort.map(o => ({ ...o, name: o.fullName, rank: "" }))} total={positionsTotal} page={mPage} limit={mLimit} officerFilter={mOfficer} statusFilter={mStatus} canEdit={canEdit} hideHeader={true} />;

  return (
    <ArkanHarbClient 
      dashboardContent={dashboardContent}
      rollcallContent={rollcallContent}
      leavesContent={leavesContent}
      missionsContent={missionsContent}
      positionsContent={positionsContent}
      officers={officersShort.map(o => ({ id: o.id, name: o.fullName, fullName: o.fullName, militaryId: o.militaryId, rank: o.rank }))}
      canEdit={canEdit}
    />
  );
}
