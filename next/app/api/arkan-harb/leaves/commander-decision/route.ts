import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db/connect";
import { authenticate } from "@/lib/auth/middleware";
import { checkApiRateLimit, rateLimitErrorResponse } from "@/lib/security/rate-limit";
import { canEditModule } from "@/lib/auth/authorization";
import { Leave } from "@/lib/db/models/Leave";
import { Types } from "mongoose";
import { commanderDecisionSchema } from "@/lib/validations/officers";
import { errors } from "@/lib/auth/errors";
import { handleApiError } from "@/lib/utils/api-error";
import { logAuditEvent } from "@/lib/auth/audit";

export async function POST(request: Request) {
  const auth = await authenticate();
  if (!auth.success) return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });

  // Commander or Admin check
  const isCommanderOrAdmin = auth.user!.role === "commander" || auth.user!.role === "admin";
  if (!isCommanderOrAdmin && !canEditModule(auth.user!, "arkan_harb")) {
    return NextResponse.json({ success: false, error: errors.insufficientPermissions }, { status: 403 });
  }

  const ip = request.headers.get("x-forwarded-for") ?? "";
  const rl = checkApiRateLimit(auth.user!.id, ip, "write");
  if (!rl.allowed) {
    return NextResponse.json(rateLimitErrorResponse(rl.resetAt), { status: 429 });
  }

  await connectToDatabase();

  try {
    const body = await request.json();
    const parsed = commanderDecisionSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: "بيانات غير صالحة", details: parsed.error.issues }, { status: 400 });
    }

    const { leaveId, leaveIds, action, notes, startDate, endDate } = parsed.data;
    const targetIds = leaveIds && leaveIds.length > 0 ? leaveIds : leaveId ? [leaveId] : [];

    if (targetIds.length === 0) {
      return NextResponse.json({ success: false, error: "يجب تحديد طلب إجازة واحد على الأقل" }, { status: 400 });
    }

    const validObjectIds = targetIds.map((id) => new Types.ObjectId(id));
    const now = new Date();

    if (action === "approve") {
      // Bulk or individual "تصدق"
      await Leave.updateMany(
        { _id: { $in: validObjectIds } },
        {
          $set: {
            status: "approved",
            updatedBy: new Types.ObjectId(auth.user!.id),
            "commanderDecision.status": "approved",
            "commanderDecision.notes": notes || "تم التصديق",
            "commanderDecision.decidedAt": now,
            "commanderDecision.decidedBy": new Types.ObjectId(auth.user!.id),
          },
        }
      );

      await logAuditEvent({
        userId: auth.user!.id,
        userName: auth.user!.fullName,
        action: "STATUS_CHANGE",
        module: "arkan_harb",
        description: `تصديق القائد على (${targetIds.length}) طلب إجازة`,
        targetId: targetIds[0],
        ipAddress: ip,
      });

      return NextResponse.json({ success: true, message: "تم تصديق الطلبات بنجاح" });
    }

    if (action === "reject") {
      // "لم يتصدق"
      await Leave.updateMany(
        { _id: { $in: validObjectIds } },
        {
          $set: {
            status: "rejected",
            updatedBy: new Types.ObjectId(auth.user!.id),
            "commanderDecision.status": "rejected",
            "commanderDecision.notes": notes || "لم يتصدق",
            "commanderDecision.decidedAt": now,
            "commanderDecision.decidedBy": new Types.ObjectId(auth.user!.id),
          },
        }
      );

      await logAuditEvent({
        userId: auth.user!.id,
        userName: auth.user!.fullName,
        action: "STATUS_CHANGE",
        module: "arkan_harb",
        description: `عدم تصديق القائد على طلب إجازة: ${notes || "بدون إبداء أسباب"}`,
        targetId: targetIds[0],
        ipAddress: ip,
      });

      return NextResponse.json({ success: true, message: "تم تسجيل عدم التصديق بنجاح" });
    }

    if (action === "modify") {
      // "تعديل"
      if (!startDate || !endDate) {
        return NextResponse.json({ success: false, error: "يجب تحديد تاريخي البداية والنهاية المعدلين" }, { status: 400 });
      }

      const sDate = new Date(startDate);
      const eDate = new Date(endDate);

      await Leave.findByIdAndUpdate(targetIds[0], {
        startDate: sDate,
        endDate: eDate,
        status: "approved", // modification by commander directly approves the modified duration
        updatedBy: new Types.ObjectId(auth.user!.id),
        "commanderDecision.status": "approved",
        "commanderDecision.notes": notes ? `تعديل القائد واعتماد: ${notes}` : "تم تعديل المدة والتصديق",
        "commanderDecision.decidedAt": now,
        "commanderDecision.decidedBy": new Types.ObjectId(auth.user!.id),
      });

      await logAuditEvent({
        userId: auth.user!.id,
        userName: auth.user!.fullName,
        action: "UPDATE",
        module: "arkan_harb",
        description: `تعديل القائد لمواعيد الإجازة من ${startDate} إلى ${endDate} واعتمادها`,
        targetId: targetIds[0],
        ipAddress: ip,
      });

      return NextResponse.json({ success: true, message: "تم تعديل مواعيد الإجازة والتصديق عليها بنجاح" });
    }

    if (action === "other_orders") {
      // "أوامر أخرى"
      await Leave.updateMany(
        { _id: { $in: validObjectIds } },
        {
          $set: {
            status: "other_orders",
            updatedBy: new Types.ObjectId(auth.user!.id),
            "commanderDecision.status": "other_orders",
            "commanderDecision.notes": notes || "أوامر أخرى للتعليمات",
            "commanderDecision.decidedAt": now,
            "commanderDecision.decidedBy": new Types.ObjectId(auth.user!.id),
          },
        }
      );

      await logAuditEvent({
        userId: auth.user!.id,
        userName: auth.user!.fullName,
        action: "STATUS_CHANGE",
        module: "arkan_harb",
        description: `توجيه أوامر أخرى من القائد بخصوص طلب الإجازة: ${notes || ""}`,
        targetId: targetIds[0],
        ipAddress: ip,
      });

      return NextResponse.json({ success: true, message: "تم تسجيل أوامر القائد بنجاح وإعادتها لأركان حرب" });
    }

    return NextResponse.json({ success: false, error: "إجراء غير معروف" }, { status: 400 });
  } catch (error) {
    return handleApiError(error, "حدث خطأ أثناء معالجة قرار القائد");
  }
}
