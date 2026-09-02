export const dynamic = "force-dynamic";
export const revalidate = 0;

import mongoose from "mongoose";
import { redirect } from "next/navigation";
import { authenticate } from "@/lib/auth/middleware";
import { canViewModule, canEditModule } from "@/lib/auth/authorization";
import { connectToDatabase } from "@/lib/db/connect";
import {
  Leave,
  Mission,
  DailyRollcall,
  AuditLog,
  Officer,
  type IRollcallEntry,
  type ILeave,
  type MissionStatus,
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
  seniorityNumber?: string;
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
    todayRollcall,
    recentActivities,
    totalOfficers
  ] = await Promise.all([
    Leave.countDocuments({ startDate: { $lte: new Date() }, endDate: { $gte: new Date() }, status: "approved" }),
    Mission.countDocuments({ status: "active" }),
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

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <DashboardCard 
          title="الحاضرين اليوم" 
          count={rollcallSubmitted ? attendeesCount : null} 
          icon="👥" 
          subtitle={rollcallSubmitted ? "بناءً على التمام المعتمد" : "التمام لم يُرسل بعد"}
          color={rollcallSubmitted ? "blue" : "yellow"}
        />
        <DashboardCard title="إجازات اليوم" count={activeLeavesCount} icon="📜" subtitle="ضباط في إجازة حالياً" color="yellow" />
        <DashboardCard title="مأموريات نشطة" count={activeMissionsCount} icon="🛡️" subtitle="مهام خارجية جارية" color="green" />
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
  const { calculateDailyRollcallEntries, detectRollcallConflicts } = await import("@/lib/arkan-harb/rollcall-engine");
  
  const suggestedEntries = await calculateDailyRollcallEntries(qDate);
  const conflictAlerts = await detectRollcallConflicts(qDate);

  const rosterMap = new Map(suggestedEntries.map(s => [s.officerId.toString(), s]));

  const activeOfficersList = await Officer.find({ employmentStatus: "active" })
    .collation({ locale: "en", numericOrdering: true })
    .sort({ seniorityNumber: 1 })
    .lean();
  const roster = activeOfficersList.map((o) => {
    const sug = rosterMap.get(o._id.toString());
    return {
      id: o._id.toString(),
      militaryId: o.militaryId,
      fullName: o.fullName,
      rank: o.rank,
      rankLabel: `${RANK_LABELS[o.rank as keyof typeof RANK_LABELS] ?? o.rank}${o.isArkanHarb ? " أ ح" : ""}`,
      suggestedStatus: sug?.status || "present",
    };
  });

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
          customReason: e.customReason,
          attachedDestination: e.attachedDestination,
        })),
        submittedAt: selectedRollcall.submittedAt?.toISOString() ?? "",
        viewedByCommander: selectedRollcall.viewedByCommander,
      }}
      isCommander={user.role === "commander" || user.role === "admin"}
      isAdmin={user.role === "admin" || canEdit}
    />
  ) : (
    <div className="space-y-4">
      {conflictAlerts.length > 0 && (
        <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-2xl space-y-2 text-xs font-bold text-amber-900">
          <div className="flex items-center gap-2 text-sm font-black text-amber-700">
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
            <span>تنبيهات وتضاربات التمام اليومي ({conflictAlerts.length})</span>
          </div>
          <ul className="list-disc list-inside space-y-1 text-amber-800">
            {conflictAlerts.map((a, idx) => (
              <li key={idx}>{a.message}</li>
            ))}
          </ul>
        </div>
      )}
      <RollcallSheet
        date={rollcallDate}
        roster={roster}
        existingEntries={selectedRollcall?.entries.map((e: IRollcallEntry) => ({ officerId: e.officerId.toString(), status: e.status, note: e.note })) ?? []}
        isDraft={selectedRollcall?.status === "draft"}
      />
    </div>
  );

  // 3. Fetch Leaves Data
  const officersShort = activeOfficersList.map(o => {
    const r = RANK_LABELS[o.rank as keyof typeof RANK_LABELS] ?? o.rank ?? "";
    const label = r ? `${r}${o.isArkanHarb ? " أ ح" : ""} / ${o.fullName}` : o.fullName;
    return {
      id: o._id.toString(),
      name: o.fullName,
      fullName: o.fullName,
      militaryId: o.militaryId,
      seniorityNumber: o.seniorityNumber,
      rank: r,
      officerLabel: label,
    };
  });
  const leavesData = await Leave.find().sort({ startDate: -1 }).limit(50).lean();
  const officerMap = new Map(officersShort.map(o => [o.id, o]));
  const formattedLeaves = (leavesData as unknown as (ILeave & { _id: { toString(): string }; officerId: { toString(): string } })[]).map((l) => {
    const off = officerMap.get(l.officerId.toString());
    return {
      id: l._id.toString(),
      officerId: l.officerId.toString(),
      officerName: off ? off.fullName : "غير معروف",
      officerLabel: off ? off.officerLabel : "غير معروف",
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
    const offLabel = rLabel ? `${rLabel} / ${officer?.fullName || ""}` : (officer?.fullName || "ضابط غير معروف");
    return {
      id: m._id.toString(),
      officerId: officer?._id ? officer._id.toString() : (m.officerId ? String(m.officerId) : ""),
      officerName: officer?.fullName || "ضابط غير معروف",
      officerRankLabel: rLabel,
      officerLabel: offLabel,
      officerMilitaryId: officer?.militaryId || "",
      title: m.title,
      description: m.description,
      destination: m.destination,
      startDate: m.startDate,
      endDate: m.endDate,
      status: m.status,
      statusReason: (m as unknown as { statusReason?: string }).statusReason || undefined,
      resultSummary: (m as unknown as { resultSummary?: string }).resultSummary || undefined,
      linkedFaxId: (m as unknown as { linkedFaxId?: string }).linkedFaxId || undefined,
      createdBy: m.createdBy ? String(m.createdBy) : "",
      createdAt: m.createdAt,
    };
  });
  const missionsContent = <MissionsClient initialMissions={formattedMissions} total={missionsTotal} page={mPage} limit={mLimit} officerFilter={mOfficer} statusFilter={mStatus} canEdit={canEdit} isAdmin={user.role === "admin"} hideHeader={true} officers={officersShort} />;

  // 5. Fetch Positions, Branches & Departments Data
  const { Branch } = await import("@/lib/db/models/Branch");
  const { Department } = await import("@/lib/db/models/Department");
  const { PositionAssignment } = await import("@/lib/db/models/PositionAssignment");

  const [dbBranches, dbDepartments, positionsList] = await Promise.all([
    Branch.find({ isActive: { $ne: false } }).sort({ order: 1, name: 1 }).lean(),
    Department.find({ isActive: { $ne: false } }).sort({ order: 1, name: 1 }).lean(),
    PositionAssignment.find({})
      .populate("primaryOfficerId", "fullName rank militaryId seniorityNumber isArkanHarb")
      .populate("substituteOfficerIds", "fullName rank militaryId seniorityNumber isArkanHarb")
      .populate("assignmentHistory.officerId", "fullName rank militaryId seniorityNumber isArkanHarb")
      .lean(),
  ]);

  // Construct department order map exactly mirroring the Branches & Departments table
  const deptOrderMap = new Map<string, number>();
  const allDepartmentNames: string[] = [];

  dbBranches.forEach((b: { _id?: unknown; name: string }, bIdx: number) => {
    const branchScore = (bIdx + 1) * 1000;
    deptOrderMap.set(b.name, branchScore);
    if (!allDepartmentNames.includes(b.name)) {
      allDepartmentNames.push(b.name);
    }

    // Find child departments
    const childDeps = dbDepartments.filter((d: { branchId?: unknown }) => {
      const bId = typeof d.branchId === "object" && d.branchId !== null && "_id" in d.branchId
        ? String((d.branchId as { _id: unknown })._id)
        : String(d.branchId);
      return b._id && bId === String(b._id);
    });

    childDeps.forEach((d: { name: string }, dIdx: number) => {
      const depScore = branchScore + (dIdx + 1);
      deptOrderMap.set(d.name, depScore);
      deptOrderMap.set(`${b.name} / ${d.name}`, depScore);
      if (!allDepartmentNames.includes(d.name)) {
        allDepartmentNames.push(d.name);
      }
    });
  });

  // Any other standalone departments
  dbDepartments.forEach((d: { name: string }, dIdx: number) => {
    if (!deptOrderMap.has(d.name)) {
      deptOrderMap.set(d.name, 90000 + dIdx);
      if (!allDepartmentNames.includes(d.name)) {
        allDepartmentNames.push(d.name);
      }
    }
  });

  // Sort positions list by department hierarchy order
  const sortedPositionsList = [...positionsList].sort((a, b) => {
    const orderA = deptOrderMap.get(a.department) ?? 99999;
    const orderB = deptOrderMap.get(b.department) ?? 99999;
    if (orderA !== orderB) return orderA - orderB;
    return (a.positionTitle || "").localeCompare(b.positionTitle || "", "ar");
  });

  const formattedPositions = sortedPositionsList.map((p) => {
    const primary = p.primaryOfficerId && typeof p.primaryOfficerId === "object" && "fullName" in p.primaryOfficerId
      ? {
          id: (p.primaryOfficerId as unknown as PopulatedOfficer)._id.toString(),
          fullName: (p.primaryOfficerId as unknown as PopulatedOfficer).fullName,
          rank: (p.primaryOfficerId as unknown as PopulatedOfficer).rank,
          militaryId: (p.primaryOfficerId as unknown as PopulatedOfficer).militaryId,
          seniorityNumber: (p.primaryOfficerId as unknown as PopulatedOfficer).seniorityNumber,
          isArkanHarb: (p.primaryOfficerId as unknown as PopulatedOfficer).isArkanHarb,
        }
      : null;

    const subs = (p.substituteOfficerIds || []).map((sub: unknown) => {
      if (typeof sub === "object" && sub && "fullName" in sub) {
        const s = sub as unknown as PopulatedOfficer;
        return {
          id: s._id.toString(),
          fullName: s.fullName,
          rank: s.rank,
          militaryId: s.militaryId,
          seniorityNumber: s.seniorityNumber,
          isArkanHarb: s.isArkanHarb,
        };
      }
      return { id: String(sub), fullName: String(sub), rank: "" };
    });

    const history = (p.assignmentHistory || []).map((h: { _id?: { toString(): string }; officerId?: unknown; role?: string; startDate?: Date | string; endDate?: Date | string | null; orderNumber?: string; notes?: string }) => {
      let offData: { id: string; fullName: string; rank: string; militaryId?: string; seniorityNumber?: string; isArkanHarb?: boolean } | string | null = null;
      if (h.officerId && typeof h.officerId === "object" && "_id" in h.officerId) {
        const offObj = h.officerId as PopulatedOfficer;
        offData = {
          id: offObj._id.toString(),
          fullName: offObj.fullName,
          rank: offObj.rank,
          militaryId: offObj.militaryId,
          seniorityNumber: offObj.seniorityNumber,
          isArkanHarb: offObj.isArkanHarb,
        };
      } else if (h.officerId) {
        offData = String(h.officerId);
      }

      return {
        _id: h._id ? h._id.toString() : undefined,
        officerId: offData,
        role: h.role,
        startDate: h.startDate ? (h.startDate instanceof Date ? h.startDate.toISOString() : String(h.startDate)) : "",
        endDate: h.endDate ? (h.endDate instanceof Date ? h.endDate.toISOString() : String(h.endDate)) : null,
        orderNumber: h.orderNumber || "",
        notes: h.notes || "",
      };
    });

    return {
      id: p._id.toString(),
      positionTitle: p.positionTitle,
      department: p.department || "القيادة",
      primaryOfficer: primary,
      substituteOfficers: subs,
      hasNoSubstitute: Boolean(p.hasNoSubstitute),
      assignmentHistory: history,
      orderNumber: p.orderNumber || "",
      notes: p.notes || "",
    };
  });

  const positionsContent = (
    <PositionsClient
      initialPositions={formattedPositions}
      departments={allDepartmentNames}
      officers={officersShort}
      canEdit={canEdit}
    />
  );

  return (
    <ArkanHarbClient 
      dashboardContent={dashboardContent}
      rollcallContent={rollcallContent}
      leavesContent={leavesContent}
      missionsContent={missionsContent}
      positionsContent={positionsContent}
      officers={officersShort.map(o => ({ id: o.id, name: o.fullName, fullName: o.fullName, militaryId: o.militaryId, rank: o.rank, officerLabel: o.officerLabel }))}
      canEdit={canEdit}
    />
  );
}
