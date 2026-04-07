import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db/connect";
import { authenticate } from "@/lib/auth/middleware";
import { logAuditEvent } from "@/lib/auth/audit";
import { createNotificationForUser } from "@/lib/notifications/createNotification";
import { errors } from "@/lib/auth/errors";
import { Fax } from "@/lib/db/models/Fax";
import { User } from "@/lib/db/models/User";
import { decisionSchema } from "@/lib/validations/fax";
import { checkApiRateLimit, rateLimitErrorResponse } from "@/lib/security/rate-limit";
import type { Types } from "mongoose";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function PATCH(request: Request, { params }: RouteParams) {
  const auth = await authenticate();
  if (!auth.success) {
    return NextResponse.json(
      { success: false, error: auth.error },
      { status: auth.status },
    );
  }

  if (auth.user!.role !== "commander" && auth.user!.role !== "admin") {
    return NextResponse.json(
      { success: false, error: errors.insufficientPermissions },
      { status: 403 },
    );
  }

  const ip = request.headers.get("x-forwarded-for") ?? "";
  const rl = checkApiRateLimit(auth.user!.id, ip, "write");
  if (!rl.allowed) {
    return NextResponse.json(rateLimitErrorResponse(rl.resetAt), { status: 429 });
  }

  await connectToDatabase();

  const { id } = await params;

  const fax = await Fax.findById(id);
  if (!fax) {
    return NextResponse.json(
      { success: false, error: "الفاكس غير موجود" },
      { status: 404 },
    );
  }

  if (fax.status !== "pending") {
    return NextResponse.json(
      { success: false, error: "الفاكس ليس في حالة معلق" },
      { status: 409 },
    );
  }

  const body = await request.json();
  const parsed = decisionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: errors.validationFailed, details: parsed.error.issues },
      { status: 400 },
    );
  }

  const { decision, action, forwardToType, forwardToId, forwardToDepartment } = parsed.data;

  fax.commanderDecision = decision;
  fax.commanderDecisionAt = new Date();

  if (action === "close") {
    fax.status = "closed";
    fax.closedBy = auth.user!.id as unknown as Types.ObjectId;
    fax.closedAt = new Date();
  } else {
    fax.status = "forwarded";
    fax.forwardedToType = forwardToType;
    if (forwardToType === "user") {
      fax.forwardedToId = forwardToId as unknown as Types.ObjectId;
    } else {
      fax.forwardedToDepartment = forwardToDepartment;
    }
  }

  await fax.save();

  if (action === "forward") {
    if (forwardToType === "user" && forwardToId) {
      await createNotificationForUser(forwardToId, {
        type: "new_fax",
        title: "تم توجيه فاكس إليك",
        body: `قام ${auth.user!.fullName} بتوجيه فاكس رقم ${fax.faxNumber} إليك — ${fax.subject}`,
        refId: fax._id.toString(),
        refModel: "Fax",
      });
    } else if (forwardToType === "department" && forwardToDepartment) {
      const deptUsers = await User.find({
        department: forwardToDepartment,
        isActive: true,
        "permissions.fax": { $in: ["edit", "view"] },
      }).select("_id");

      for (const user of deptUsers) {
        await createNotificationForUser(user._id.toString(), {
          type: "new_fax",
          title: "تم توجيه فاكس لقسمكم",
          body: `قام ${auth.user!.fullName} بتوجيه فاكس رقم ${fax.faxNumber} إلى قسم ${forwardToDepartment} — ${fax.subject}`,
          refId: fax._id.toString(),
          refModel: "Fax",
        });
      }
    }
  }

  const actionLabel = action === "close" ? "إغلاق مباشر" : `توجيه إلى ${forwardToType === "user" ? "مستخدم" : "قسم"}`;
  await logAuditEvent({
    userId: auth.user!.id,
    userName: auth.user!.fullName,
    action: "UPDATE",
    module: "fax",
    targetId: fax._id.toString(),
    description: `${actionLabel} للفاكس رقم ${fax.faxNumber}: ${decision}`,
    ipAddress: ip,
  });

  return NextResponse.json({
    success: true,
    data: {
      _id: fax._id.toString(),
      status: fax.status,
      commanderDecision: fax.commanderDecision,
      commanderDecisionAt: fax.commanderDecisionAt?.toISOString(),
      forwardedToType: fax.forwardedToType ?? null,
      forwardedToId: fax.forwardedToId?.toString() ?? null,
      forwardedToDepartment: fax.forwardedToDepartment ?? null,
    },
  });
}
