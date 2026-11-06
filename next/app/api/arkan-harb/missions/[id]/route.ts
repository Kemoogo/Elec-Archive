import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db/connect";
import { authenticate } from "@/lib/auth/middleware";
import { canEditModule } from "@/lib/auth/authorization";
import { logAuditEvent } from "@/lib/auth/audit";
import { errors } from "@/lib/auth/errors";
import { Mission, type MissionStatus } from "@/lib/db/models/Mission";
import { Leave } from "@/lib/db/models/Leave";
import { handleApiError } from "@/lib/utils/api-error";
import { checkApiRateLimit, rateLimitErrorResponse } from "@/lib/security/rate-limit";
import { updateMissionSchema } from "@/lib/validations/arkan-harb";

/** Valid lifecycle transitions */
const VALID_TRANSITIONS: Record<string, MissionStatus[]> = {
  scheduled: ["active", "completed", "cancelled", "postponed"],
  active: ["completed", "cancelled", "postponed"],
  postponed: ["scheduled", "active", "completed", "cancelled"],
  completed: ["active", "scheduled", "cancelled", "postponed"],
  cancelled: ["scheduled", "active", "completed", "postponed"],
};

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

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

  await connectToDatabase();

  try {
    // 4. Find existing mission
    const mission = await Mission.findById(id);
    if (!mission) {
      return NextResponse.json({ success: false, error: "المأمورية غير موجودة" }, { status: 404 });
    }

    const contentType = request.headers.get("content-type") || "";
    let body: Record<string, unknown> = {};

    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData();
      const clearanceFile = formData.get("clearanceFile");
      if (clearanceFile instanceof File && clearanceFile.size > 0) {
        const { saveUploadedFile } = await import("@/lib/uploads");
        const uploadRes = await saveUploadedFile(clearanceFile, "missions");
        if (!uploadRes.success) {
          return NextResponse.json(
            { success: false, error: uploadRes.error || "فشل رفع مستند إخلاء الطرف" },
            { status: 400 },
          );
        }
        mission.clearanceDocuments = mission.clearanceDocuments || [];
        mission.clearanceDocuments.push({
          name: clearanceFile.name,
          fileUrl: uploadRes.filePath || "",
          uploadedAt: new Date(),
        });
      }
      for (const [key, value] of formData.entries()) {
        if (key !== "clearanceFile") {
          body[key] = value;
        }
      }
    } else {
      body = (await request.json()) as Record<string, unknown>;
    }

    const parsed = updateMissionSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: errors.validationFailed, details: parsed.error.issues },
        { status: 400 },
      );
    }

    const data = parsed.data;

    // 6. Validate status transition if status is being changed
    if (data.status && data.status !== mission.status) {
      const allowedNext = VALID_TRANSITIONS[mission.status];
      if (!allowedNext || !allowedNext.includes(data.status)) {
        return NextResponse.json(
          {
            success: false,
            error: `لا يمكن تحويل الحالة من "${mission.status}" إلى "${data.status}"`,
          },
          { status: 400 },
        );
      }
    }

    // RULE: Only internal daily missions are permitted during leave.
    // External multiday missions / courses are strictly prohibited during active leave unless the leave is interrupted/cut first.
    const effectiveType = data.missionType ?? mission.missionType ?? "external_multiday";
    const effectiveStatus = data.status ?? mission.status;

    if (effectiveType !== "internal_daily" && effectiveStatus !== "cancelled") {
      const targetStart = data.startDate ? new Date(data.startDate) : mission.startDate;
      const rawEnd = data.endDate !== undefined ? (data.endDate ? new Date(data.endDate) : null) : mission.endDate;
      const targetEnd = rawEnd
        ? new Date(rawEnd)
        : new Date(targetStart.getFullYear(), targetStart.getMonth(), targetStart.getDate(), 23, 59, 59, 999);

      const overlappingLeave = await Leave.findOne({
        officerId: mission.officerId,
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

    // 7. Apply updates
    if (data.missionType !== undefined) mission.missionType = data.missionType;
    if (data.title !== undefined) mission.title = data.title;
    if (data.description !== undefined) mission.description = data.description;
    if (data.destination !== undefined) mission.destination = data.destination;
    if (data.startDate !== undefined) mission.startDate = new Date(data.startDate);
    if (data.endDate !== undefined) mission.endDate = data.endDate ? new Date(data.endDate) : undefined;
    if (data.status !== undefined) {
      mission.status = data.status;
      if (data.status === "completed" && !mission.completedAt) {
        mission.completedAt = new Date();
      }
    } else if (data.startDate !== undefined || data.endDate !== undefined) {
      if (mission.status === "scheduled" || mission.status === "active") {
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const start = mission.startDate;
        const startDay = new Date(start.getFullYear(), start.getMonth(), start.getDate());
        const end = mission.endDate;
        const endDay = end ? new Date(end.getFullYear(), end.getMonth(), end.getDate()) : null;

        if (endDay && today > endDay) {
          mission.status = "completed";
          if (!mission.completedAt) mission.completedAt = new Date();
        } else if (today >= startDay && (!endDay || today <= endDay)) {
          mission.status = "active";
        } else {
          mission.status = "scheduled";
        }
      }
    }
    if (data.statusReason !== undefined) mission.statusReason = data.statusReason;
    if (data.resultSummary !== undefined) mission.resultSummary = data.resultSummary;
    if (data.linkedFaxId !== undefined) mission.linkedFaxId = data.linkedFaxId;
    if (data.travelOrderNumber !== undefined) mission.travelOrderNumber = data.travelOrderNumber;
    if (data.transportationMean !== undefined) mission.transportationMean = data.transportationMean;
    if (data.authorizedWeapons !== undefined) mission.authorizedWeapons = data.authorizedWeapons;
    if (data.clearanceDocuments !== undefined) {
      mission.clearanceDocuments = data.clearanceDocuments.map((d) => ({
        name: d.name,
        fileUrl: d.fileUrl,
        uploadedAt: d.uploadedAt ? new Date(d.uploadedAt) : new Date(),
      }));
    }

    await mission.save();

    // 8. Audit
    await logAuditEvent({
      userId: auth.user!.id,
      userName: auth.user!.fullName,
      action: "UPDATE",
      module: "arkan_harb",
      targetId: id,
      description: `تم تحديث المأمورية: ${mission.title}${data.status ? ` (الحالة: ${data.status})` : ""}`,
      ipAddress: ip,
    });

    // 9. Response
    return NextResponse.json({ success: true, data: { id } });
  } catch (error) {
    return handleApiError(error, "حدث خطأ أثناء تحديث المأمورية");
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  // 1. Auth
  const auth = await authenticate();
  if (!auth.success) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
  }

  // 2. Only Admin can delete
  if (auth.user!.role !== "admin") {
    return NextResponse.json(
      { success: false, error: "صلاحية الحذف مقتصرة على مدير النظام فقط" },
      { status: 403 },
    );
  }

  // 3. Rate limit
  const ip = request.headers.get("x-forwarded-for") ?? "";
  const rl = checkApiRateLimit(auth.user!.id, ip, "write");
  if (!rl.allowed) {
    return NextResponse.json(rateLimitErrorResponse(rl.resetAt), { status: 429 });
  }

  await connectToDatabase();

  try {
    const mission = await Mission.findByIdAndDelete(id);
    if (!mission) {
      return NextResponse.json({ success: false, error: "المأمورية غير موجودة" }, { status: 404 });
    }

    await logAuditEvent({
      userId: auth.user!.id,
      userName: auth.user!.fullName,
      action: "DELETE",
      module: "arkan_harb",
      targetId: id,
      description: `تم حذف المأمورية: ${mission.title}`,
      ipAddress: ip,
    });

    return NextResponse.json({ success: true, message: "تم حذف المأمورية بنجاح" });
  } catch (error) {
    return handleApiError(error, "حدث خطأ أثناء حذف المأمورية");
  }
}
