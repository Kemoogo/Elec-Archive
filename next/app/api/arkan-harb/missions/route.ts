import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db/connect";
import { authenticate } from "@/lib/auth/middleware";
import { canViewModule, canEditModule } from "@/lib/auth/authorization";
import { logAuditEvent } from "@/lib/auth/audit";
import { errors } from "@/lib/auth/errors";
import { Mission } from "@/lib/db/models/Mission";
import { Leave } from "@/lib/db/models/Leave";
import { Officer, RANK_LABELS, type OfficerRank } from "@/lib/db/models/Officer";
import { checkApiRateLimit, rateLimitErrorResponse } from "@/lib/security/rate-limit";
import { missionsListQuerySchema, createMissionSchema } from "@/lib/validations/arkan-harb";
import { handleApiError } from "@/lib/utils/api-error";
import { escapeRegex } from "@/lib/utils";

export async function GET(request: Request) {
  // 1. Auth
  const auth = await authenticate();
  if (!auth.success) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
  }

  // 2. RBAC
  if (!canViewModule(auth.user!, "arkan_harb") && !canViewModule(auth.user!, "officers")) {
    return NextResponse.json({ success: false, error: errors.insufficientPermissions }, { status: 403 });
  }

  // 3. Rate limit
  const ip = request.headers.get("x-forwarded-for") ?? "";
  const rl = checkApiRateLimit(auth.user!.id, ip, "read");
  if (!rl.allowed) {
    return NextResponse.json(rateLimitErrorResponse(rl.resetAt), { status: 429 });
  }

  try {
    await connectToDatabase();

    // 4. Validate query params
    const { searchParams } = new URL(request.url);
    const parsed = missionsListQuerySchema.safeParse(Object.fromEntries(searchParams.entries()));
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: errors.validationFailed, details: parsed.error.issues },
        { status: 400 },
      );
    }

    const { officerId, search, startDate, endDate, status, page, limit } = parsed.data;

    // 5. Build query
    const query: Record<string, unknown> = {};
    let officerDisplayName = "";

    if (officerId) {
      query.officerId = officerId;
      const officer = await Officer.findById(officerId).select("rank fullName isArkanHarb").lean();
      if (officer) {
        officerDisplayName = `${RANK_LABELS[officer.rank as OfficerRank]} / ${officer.fullName}`;
      } else {
        officerDisplayName = officerId;
      }
    }

    if (status) query.status = status;

    if (startDate) {
      const s = new Date(startDate);
      if (!isNaN(s.getTime())) {
        query.startDate = { ...((query.startDate as object) || {}), $gte: s };
      }
    }

    if (endDate) {
      const e = new Date(endDate);
      if (!isNaN(e.getTime())) {
        e.setHours(23, 59, 59, 999);
        query.startDate = { ...((query.startDate as object) || {}), $lte: e };
      }
    }

    if (search && search.trim() && search.trim().length >= 2) {
      const q = search.trim();
      const escapedQ = escapeRegex(q);
      const matchingOfficers = await Officer.find({
        fullName: { $regex: escapedQ, $options: "i" },
      })
        .select("_id")
        .lean();
      const officerIds = matchingOfficers.map((o) => o._id);

      query.$or = [
        { title: { $regex: escapedQ, $options: "i" } },
        { destination: { $regex: escapedQ, $options: "i" } },
        { description: { $regex: escapedQ, $options: "i" } },
        { travelOrderNumber: { $regex: escapedQ, $options: "i" } },
        { linkedFaxId: { $regex: escapedQ, $options: "i" } },
        { officerId: { $in: officerIds } },
      ];
    }

    // 6. Execute count & paginated query
    const total = await Mission.countDocuments(query);
    const skip = (page - 1) * limit;

    const items = await Mission.find(query)
      .populate("officerId", "fullName rank militaryId isArkanHarb")
      .sort({ startDate: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    // 7. Audit log for list access
    await logAuditEvent({
      userId: auth.user!.id,
      userName: auth.user!.fullName,
      action: "VIEW",
      module: "arkan_harb",
      targetId: auth.user!.id,
      description: officerId
        ? `عرض مأموريات الضابط: ${officerDisplayName}`
        : `عرض قائمة المأموريات (الصفحة: ${page})`,
      ipAddress: ip,
    });

    // 8. Return standardized response
    return NextResponse.json({
      success: true,
      data: {
        items: items.map((m) => {
          const off = m.officerId as unknown as { _id?: unknown; fullName?: string; rank?: string; militaryId?: string; isArkanHarb?: boolean } | null;
          const rLabel = off?.rank ? `${RANK_LABELS[off.rank as OfficerRank] ?? off.rank}${off.isArkanHarb ? " أ ح" : ""}` : "";
          const offLabel = rLabel ? `${rLabel} / ${off?.fullName || ""}` : (off?.fullName || "ضابط غير معروف");

          return {
            id: m._id.toString(),
            officerId: off?._id ? off._id.toString() : String(m.officerId),
            officerName: off?.fullName || "ضابط غير معروف",
            officerRankLabel: rLabel,
            officerLabel: offLabel,
            officerMilitaryId: off?.militaryId || "",
            missionType: m.missionType || "external_multiday",
            title: m.title,
            description: m.description,
            destination: m.destination,
            linkedFaxId: m.linkedFaxId ?? null,
            linkedFax: m.linkedFax ? m.linkedFax.toString() : null,
            referenceLetterNumber: m.referenceLetterNumber ?? null,
            travelOrderNumber: m.travelOrderNumber ?? null,
            transportationMean: m.transportationMean ?? null,
            authorizedWeapons: m.authorizedWeapons ?? null,
            clearanceDocuments: m.clearanceDocuments ?? [],
            startDate: m.startDate,
            endDate: m.endDate ?? null,
            status: (() => {
              if (m.status === "completed" || m.status === "cancelled" || m.status === "postponed") {
                return m.status;
              }
              const now = new Date();
              const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
              const sTime = new Date(m.startDate).setHours(0, 0, 0, 0);
              const eTime = (m.endDate ? new Date(m.endDate) : new Date(m.startDate)).setHours(23, 59, 59, 999);
              if (todayStart >= sTime && todayStart <= eTime) {
                return "active";
              }
              if (todayStart > eTime) {
                return "completed";
              }
              return m.status || "scheduled";
            })(),
            statusReason: m.statusReason ?? null,
            resultSummary: m.resultSummary ?? null,
            createdBy: m.createdBy.toString(),
            createdAt: m.createdAt,
          };
        }),
        total,
        page,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      },
    });
  } catch (error) {
    return handleApiError(error, "حدث خطأ أثناء تحميل المأموريات");
  }
}

