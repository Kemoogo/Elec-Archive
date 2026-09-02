import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db/connect";
import { authenticate } from "@/lib/auth/middleware";
import { canEditModule } from "@/lib/auth/authorization";
import { logAuditEvent } from "@/lib/auth/audit";
import { errors } from "@/lib/auth/errors";
import { Mission, type MissionStatus } from "@/lib/db/models/Mission";
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

    // 5. Parse + Validate body
    const body: unknown = await request.json();
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

    // 7. Apply updates
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
