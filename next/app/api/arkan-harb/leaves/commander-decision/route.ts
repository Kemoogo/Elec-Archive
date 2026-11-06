import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db/connect";
import { authenticate } from "@/lib/auth/middleware";
import { checkApiRateLimit, rateLimitErrorResponse } from "@/lib/security/rate-limit";
import { Leave } from "@/lib/db/models/Leave";
import { Officer } from "@/lib/db/models/Officer";
import { Types } from "mongoose";
import { commanderDecisionSchema } from "@/lib/validations/officers";
import { errors } from "@/lib/auth/errors";
import { handleApiError } from "@/lib/utils/api-error";
import { logAuditEvent } from "@/lib/auth/audit";
import { createNotificationForStaffOps } from "@/lib/notifications/createNotification";

export async function POST(request: Request) {
  const auth = await authenticate();
  if (!auth.success) return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });

  // Commander or Admin check strictly required — employees can never approve commander decisions
  const isCommanderOrAdmin = auth.user?.role === "commander" || auth.user?.role === "admin";
  if (!isCommanderOrAdmin) {
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
    const approverRoleTitle = auth.user?.role === "admin" ? "مدير النظام (الأدمن)" : "السيد القائد";

    if (action === "approve") {
      // Check duty conflicts for all leaves being approved
      const leavesToApprove = await Leave.find({ _id: { $in: validObjectIds } }).lean();
      const { getOfficerActiveDutiesInRange, formatDutyConflictErrorMessage } = await import(
        "@/lib/arkan-harb/roster-leaves-sync"
      );

      for (const l of leavesToApprove) {
        const sStr = l.startDate instanceof Date ? l.startDate.toISOString().slice(0, 10) : String(l.startDate).slice(0, 10);
        const eStr = l.endDate instanceof Date ? l.endDate.toISOString().slice(0, 10) : String(l.endDate).slice(0, 10);
        const conflicts = await getOfficerActiveDutiesInRange(l.officerId, sStr, eStr);
        if (conflicts.length > 0) {
          return NextResponse.json(
            {
              success: false,
              error: `لا يمكن تصديق إجازة الضابط لوجود نوبتجيات مكلف بها خلال فترة الإجازة:\n${formatDutyConflictErrorMessage(conflicts)}`,
            },
            { status: 400 }
          );
        }
      }

      // Fetch officers to record their names in audit log
      const officerIdsToFind = leavesToApprove.map((l) => l.officerId);
      const approvedOfficers = await Officer.find({ _id: { $in: officerIdsToFind } })
        .select("_id fullName")
        .lean();
      const officerNameMap = new Map(approvedOfficers.map((o) => [o._id.toString(), o.fullName]));

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

      // Audit log: individual record per officer if 1 leave, or single combined record mentioning all officers if bulk
      if (leavesToApprove.length === 1) {
        const singleLeave = leavesToApprove[0];
        const offName = officerNameMap.get(singleLeave.officerId.toString()) || "ضابط";
        await logAuditEvent({
          userId: auth.user!.id,
          userName: auth.user!.fullName,
          action: "UPDATE",
          module: "arkan_harb",
          description: `تصديق إجازة الضابط (${offName}) عن طريق ${approverRoleTitle}${notes ? ` (ملاحظات: ${notes})` : ""}`,
          targetId: singleLeave._id.toString(),
          ipAddress: ip,
        });
      } else {
        const officerNamesList = leavesToApprove
          .map((l) => officerNameMap.get(l.officerId.toString()))
          .filter(Boolean) as string[];
        const uniqueNames = Array.from(new Set(officerNamesList));
        const namesFormatted = uniqueNames.join("، ");

        await logAuditEvent({
          userId: auth.user!.id,
          userName: auth.user!.fullName,
          action: "UPDATE",
          module: "arkan_harb",
          description: `تصديق مجمع على (${leavesToApprove.length}) طلبات إجازة للضباط: [${namesFormatted}] عن طريق ${approverRoleTitle}${notes ? ` (ملاحظات: ${notes})` : ""}`,
          targetId: validObjectIds[0].toString(),
          ipAddress: ip,
        });
      }

      // Notify Staff Ops (Arkan Harb)
      await createNotificationForStaffOps({
        type: "leave_decision",
        title: `تصديق إجازات من ${approverRoleTitle}`,
        body: `تم التصديق على (${targetIds.length}) طلب إجازة عن طريق ${approverRoleTitle}.`,
        refId: targetIds[0],
        refModel: "Leave",
      }).catch(() => {});

      return NextResponse.json({ success: true, message: "تم تصديق الطلبات بنجاح" });
    }

    if (action === "reject") {
      const leavesToReject = await Leave.find({ _id: { $in: validObjectIds } }).lean();
      const officerIdsToFind = leavesToReject.map((l) => l.officerId);
      const rejectedOfficers = await Officer.find({ _id: { $in: officerIdsToFind } })
        .select("_id fullName")
        .lean();
      const officerNameMap = new Map(rejectedOfficers.map((o) => [o._id.toString(), o.fullName]));

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

      if (leavesToReject.length === 1) {
        const singleLeave = leavesToReject[0];
        const offName = officerNameMap.get(singleLeave.officerId.toString()) || "ضابط";
        await logAuditEvent({
          userId: auth.user!.id,
          userName: auth.user!.fullName,
          action: "UPDATE",
          module: "arkan_harb",
          description: `عدم تصديق على طلب إجازة الضابط (${offName}) عن طريق ${approverRoleTitle}: ${notes || "بدون إبداء أسباب"}`,
          targetId: singleLeave._id.toString(),
          ipAddress: ip,
        });
      } else {
        const officerNamesList = leavesToReject
          .map((l) => officerNameMap.get(l.officerId.toString()))
          .filter(Boolean) as string[];
        const uniqueNames = Array.from(new Set(officerNamesList));
        const namesFormatted = uniqueNames.join("، ");

        await logAuditEvent({
          userId: auth.user!.id,
          userName: auth.user!.fullName,
          action: "UPDATE",
          module: "arkan_harb",
          description: `عدم تصديق مجمع على (${leavesToReject.length}) طلبات إجازة للضباط: [${namesFormatted}] عن طريق ${approverRoleTitle}: ${notes || "بدون إبداء أسباب"}`,
          targetId: validObjectIds[0].toString(),
          ipAddress: ip,
        });
      }

      // Notify Staff Ops (Arkan Harb)
      await createNotificationForStaffOps({
        type: "leave_decision",
        title: `قرار عدم التصديق من ${approverRoleTitle}`,
        body: `عدم التصديق على طلبات الإجازة عن طريق ${approverRoleTitle}: ${notes || "بدون إبداء أسباب"}.`,
        refId: targetIds[0],
        refModel: "Leave",
      }).catch(() => {});

      return NextResponse.json({ success: true, message: "تم تسجيل عدم التصديق بنجاح" });
    }

    if (action === "modify") {
      // "تعديل"
      if (!startDate || !endDate) {
        return NextResponse.json({ success: false, error: "يجب تحديد تاريخي البداية والنهاية المعدلين" }, { status: 400 });
      }

      const targetLeave = await Leave.findById(targetIds[0]).lean();
      if (!targetLeave) {
        return NextResponse.json({ success: false, error: "طلب الإجازة غير موجود" }, { status: 404 });
      }

      const targetOfficer = await Officer.findById(targetLeave.officerId).select("fullName").lean();
      const offName = targetOfficer?.fullName || "ضابط";

      const { getOfficerActiveDutiesInRange, formatDutyConflictErrorMessage } = await import(
        "@/lib/arkan-harb/roster-leaves-sync"
      );
      const sStr = startDate.slice(0, 10);
      const eStr = endDate.slice(0, 10);
      const conflicts = await getOfficerActiveDutiesInRange(targetLeave.officerId, sStr, eStr);
      if (conflicts.length > 0) {
        return NextResponse.json(
          {
            success: false,
            error: `لا يمكن تعديل وتصديق الإجازة لوجود نوبتجيات مكلف بها الضابط في الفترة المعدلة:\n${formatDutyConflictErrorMessage(conflicts)}`,
          },
          { status: 400 }
        );
      }

      const sDate = new Date(startDate);
      const eDate = new Date(endDate);

      await Leave.findByIdAndUpdate(targetIds[0], {
        startDate: sDate,
        endDate: eDate,
        status: "approved", // modification by commander directly approves the modified duration
        updatedBy: new Types.ObjectId(auth.user!.id),
        "commanderDecision.status": "approved",
        "commanderDecision.notes": notes ? `تعديل ${approverRoleTitle} واعتماد: ${notes}` : "تم تعديل المدة والتصديق",
        "commanderDecision.decidedAt": now,
        "commanderDecision.decidedBy": new Types.ObjectId(auth.user!.id),
      });

      await logAuditEvent({
        userId: auth.user!.id,
        userName: auth.user!.fullName,
        action: "UPDATE",
        module: "arkan_harb",
        description: `تعديل مواعيد إجازة الضابط (${offName}) من ${startDate} إلى ${endDate} واعتمادها عن طريق ${approverRoleTitle}`,
        targetId: targetIds[0],
        ipAddress: ip,
      });

      // Notify Staff Ops (Arkan Harb)
      await createNotificationForStaffOps({
        type: "leave_decision",
        title: `تعديل إجازة وتصديق من ${approverRoleTitle}`,
        body: `قام ${approverRoleTitle} بتعديل مواعيد الإجازة (${startDate} إلى ${endDate}) واعتمادها للضابط (${offName}).`,
        refId: targetIds[0],
        refModel: "Leave",
      }).catch(() => {});

      return NextResponse.json({ success: true, message: "تم تعديل مواعيد الإجازة والتصديق عليها بنجاح" });
    }

    if (action === "other_orders") {
      // "أوامر أخرى"
      const leavesWithOrders = await Leave.find({ _id: { $in: validObjectIds } }).lean();
      const officerIdsToFind = leavesWithOrders.map((l) => l.officerId);
      const officersFound = await Officer.find({ _id: { $in: officerIdsToFind } })
        .select("_id fullName")
        .lean();
      const officerNameMap = new Map(officersFound.map((o) => [o._id.toString(), o.fullName]));

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

      if (leavesWithOrders.length === 1) {
        const singleLeave = leavesWithOrders[0];
        const offName = officerNameMap.get(singleLeave.officerId.toString()) || "ضابط";
        await logAuditEvent({
          userId: auth.user!.id,
          userName: auth.user!.fullName,
          action: "UPDATE",
          module: "arkan_harb",
          description: `توجيه أوامر أخرى من ${approverRoleTitle} بخصوص طلب إجازة الضابط (${offName}): ${notes || ""}`,
          targetId: singleLeave._id.toString(),
          ipAddress: ip,
        });
      } else {
        const officerNamesList = leavesWithOrders
          .map((l) => officerNameMap.get(l.officerId.toString()))
          .filter(Boolean) as string[];
        const uniqueNames = Array.from(new Set(officerNamesList));
        const namesFormatted = uniqueNames.join("، ");

        await logAuditEvent({
          userId: auth.user!.id,
          userName: auth.user!.fullName,
          action: "UPDATE",
          module: "arkan_harb",
          description: `توجيه أوامر أخرى من ${approverRoleTitle} بخصوص (${leavesWithOrders.length}) طلبات إجازة للضباط: [${namesFormatted}]: ${notes || ""}`,
          targetId: validObjectIds[0].toString(),
          ipAddress: ip,
        });
      }

      // Notify Staff Ops (Arkan Harb)
      await createNotificationForStaffOps({
        type: "leave_decision",
        title: `توجيهات وأوامر أخرى من ${approverRoleTitle}`,
        body: `توجيهات ${approverRoleTitle} بشأن الإجازة: ${notes || "يرجى مراجعة التوجيهات"}.`,
        refId: targetIds[0],
        refModel: "Leave",
      }).catch(() => {});

      return NextResponse.json({ success: true, message: "تم تسجيل أوامر القائد بنجاح وإعادتها لأركان حرب" });
    }

    return NextResponse.json({ success: false, error: "إجراء غير معروف" }, { status: 400 });
  } catch (error) {
    return handleApiError(error, "حدث خطأ أثناء معالجة قرار القائد");
  }
}
