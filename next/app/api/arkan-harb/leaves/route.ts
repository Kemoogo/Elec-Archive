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

    const overlapping = await Leave.findOne({
      officerId: data.officerId,
      status: { $ne: "cancelled" },
      $or: [
        { startDate: { $lte: endDate }, endDate: { $gte: startDate } },
      ],
    });

    if (overlapping) {
      return NextResponse.json({ success: false, error: "يوجد تداخل مع إجازة أخرى مسجلة لنفس الضابط في هذه الفترة" }, { status: 409 });
    }

    const leave = await Leave.create({ ...data, status: "draft", createdBy: new Types.ObjectId(auth.user!.id), updatedBy: new Types.ObjectId(auth.user!.id) });
    return NextResponse.json({ success: true, data: { id: leave._id.toString() } }, { status: 201 });
  } catch (error) {
    return handleApiError(error, "حدث خطأ أثناء تسجيل الإجازة");
  }
}

export { GET } from "@/app/api/officers/leaves/route";
