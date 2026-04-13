import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db/connect";
import { authenticate } from "@/lib/auth/middleware";
import { canEditModule } from "@/lib/auth/authorization";
import { logAuditEvent } from "@/lib/auth/audit";
import { errors } from "@/lib/auth/errors";
import { Mission, type MissionStatus } from "@/lib/db/models/Mission";
import { checkApiRateLimit, rateLimitErrorResponse } from "@/lib/security/rate-limit";
import { updateMissionSchema } from "@/lib/validations/arkan-harb";

/** Valid lifecycle transitions — terminal states (completed, cancelled) have no outbound edges */
const VALID_TRANSITIONS: Record<string, MissionStatus[]> = {
  scheduled: ["active", "cancelled"],
  active: ["completed", "cancelled"],
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
    if (data.status !== undefined) mission.status = data.status;
    mission.updatedBy = mission.updatedBy; // preserve reference; set via schema type
    // updatedAt handled automatically by timestamps

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
    console.error("Missions PATCH error:", error);
    return NextResponse.json({ success: false, error: errors.internalError }, { status: 500 });
  }
}
