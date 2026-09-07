import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db/connect";
import { authenticate } from "@/lib/auth/middleware";
import { checkApiRateLimit, rateLimitErrorResponse } from "@/lib/security/rate-limit";
import { canEditModule } from "@/lib/auth/authorization";
import { Leave } from "@/lib/db/models/Leave";

import { Types } from "mongoose";
import { createLeaveSchema } from "@/lib/validations/officers";
import { errors } from "@/lib/auth/errors";
import { handleApiError } from "@/lib/utils/api-error";

export async function POST(request: Request) {
  const auth = await authenticate();
  if (!auth.success) return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
  
  const ip = request.headers.get("x-forwarded-for") ?? "";
  const rl = checkApiRateLimit(auth.user!.id, ip, "write");
  if (!rl.allowed) {
    return NextResponse.json(rateLimitErrorResponse(rl.resetAt), { status: 429 });
  }

  if (!canEditModule(auth.user!, "arkan_harb")) return NextResponse.json({ success: false, error: errors.insufficientPermissions }, { status: 403 });

  await connectToDatabase();
  
  try {
    const body = await request.json();
    const parsed = createLeaveSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ success: false, error: "بيانات غير صالحة", details: parsed.error.issues }, { status: 400 });

    const data = parsed.data;
    const startDate = new Date(data.startDate);
    const endDate = new Date(data.endDate);

    // Overlapping check with non-rejected/cancelled leaves
    const overlapping = await Leave.findOne({
      officerId: data.officerId,
      status: { $nin: ["rejected", "cancelled"] },
      $or: [
        { startDate: { $lte: endDate }, endDate: { $gte: startDate } },
      ],
    });

    if (overlapping) {
      return NextResponse.json({ success: false, error: "يوجد تداخل مع إجازة أخرى مسجلة لنفس الضابط في هذه الفترة" }, { status: 409 });
    }

    // Auto calculate lastReturnDate & presenceDurationDays if not explicitly passed
    let lastReturnDate: Date | undefined = data.lastReturnDate ? new Date(data.lastReturnDate) : undefined;
    let presenceDurationDays: number = data.presenceDurationDays ?? 0;

    if (!lastReturnDate) {
      const lastLeave = await Leave.findOne({
        officerId: data.officerId,
        status: { $in: ["closed", "interrupted", "approved"] },
        endDate: { $lt: startDate },
      }).sort({ endDate: -1 }).lean();

      if (lastLeave) {
        lastReturnDate = lastLeave.actualReturnDate ? new Date(lastLeave.actualReturnDate) : new Date(lastLeave.endDate);
        const diffTime = Math.max(0, startDate.getTime() - lastReturnDate.getTime());
        presenceDurationDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
      }
    }

    const leave = await Leave.create({
      officerId: new Types.ObjectId(data.officerId),
      category: data.category || "leave",
      type: data.type,
      startDate,
      endDate,
      lastReturnDate,
      presenceDurationDays,
      actingOfficerId: data.actingOfficerId ? new Types.ObjectId(data.actingOfficerId) : undefined,
      isActingOfficerPresentConfirmed: Boolean(data.isActingOfficerPresentConfirmed),
      reason: data.reason,
      status: "pending_commander", // Directly goes to Commander pending queue
      createdBy: new Types.ObjectId(auth.user!.id),
      updatedBy: new Types.ObjectId(auth.user!.id),
    });

    // Update officer defaultLeaveSystem for memory
    const { Officer } = await import("@/lib/db/models/Officer");
    await Officer.findByIdAndUpdate(data.officerId, { defaultLeaveSystem: data.type });

    const { logAuditEvent } = await import("@/lib/auth/audit");
    await logAuditEvent({
      userId: auth.user!.id,
      userName: auth.user!.fullName,
      action: "CREATE",
      module: "arkan_harb",
      description: `تقديم طلب إجازة (${data.type}) للضابط في انتظار تصديق القائد`,
      targetId: leave._id.toString(),
      ipAddress: ip,
    });

    return NextResponse.json({ success: true, data: { id: leave._id.toString() } }, { status: 201 });
  } catch (error) {
    return handleApiError(error, "حدث خطأ أثناء تسجيل طلب الإجازة");
  }
}

export { GET } from "@/app/api/officers/leaves/route";
