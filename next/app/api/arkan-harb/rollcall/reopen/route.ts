import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db/connect";
import { authenticate } from "@/lib/auth/middleware";
import { checkApiRateLimit, rateLimitErrorResponse } from "@/lib/security/rate-limit";
import { getUtcDayRange } from "@/lib/arkan-harb/rollcall-engine";
import { DailyRollcall } from "@/lib/db/models/DailyRollcall";
import { logAuditEvent } from "@/lib/auth/audit";
import { handleApiError } from "@/lib/utils/api-error";
import { z } from "zod";

const reopenRollcallSchema = z.object({
  date: z.string().min(1, "تاريخ التمام مطلوب"),
});

export async function POST(request: Request) {
  const auth = await authenticate();
  if (!auth.success) return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });

  const ip = request.headers.get("x-forwarded-for") ?? "";
  const rl = checkApiRateLimit(auth.user!.id, ip, "write");
  if (!rl.allowed) {
    return NextResponse.json(rateLimitErrorResponse(rl.resetAt), { status: 429 });
  }

  // Enforce that ONLY Admin (user.role === "admin") can reopen rollcalls
  if (auth.user!.role !== "admin") {
    return NextResponse.json(
      {
        success: false,
        error: "عفواً، إعادة فتح كشف التمام المعتمد هي صلاحية حصرية لمدير النظام (Admin) فقط.",
      },
      { status: 403 }
    );
  }

  await connectToDatabase();

  try {
    const body = await request.json();
    const parsed = reopenRollcallSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: "بيانات غير صالحة", details: parsed.error.issues }, { status: 400 });
    }

    const { date } = parsed.data;
    const { startOfDay: queryDate, nextDay } = getUtcDayRange(date);

    const rollcall = await DailyRollcall.findOne({
      date: { $gte: queryDate, $lt: nextDay },
    });

    if (!rollcall) {
      return NextResponse.json({ success: false, error: "كشف التمام لهذا اليوم غير موجود" }, { status: 404 });
    }

    rollcall.status = "draft";
    await rollcall.save();

    await logAuditEvent({
      userId: auth.user!.id,
      userName: auth.user!.fullName || auth.user!.username,
      action: "UPDATE",
      module: "arkan_harb",
      targetId: rollcall._id.toString(),
      description: `إعادة فتح التمام المعتمد ليوم ${date} كمسودة للتعديل`,
      ipAddress: ip,
    });

    return NextResponse.json({ success: true, data: { status: "draft", date } });
  } catch (error) {
    return handleApiError(error, "حدث خطأ أثناء إعادة فتح كشف التمام");
  }
}
