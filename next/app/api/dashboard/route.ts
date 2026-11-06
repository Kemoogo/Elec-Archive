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
import { canViewModule } from "@/lib/auth/authorization";

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

    const canFax = canViewModule(user, "fax");
    const canOfficers = canViewModule(user, "officers") || canViewModule(user, "arkan_harb");
    const canMedical = canViewModule(user, "medical");
    const canEducation = canViewModule(user, "education");
    const canStudents = canViewModule(user, "students");

    const [
      faxResult,
      rollcallDoc,
      medicalResult,
      educationResult,
      studentsResult,
    ] = await Promise.all([
      canFax
        ? Promise.all([
            Fax.countDocuments({ status: "pending" }),
            Fax.countDocuments(),
          ])
        : Promise.resolve(null),
      canOfficers
        ? DailyRollcall.findOne({ date: { $gte: today, $lt: tomorrow } }).lean()
        : Promise.resolve(null),
      canMedical
        ? Promise.all([
            Medicine.countDocuments({ batches: { $elemMatch: { quantity: { $gt: 0 }, expiryDate: { $lt: new Date() } } } }),
            Medicine.countDocuments({ $expr: { $lt: ["$totalQuantity", "$minThreshold"] } }),
          ])
        : Promise.resolve(null),
      canEducation
        ? Course.countDocuments({ status: { $in: ["ongoing", "upcoming"] } })
        : Promise.resolve(null),
      canStudents
        ? Student.countDocuments({ status: "active" })
        : Promise.resolve(null),
    ]);

    const data: Record<string, unknown> = {};

    if (faxResult) {
      data.faxes = { pendingCount: faxResult[0], totalCount: faxResult[1] };
    }

    if (canOfficers) {
      if (rollcallDoc) {
        const entries = rollcallDoc.entries || [];
        data.rollcall = {
          todaySubmitted: rollcallDoc.status === "submitted",
          presentCount: entries.filter((e: { status: string }) => e.status === "present").length,
          absentCount: entries.filter((e: { status: string }) => e.status === "absent").length,
          leaveCount: entries.filter((e: { status: string }) => e.status === "leave").length,
          missionCount: entries.filter((e: { status: string }) => e.status === "external_mission" || e.status === "daily_mission").length,
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

    if (medicalResult) {
      data.medical = { expiredCount: medicalResult[0], lowStockCount: medicalResult[1] };
    }

    if (educationResult !== null) {
      data.courses = { activeCount: educationResult };
    }

    if (studentsResult !== null) {
      data.students = { totalCount: studentsResult };
    }

    return NextResponse.json({ success: true, data });
  } catch (error) {
    return handleApiError(error, "حدث خطأ أثناء تحميل بيانات لوحة التحكم");
  }
}
