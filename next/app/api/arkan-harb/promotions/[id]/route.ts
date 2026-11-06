import { NextResponse } from "next/server";
import { Types } from "mongoose";
import { connectToDatabase } from "@/lib/db/connect";
import { authenticate } from "@/lib/auth/middleware";
import { canEditModule } from "@/lib/auth/authorization";
import { logAuditEvent } from "@/lib/auth/audit";
import { errors } from "@/lib/auth/errors";
import { Promotion } from "@/lib/db/models/Promotion";
import { handleApiError } from "@/lib/utils/api-error";
import { checkApiRateLimit, rateLimitErrorResponse } from "@/lib/security/rate-limit";
import { updatePromotionSchema } from "@/lib/validations/arkan-harb";

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
    // 4. Find existing promotion
    const promotion = await Promotion.findById(id);
    if (!promotion) {
      return NextResponse.json({ success: false, error: "الترقية غير موجودة" }, { status: 404 });
    }

    // 5. Parse + Validate body
    const body: unknown = await request.json();
    const parsed = updatePromotionSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: errors.validationFailed, details: parsed.error.issues },
        { status: 400 },
      );
    }

    const data = parsed.data;

    // 6. Apply updates
    if (data.fromRank !== undefined) promotion.fromRank = data.fromRank;
    if (data.toRank !== undefined) promotion.toRank = data.toRank;
    if (data.effectiveDate !== undefined) promotion.effectiveDate = new Date(data.effectiveDate);
    if (data.orderNumber !== undefined) promotion.orderNumber = data.orderNumber;
    if (data.notes !== undefined) promotion.notes = data.notes;
    
    // As mentioned in the spec: We do not attempt to rollback the officer's rank if toRank changes.
    // It just updates the record itself to simplify the process.
    
    promotion.updatedBy = new Types.ObjectId(auth.user!.id);
    await promotion.save();

    // 7. Audit
    await logAuditEvent({
      userId: auth.user!.id,
      userName: auth.user!.fullName,
      action: "UPDATE",
      module: "arkan_harb",
      targetId: id,
      description: `تم تحديث بيانات الترقية للمعرف ${id}`,
      ipAddress: ip,
    });

    // 8. Response
    return NextResponse.json({ success: true, data: { id } });
  } catch (error) {
    return handleApiError(error, "حدث خطأ أثناء تحديث الترقية");
  }
}
