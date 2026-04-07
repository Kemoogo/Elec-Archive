import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db/connect";
import { authenticate } from "@/lib/auth/middleware";
import { logAuditEvent } from "@/lib/auth/audit";
import { errors } from "@/lib/auth/errors";
import { Fax } from "@/lib/db/models/Fax";
import { canCloseFax } from "@/lib/fax/access";
import { closeSchema } from "@/lib/validations/fax";
import { checkApiRateLimit, rateLimitErrorResponse } from "@/lib/security/rate-limit";

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

  if (fax.status !== "forwarded") {
    return NextResponse.json(
      { success: false, error: "الفاكس ليس في حالة موجّه" },
      { status: 409 },
    );
  }

  if (!canCloseFax(auth.user!, fax)) {
    return NextResponse.json(
      { success: false, error: errors.insufficientPermissions },
      { status: 403 },
    );
  }

  const body = await request.json();
  const parsed = closeSchema.safeParse(body);
  const note = parsed.success ? parsed.data.note : undefined;

  fax.status = "closed";
  fax.closedBy = auth.user!.id;
  fax.closedAt = new Date();

  await fax.save();

  await logAuditEvent({
    userId: auth.user!.id,
    userName: auth.user!.fullName,
    action: "UPDATE",
    module: "fax",
    targetId: fax._id.toString(),
    description: `تم إغلاق الفاكس رقم ${fax.faxNumber}${note ? ` — ملاحظة: ${note}` : ""}`,
    ipAddress: ip,
  });

  return NextResponse.json({
    success: true,
    data: {
      _id: fax._id.toString(),
      status: "closed",
      closedBy: auth.user!.id,
      closedAt: fax.closedAt.toISOString(),
    },
  });
}