export async function POST(request: Request) {
  // 1. Auth
  const auth = await authenticate();
  if (!auth.success) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
  }

  // 2. RBAC
  if (!canEditModule(auth.user!, "arkan_harb") && !canEditModule(auth.user!, "officers")) {
    return NextResponse.json({ success: false, error: errors.insufficientPermissions }, { status: 403 });
  }

  // 3. Rate limit
  const ip = request.headers.get("x-forwarded-for") ?? "";
  const rl = checkApiRateLimit(auth.user!.id, ip, "write");
  if (!rl.allowed) {
    return NextResponse.json(rateLimitErrorResponse(rl.resetAt), { status: 429 });
  }

  try {
    await connectToDatabase();
    // 4. Parse + Validate body
    const body: unknown = await request.json();
    const parsed = createMissionSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: errors.validationFailed, details: parsed.error.issues },
        { status: 400 },
      );
    }

    const data = parsed.data;

    // Verify officer is in unit and active
    const officer = await Officer.findById(data.officerId).lean();
    if (!officer) {
      return NextResponse.json({ success: false, error: "الضابط غير موجود" }, { status: 404 });
    }
    if (officer.employmentStatus !== "active" || !officer.isInUnit) {
      return NextResponse.json({ success: false, error: "لا يمكن تكليف ضابط خارج الوحدة أو منقول/منتهية خدمته بمأمورية" }, { status: 400 });
    }

    const missionType = data.missionType || "external_multiday";

    const start = new Date(data.startDate);
    const startDay = new Date(start.getFullYear(), start.getMonth(), start.getDate());

    const end = data.endDate ? new Date(data.endDate) : null;
    const endDay = end ? new Date(end.getFullYear(), end.getMonth(), end.getDate()) : null;

    // RULE: Only internal daily missions are permitted during leave.
    if (missionType !== "internal_daily") {
      const targetStart = new Date(start);
      const targetEnd = end
        ? new Date(end)
        : new Date(targetStart.getFullYear(), targetStart.getMonth(), targetStart.getDate(), 23, 59, 59, 999);

      const overlappingLeave = await Leave.findOne({
        officerId: data.officerId,
        status: { $in: ["approved", "extension_pending"] },
        startDate: { $lte: targetEnd },
        $or: [
          { actualReturnDate: { $gte: targetStart } },
          { actualReturnDate: { $exists: false }, endDate: { $gte: targetStart } },
          { actualReturnDate: null, endDate: { $gte: targetStart } },
        ],
      }).lean();

      if (overlappingLeave) {
        return NextResponse.json(
          {
            success: false,
            error: "لا يمكن تكليف الضابط بمأمورية خارجية أو فرقة أثناء الإجازة، يجب قطع الإجازة أولاً.",
          },
          { status: 400 },
        );
      }
    }

    // Automatic status determination based on current date
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    let computedStatus: "scheduled" | "active" | "completed" | "cancelled" = "scheduled";
    if (endDay && today > endDay) {
      computedStatus = "completed";
    } else if (today >= startDay && (!endDay || today <= endDay)) {
      computedStatus = "active";
    } else {
      computedStatus = "scheduled";
    }

    const orderYear = start.getFullYear();
    const randomSeq = Math.floor(100 + Math.random() * 900);
    const travelOrderNum =
      data.travelOrderNumber || `ت ح / ${orderYear} / ${randomSeq}`;

    // 5. Create mission
    const mission = await Mission.create({
      officerId: data.officerId,
      missionType: data.missionType || "external_multiday",
      title: data.title,
      description: data.description,
      destination: data.destination,
      linkedFaxId: data.linkedFaxId,
      linkedFax: data.linkedFax || undefined,
      referenceLetterNumber: data.referenceLetterNumber || data.linkedFaxId,
      travelOrderNumber: travelOrderNum,
      transportationMean: data.transportationMean || "سيارة تابعة للوحدة",
      authorizedWeapons: data.authorizedWeapons || "بدون سلاح",
      startDate: start,
      endDate: end ?? undefined,
      status: computedStatus,
      createdBy: auth.user!.id,
      updatedBy: auth.user!.id,
    });

    // 6. Audit
    const officerDisplayName = officer 
      ? `${RANK_LABELS[officer.rank as OfficerRank]} / ${officer.fullName}` 
      : data.officerId;

    await logAuditEvent({
      userId: auth.user!.id,
      userName: auth.user!.fullName,
      action: "CREATE",
      module: "arkan_harb",
      targetId: mission._id.toString(),
      description: `تم إنشاء مأمورية جديدة: ${data.title} للضابط: ${officerDisplayName}`,
      ipAddress: ip,
    });

    // 7. Response
    return NextResponse.json(
      {
        success: true,
        data: {
          id: mission._id.toString(),
          travelOrderNumber: travelOrderNum,
        },
      },
      { status: 201 },
    );
  } catch (error) {
    return handleApiError(error, "حدث خطأ أثناء إنشاء المأمورية");
  }
}
