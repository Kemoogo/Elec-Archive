import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db/connect";
import { authenticate } from "@/lib/auth/middleware";
import { checkApiRateLimit, rateLimitErrorResponse } from "@/lib/security/rate-limit";
import { canEditModule } from "@/lib/auth/authorization";
import { Leave, LEAVE_TYPE_LABELS, type LeaveType } from "@/lib/db/models/Leave";
import { Mission } from "@/lib/db/models/Mission";

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
    let rawData: Record<string, unknown> = {};
    let uploadedMedicalUrl: string | undefined;

    const contentType = request.headers.get("content-type") || "";
    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData();
      const file = formData.get("medicalFile");
      if (file instanceof File && file.size > 0) {
        const { saveUploadedFile } = await import("@/lib/uploads");
        const uploadRes = await saveUploadedFile(file, "leaves");
        if (!uploadRes.success) {
          return NextResponse.json(
            { success: false, error: uploadRes.error || "فشل رفع شيت الإجازة المرضية" },
            { status: 400 }
          );
        }
        uploadedMedicalUrl = uploadRes.filePath;
      }

      for (const [key, value] of formData.entries()) {
        if (key !== "medicalFile") {
          if (key === "isActingOfficerPresentConfirmed") {
            rawData[key] = value === "true";
          } else if (key === "presenceDurationDays") {
            rawData[key] = Number(value);
          } else {
            rawData[key] = value;
          }
        }
      }
      if (uploadedMedicalUrl) {
        rawData.medicalReportUrl = uploadedMedicalUrl;
      }
    } else {
      rawData = await request.json();
    }

    const parsed = createLeaveSchema.safeParse(rawData);
    if (!parsed.success) return NextResponse.json({ success: false, error: "بيانات غير صالحة", details: parsed.error.issues }, { status: 400 });

    const data = parsed.data;
    const startDate = new Date(data.startDate);
    const endDate = new Date(data.endDate);

    const { Officer } = await import("@/lib/db/models/Officer");
    const officer = await Officer.findById(data.officerId);
    if (!officer) {
      return NextResponse.json({ success: false, error: "الضابط غير موجود" }, { status: 404 });
    }

    if (officer.employmentStatus !== "active" || !officer.isInUnit) {
      return NextResponse.json({ success: false, error: "لا يمكن إضافة إجازة لضابط خارج الوحدة أو منقول/منتهية خدمته" }, { status: 400 });
    }

    // Overlapping check with non-rejected/cancelled/closed/other_orders leaves
    const existingLeaves = await Leave.find({
      officerId: data.officerId,
      status: { $nin: ["rejected", "cancelled", "closed", "other_orders"] },
    }).lean();

    const toISODateStr = (d: Date | string) => {
      if (typeof d === "string") return d.slice(0, 10);
      return d.toISOString().slice(0, 10);
    };

    const reqStartStr = toISODateStr(data.startDate);
    const reqEndStr = toISODateStr(data.endDate);

    const hasOverlap = existingLeaves.some((l) => {
      // If leave was interrupted and officer returned on actualReturnDate,
      // the officer is already back in the unit.
      // If the new leave starts on or after actualReturnDate, there is NO overlap!
      if (l.status === "interrupted") {
        const retDateStr = l.actualReturnDate ? toISODateStr(l.actualReturnDate) : toISODateStr(l.endDate);
        if (reqStartStr >= retDateStr) {
          return false;
        }
        const lStartStr = toISODateStr(l.startDate);
        if (reqEndStr < lStartStr) {
          return false;
        }
        return true;
      }

      const lStartStr = toISODateStr(l.startDate);
      const lEndStr = toISODateStr(l.endDate);

      return reqStartStr <= lEndStr && reqEndStr >= lStartStr;
    });

    if (hasOverlap) {
      return NextResponse.json({ success: false, error: "يوجد تداخل مع إجازة أخرى مسجلة لنفس الضابط في هذه الفترة" }, { status: 409 });
    }

    // RULE: External multiday missions / courses are not permitted during leave.
    const overlappingMission = await Mission.findOne({
      officerId: data.officerId,
      missionType: { $ne: "internal_daily" },
      status: { $in: ["scheduled", "active"] },
      startDate: { $lte: new Date(reqEndStr + "T23:59:59.999Z") },
      $or: [
        { endDate: { $exists: false } },
        { endDate: null },
        { endDate: { $gte: new Date(reqStartStr + "T00:00:00.000Z") } },
      ],
    }).lean();

    if (overlappingMission) {
      return NextResponse.json(
        {
          success: false,
          error: "لا يمكن تسجيل إجازة للضابط لوجود مأمورية خارجية أو فرقة مسجلة له في نفس الفترة، يجب إلغاء أو تعديل المأمورية أولاً.",
        },
        { status: 400 },
      );
    }

    // RULE: An officer cannot take leave while assigned to active unswapped duties
    const { getOfficerActiveDutiesInRange, formatDutyConflictErrorMessage } = await import(
      "@/lib/arkan-harb/roster-leaves-sync"
    );
    const dutyConflicts = await getOfficerActiveDutiesInRange(data.officerId, reqStartStr, reqEndStr);
    if (dutyConflicts.length > 0) {
      return NextResponse.json(
        {
          success: false,
          error: formatDutyConflictErrorMessage(dutyConflicts),
        },
        { status: 400 }
      );
    }

    // Medical leave check: medical sheet is mandatory
    if (data.type === "medical" && !data.medicalReportUrl) {
      return NextResponse.json(
        { success: false, error: "يجب رفع وإرفاق صورة شيت الإجازة المرضية / الأورنيك الطبي" },
        { status: 400 }
      );
    }

    // Auto calculate lastReturnDate & presenceDurationDays if not explicitly passed
    let lastReturnDate: Date | undefined = data.lastReturnDate ? new Date(data.lastReturnDate) : undefined;
    let presenceDurationDays: number = data.presenceDurationDays ?? 0;

    if (!lastReturnDate) {
      const lastLeave = await Leave.findOne({
        officerId: data.officerId,
        status: { $in: ["closed", "interrupted", "approved"] },
        $or: [
          { actualReturnDate: { $lt: startDate } },
          { endDate: { $lt: startDate } },
        ],
      }).sort({ actualReturnDate: -1, endDate: -1 }).lean();

      if (lastLeave) {
        lastReturnDate = lastLeave.actualReturnDate ? new Date(lastLeave.actualReturnDate) : new Date(lastLeave.endDate);
        const diffTime = Math.max(0, startDate.getTime() - lastReturnDate.getTime());
        presenceDurationDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
      } else if (officer.createdAt) {
        lastReturnDate = new Date(officer.createdAt);
        const diffTime = Math.max(0, startDate.getTime() - lastReturnDate.getTime());
        presenceDurationDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
      }
    }

    // Smart Status Determination:
    // 1. Daily Sleep officers taking weekly rest -> directly approved without commander approval
    const isDailySleepRest = officer.defaultLeaveSystem === "daily_sleep" && data.type === "weekly_rest";
    // 2. Medical leave -> directly approved based on accredited medical sheet
    const isMedical = data.type === "medical";

    const typeArabicLabel = LEAVE_TYPE_LABELS[data.type as LeaveType] || data.type;

    let initialStatus: "approved" | "pending_commander" = "pending_commander";
    let auditDesc = `تقديم طلب إجازة (${typeArabicLabel}) للضابط (${officer.fullName}) في انتظار تصديق القائد`;

    if (isDailySleepRest) {
      initialStatus = "approved";
      auditDesc = `تسجيل وتنفيذ راحة أسبوعية مباشرة لضابط مبيت يومي (${officer.fullName}) (معتمدة تلقائياً)`;
    } else if (isMedical) {
      initialStatus = "approved";
      auditDesc = `تسجيل إجازة مرضية معتمدة للضابط (${officer.fullName}) مرفق بها شيت الإجازة الطبي`;
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
      isActingOfficerPresentConfirmed: Boolean(data.actingOfficerId && data.isActingOfficerPresentConfirmed),
      reason: data.reason,
      medicalReportUrl: data.medicalReportUrl,
      status: initialStatus,
      createdBy: new Types.ObjectId(auth.user!.id),
      updatedBy: new Types.ObjectId(auth.user!.id),
    });

    // Update officer defaultLeaveSystem ONLY if it's one of the 3 official systems and not yet set
    const validOfficerSystems = ["field", "daily_sleep", "weekly_rest"];
    if (!officer.defaultLeaveSystem && validOfficerSystems.includes(data.type)) {
      officer.defaultLeaveSystem = data.type;
      await officer.save();
    }

    const { logAuditEvent } = await import("@/lib/auth/audit");
    await logAuditEvent({
      userId: auth.user!.id,
      userName: auth.user!.fullName,
      action: "CREATE",
      module: "arkan_harb",
      description: auditDesc,
      targetId: leave._id.toString(),
      ipAddress: ip,
    });

    return NextResponse.json({
      success: true,
      data: {
        id: leave._id.toString(),
        status: initialStatus,
        isAutoApproved: initialStatus === "approved",
      },
    }, { status: 201 });
  } catch (error) {
    return handleApiError(error, "حدث خطأ أثناء تسجيل طلب الإجازة");
  }
}

export { GET } from "@/app/api/officers/leaves/route";
