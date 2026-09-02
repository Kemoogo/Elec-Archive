import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db/connect";
import { authenticate } from "@/lib/auth/middleware";
import { canEditModule, canViewModule } from "@/lib/auth/authorization";
import { logAuditEvent } from "@/lib/auth/audit";
import { errors } from "@/lib/auth/errors";
import { PositionAssignment } from "@/lib/db/models/PositionAssignment";
import { Branch } from "@/lib/db/models/Branch";
import { Department } from "@/lib/db/models/Department";
import { Officer } from "@/lib/db/models/Officer";
import { handleApiError } from "@/lib/utils/api-error";
import { checkApiRateLimit, rateLimitErrorResponse } from "@/lib/security/rate-limit";
import { createPositionAssignmentSchema } from "@/lib/validations/arkan-harb";

export async function GET(request: Request) {
  const auth = await authenticate();
  if (!auth.success) return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });

  if (!canViewModule(auth.user!, "arkan_harb") && !canViewModule(auth.user!, "officers")) {
    return NextResponse.json({ success: false, error: errors.insufficientPermissions }, { status: 403 });
  }

  const ip = request.headers.get("x-forwarded-for") ?? "";
  const rl = checkApiRateLimit(auth.user!.id, ip, "read");
  if (!rl.allowed) return NextResponse.json(rateLimitErrorResponse(rl.resetAt), { status: 429 });

  try {
    await connectToDatabase();

    const { searchParams } = new URL(request.url);
    const dateParam = searchParams.get("date");
    const officerFilter = searchParams.get("officerId") || searchParams.get("search");

    const query: Record<string, unknown> = {};

    if (officerFilter && officerFilter.trim() !== "") {
      const trimmed = officerFilter.trim();
      const matchedOfficers = await Officer.find({
        $or: [
          { fullName: { $regex: trimmed, $options: "i" } },
          { militaryId: { $regex: trimmed, $options: "i" } },
        ],
      }).select("_id").lean();
      const officerIds = matchedOfficers.map((o) => o._id);

      query.$or = [
        { primaryOfficerId: { $in: officerIds } },
        { substituteOfficerIds: { $in: officerIds } },
        { positionTitle: { $regex: trimmed, $options: "i" } },
        { department: { $regex: trimmed, $options: "i" } },
      ];
    }

    const [dbBranches, dbDepartments, rawPositions] = await Promise.all([
      Branch.find({ isActive: { $ne: false } }).sort({ order: 1, name: 1 }).lean(),
      Department.find({ isActive: { $ne: false } }).sort({ order: 1, name: 1 }).lean(),
      PositionAssignment.find(query)
        .populate("primaryOfficerId", "fullName rank militaryId seniorityNumber isArkanHarb")
        .populate("substituteOfficerIds", "fullName rank militaryId seniorityNumber isArkanHarb")
        .populate("assignmentHistory.officerId", "fullName rank militaryId seniorityNumber isArkanHarb")
        .lean(),
    ]);

    // Construct department order map exactly mirroring the Branches & Departments table
    const deptOrderMap = new Map<string, number>();

    dbBranches.forEach((b: { _id?: unknown; name: string }, bIdx: number) => {
      const branchScore = (bIdx + 1) * 1000;
      deptOrderMap.set(b.name, branchScore);

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
      });
    });

    dbDepartments.forEach((d: { name: string }, dIdx: number) => {
      if (!deptOrderMap.has(d.name)) {
        deptOrderMap.set(d.name, 90000 + dIdx);
      }
    });

    const positions = [...rawPositions].sort((a, b) => {
      const orderA = deptOrderMap.get(a.department) ?? 99999;
      const orderB = deptOrderMap.get(b.department) ?? 99999;
      if (orderA !== orderB) return orderA - orderB;
      return (a.positionTitle || "").localeCompare(b.positionTitle || "", "ar");
    });

    // If historical date is requested, map the active officers on that exact date
    if (dateParam && !isNaN(Date.parse(dateParam))) {
      const targetDate = new Date(dateParam);
      targetDate.setHours(23, 59, 59, 999);

      const historicalPositions = positions.map((p) => {
        const historyOnDate = (p.assignmentHistory || []).filter((h: { startDate: Date | string; endDate?: Date | string | null; role: string; officerId: unknown }) => {
          const start = new Date(h.startDate);
          const end = h.endDate ? new Date(h.endDate) : null;
          return start <= targetDate && (!end || end >= targetDate);
        });

        const primaryEntry = historyOnDate.find((h: { role: string }) => h.role === "primary");
        const subEntries = historyOnDate.filter((h: { role: string; officerId: unknown }) => h.role === "substitute");

        return {
          id: p._id.toString(),
          positionTitle: p.positionTitle,
          department: p.department,
          orderNumber: p.orderNumber || "",
          notes: p.notes || "",
          primaryOfficer: primaryEntry ? primaryEntry.officerId : null,
          substituteOfficers: subEntries.map((s: { officerId: unknown }) => s.officerId),
          hasNoSubstitute: Boolean(p.hasNoSubstitute),
          assignmentHistory: p.assignmentHistory || [],
          createdAt: p.createdAt,
          updatedAt: p.updatedAt,
        };
      });

      return NextResponse.json({
        success: true,
        data: {
          items: historicalPositions,
          total: historicalPositions.length,
          historicalDate: dateParam,
        },
      });
    }

    const formattedPositions = positions.map((p) => ({
      id: p._id.toString(),
      positionTitle: p.positionTitle,
      department: p.department,
      orderNumber: p.orderNumber || "",
      notes: p.notes || "",
      primaryOfficer: p.primaryOfficerId || null,
      primaryStartDate: p.primaryStartDate || null,
      substituteOfficers: p.substituteOfficerIds || [],
      hasNoSubstitute: Boolean(p.hasNoSubstitute),
      assignmentHistory: p.assignmentHistory || [],
      createdAt: p.createdAt,
      updatedAt: p.updatedAt,
    }));

    return NextResponse.json({
      success: true,
      data: {
        items: formattedPositions,
        total: formattedPositions.length,
      },
    });
  } catch (error) {
    return handleApiError(error, "حدث خطأ أثناء تحميل الوظائف");
  }
}

