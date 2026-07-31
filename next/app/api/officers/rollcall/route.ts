import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db/connect";
import { authenticate } from "@/lib/auth/middleware";
import { logAuditEvent } from "@/lib/auth/audit";
import { errors } from "@/lib/auth/errors";
import { handleApiError } from "@/lib/utils/api-error";
import { Officer, RANK_LABELS, type OfficerRank } from "@/lib/db/models/Officer";
import { DailyRollcall } from "@/lib/db/models/DailyRollcall";
import type { IRollcallEntry } from "@/lib/db/models/DailyRollcall";
import { canViewOfficers, canEditOfficers, canViewCommanderRollcall } from "@/lib/officers/access";
import { rollcallSubmitSchema, rollcallQuerySchema } from "@/lib/validations/officers";
import { checkOfficersRateLimit, rateLimitErrorResponse } from "@/lib/security/rate-limit";
import { createNotificationForCommanders } from "@/lib/notifications/createNotification";

export async function GET(request: Request) {
  const auth = await authenticate();
  if (!auth.success) {
    return NextResponse.json(
      { success: false, error: auth.error },
      { status: auth.status },
    );
  }

  if (!canViewOfficers(auth.user!)) {
    return NextResponse.json(
      { success: false, error: errors.insufficientPermissions },
      { status: 403 },
    );
  }

  const ip = request.headers.get("x-forwarded-for") ?? "";
  const rl = checkOfficersRateLimit(auth.user!.id, ip, "read");
  if (!rl.allowed) {
    return NextResponse.json(rateLimitErrorResponse(rl.resetAt), { status: 429 });
  }

  await connectToDatabase();

  const { searchParams } = new URL(request.url);
  const parsed = rollcallQuerySchema.safeParse(Object.fromEntries(searchParams.entries()));
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: errors.validationFailed, details: parsed.error.issues },
      { status: 400 },
    );
  }

  const queryDate = new Date(parsed.data.date);
  queryDate.setHours(0, 0, 0, 0);
  const nextDay = new Date(queryDate);
  nextDay.setDate(nextDay.getDate() + 1);

  const rollcall = await DailyRollcall.findOne({
    date: { $gte: queryDate, $lt: nextDay },
  }).lean();

  if (!rollcall) {
    const { getSuggestedRollcall } = await import("@/lib/officers/rollcall-engine");
    const suggestions = await getSuggestedRollcall(queryDate);

    return NextResponse.json({
      success: true,
      data: {
        status: "not_found",
        date: parsed.data.date,
        roster: suggestions.map((s) => ({
          id: s.officerId,
          militaryId: s.militaryId,
          fullName: s.fullName,
          rank: s.rank,
          rankLabel: RANK_LABELS[s.rank as OfficerRank] ?? s.rank,
          suggestedStatus: s.suggestedStatus,
          reason: s.reason,
          relatedId: s.relatedId,
        })),
      },
    });
  }

  const isCommander = canViewCommanderRollcall(auth.user!);

  if (rollcall.status === "submitted" && isCommander) {
    await DailyRollcall.findByIdAndUpdate(rollcall._id, { viewedByCommander: true });
  }

  return NextResponse.json({
    success: true,
    data: {
      status: rollcall.status,
      date: parsed.data.date,
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
      submittedBy: rollcall.submittedBy?.toString(),
      submittedAt: rollcall.submittedAt?.toISOString(),
      viewedByCommander: rollcall.viewedByCommander,
    },
  });
}

