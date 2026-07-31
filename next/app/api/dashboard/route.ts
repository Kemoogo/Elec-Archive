import { NextResponse } from "next/server";
import { authenticate } from "@/lib/auth/middleware";
import { connectToDatabase } from "@/lib/db/connect";
import { Fax } from "@/lib/db/models/Fax";
import { DailyRollcall } from "@/lib/db/models/DailyRollcall";
import { Medicine } from "@/lib/db/models/Medicine";
import { Course } from "@/lib/db/models/Course";
import { Student } from "@/lib/db/models/Student";
import { handleApiError } from "@/lib/utils/api-error";
import { checkApiRateLimit, rateLimitErrorResponse } from "@/lib/security/rate-limit";

export async function GET(request: Request) {
  const auth = await authenticate();

  if (!auth.success) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
  }

  const user = auth.user!;
  const ip = request.headers.get("x-forwarded-for") ?? "";
  const rl = checkApiRateLimit(user.id, ip, "read");
  if (!rl.allowed) {
    return NextResponse.json(rateLimitErrorResponse(rl.resetAt), { status: 429 });
  }

  try {
    await connectToDatabase();

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const isAdminOrCommander = user.role === "admin" || user.role === "commander";

    const data: Record<string, unknown> = {};

    if (isAdminOrCommander || user.department === "fax") {
      const pendingCount = await Fax.countDocuments({ status: "pending" });
      const totalCount = await Fax.countDocuments();
      data.faxes = { pendingCount, totalCount };
    }

    if (isAdminOrCommander || user.department === "officers") {
      const todayRollcall = await DailyRollcall.findOne({
        date: { $gte: today, $lt: tomorrow },
      });

      if (todayRollcall) {
        const entries = todayRollcall.entries;
        data.rollcall = {
          todaySubmitted: todayRollcall.status === "submitted",
          presentCount: entries.filter((e: { status: string }) => e.status === "present").length,
          absentCount: entries.filter((e: { status: string }) => e.status === "absent").length,
          leaveCount: entries.filter((e: { status: string }) => e.status === "leave").length,
          missionCount: entries.filter((e: { status: string }) => e.status === "mission").length,
        };
      } else {
        data.rollcall = {
          todaySubmitted: false,
          presentCount: 0,
          absentCount: 0,
          leaveCount: 0,
          missionCount: 0,
        };
      }
    }

    if (isAdminOrCommander || user.department === "medical") {
      const expiredCount = await Medicine.countDocuments({ "batches.expiryDate": { $lt: new Date() } });
      const lowStockCount = await Medicine.countDocuments({ $expr: { $lt: ["$totalQuantity", "$minThreshold"] } });
      data.medical = { expiredCount, lowStockCount };
    }

    if (isAdminOrCommander || user.department === "education") {
      const activeCount = await Course.countDocuments({ status: { $in: ["ongoing", "upcoming"] } });
      data.courses = { activeCount };
    }

    if (isAdminOrCommander || user.department === "students") {
      const totalCount = await Student.countDocuments();
      data.students = { totalCount };
    }

    return NextResponse.json({ success: true, data });
  } catch (error) {
    return handleApiError(error, "حدث خطأ أثناء تحميل بيانات لوحة التحكم");
  }
}