export async function POST(request: Request) {
  const auth = await authenticate();
  if (!auth.success) return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });

  if (!canEditModule(auth.user!, "arkan_harb") && !canEditModule(auth.user!, "officers")) {
    return NextResponse.json({ success: false, error: errors.insufficientPermissions }, { status: 403 });
  }

  const ip = request.headers.get("x-forwarded-for") ?? "";
  const rl = checkApiRateLimit(auth.user!.id, ip, "write");
  if (!rl.allowed) return NextResponse.json(rateLimitErrorResponse(rl.resetAt), { status: 429 });

  await connectToDatabase();

  try {
    const body: unknown = await request.json();
    const parsed = createPositionAssignmentSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: errors.validationFailed, details: parsed.error.issues },
        { status: 400 }
      );
    }

    const data = parsed.data;
    const now = new Date();
    const primaryId = data.primaryOfficerId && data.primaryOfficerId.trim() !== "" ? data.primaryOfficerId.trim() : null;
    const substituteIds = data.hasNoSubstitute
      ? []
      : (data.substituteOfficerIds || []).filter((id) => id && id.trim() !== "");

    // Build initial assignment history
    const initialHistory = [];
    if (primaryId) {
      initialHistory.push({
        officerId: primaryId,
        role: "primary" as const,
        startDate: now,
        endDate: null,
      });
    }

    substituteIds.forEach((subId) => {
      initialHistory.push({
        officerId: subId,
        role: "substitute" as const,
        startDate: now,
        endDate: null,
      });
    });

    const position = await PositionAssignment.create({
      positionTitle: data.positionTitle,
      department: data.department,
      primaryOfficerId: primaryId,
      primaryStartDate: primaryId ? now : null,
      substituteOfficerIds: substituteIds,
      substituteStartDates: substituteIds.map((id) => ({ officerId: id, startDate: now })),
      hasNoSubstitute: Boolean(data.hasNoSubstitute),
      assignmentHistory: initialHistory,
      orderNumber: data.orderNumber || "",
      notes: data.notes || "",
      createdBy: auth.user!.id,
      updatedBy: auth.user!.id,
    });

    await logAuditEvent({
      userId: auth.user!.id,
      userName: auth.user!.fullName,
      action: "CREATE",
      module: "arkan_harb",
      targetId: position._id.toString(),
      description: `تم إنشاء وظيفة جديدة: ${data.positionTitle} (الفرع: ${data.department})`,
      ipAddress: ip,
    });

    return NextResponse.json({ success: true, data: { id: position._id.toString() } }, { status: 201 });
  } catch (error) {
    return handleApiError(error, "حدث خطأ أثناء إنشاء الوظيفة");
  }
}