export async function POST(request: Request) {
  const auth = await authenticate();
  if (!auth.success) {
    return NextResponse.json(
      { success: false, error: auth.error },
      { status: auth.status },
    );
  }

  if (!canEditOfficers(auth.user!)) {
    return NextResponse.json(
      { success: false, error: errors.insufficientPermissions },
      { status: 403 },
    );
  }

  const ip = request.headers.get("x-forwarded-for") ?? "";
  const rl = checkOfficersRateLimit(auth.user!.id, ip, "write");
  if (!rl.allowed) {
    return NextResponse.json(rateLimitErrorResponse(rl.resetAt), { status: 429 });
  }

  await connectToDatabase();

  try {
    const body = await request.json();
    const parsed = rollcallSubmitSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: errors.validationFailed, details: parsed.error.issues },
        { status: 400 },
      );
    }

    const { date, action, entries: submittedEntries } = parsed.data;

    const queryDate = new Date(date);
    queryDate.setHours(0, 0, 0, 0);
    const nextDay = new Date(queryDate);
    nextDay.setDate(nextDay.getDate() + 1);

    const existing = await DailyRollcall.findOne({
      date: { $gte: queryDate, $lt: nextDay },
    });

    if (existing && existing.status === "submitted") {
      return NextResponse.json(
        { success: false, error: "تم تسليم التمام لهذا اليوم مسبقاً" },
        { status: 409 },
      );
    }

    const activeOfficers = await Officer.find({ employmentStatus: "active" }).lean();
    const activeOfficerIds = new Set(activeOfficers.map((o) => o._id.toString()));

    if (action === "submit") {
      if (submittedEntries.length !== activeOfficers.length) {
        return NextResponse.json(
          {
            success: false,
            error: `عدد السجلات (${submittedEntries.length}) لا يطابق عدد الضباط النشطين (${activeOfficers.length}). يرجى تحديث القائمة.`,
          },
          { status: 400 },
        );
      }

      for (const entry of submittedEntries) {
        if (!activeOfficerIds.has(entry.officerId)) {
          return NextResponse.json(
            {
              success: false,
              error: "تم تغيير قائمة الضباط أثناء التمام. يرجى تحديث الصفحة وإعادة المحاولة.",
            },
            { status: 409 },
          );
        }
      }
    }

    const officerMap = new Map(activeOfficers.map((o) => [o._id.toString(), o]));

    const rollcallEntries = submittedEntries.map((e) => {
      const officer = officerMap.get(e.officerId);
      return {
        officerId: e.officerId,
        militaryId: officer?.militaryId ?? "",
        fullName: officer?.fullName ?? "",
        rank: officer?.rank ?? "",
        status: e.status,
        note: e.note,
      };
    });

    if (existing) {
      existing.entries = rollcallEntries;
      existing.targetOfficerCount = activeOfficers.length;

      if (action === "submit") {
        existing.status = "submitted";
        existing.submittedBy = new (await import("mongoose")).Types.ObjectId(auth.user!.id);
        existing.submittedAt = new Date();
      }

      await existing.save();
    } else {
      const rollcallData: Record<string, unknown> = {
        date: queryDate,
        status: action === "submit" ? "submitted" : "draft",
        targetOfficerCount: activeOfficers.length,
        entries: rollcallEntries,
      };

      if (action === "submit") {
        rollcallData.submittedBy = new (await import("mongoose")).Types.ObjectId(auth.user!.id);
        rollcallData.submittedAt = new Date();
      }

      await DailyRollcall.create(rollcallData);
    }

    if (action === "submit") {
      await createNotificationForCommanders({
        type: "rollcall_approved",
        title: "اعتماد التمام اليومي",
        body: `تم اعتماد التمام اليومي ليوم ${date} من قبل ضابط أركان الحرب (${auth.user!.fullName})`,
        refId: (existing?._id || "").toString(),
        refModel: "DailyRollcall",
      });
    }

    await logAuditEvent({
      userId: auth.user!.id,
      userName: auth.user!.fullName,
      action: action === "submit" ? "CREATE" : "UPDATE",
      module: "officers",
      description:
        action === "submit"
          ? `تسليم تمام الضباط ليوم ${date}`
          : `حفظ مسودة تمام الضباط ليوم ${date}`,
      ipAddress: ip,
    });

    return NextResponse.json({
      success: true,
      data: {
        status: action === "submit" ? "submitted" : "draft",
        date,
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
