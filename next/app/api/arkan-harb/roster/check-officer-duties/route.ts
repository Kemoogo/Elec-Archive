import { NextResponse } from "next/server";
import { authenticate } from "@/lib/auth/middleware";
import {
  getOfficerActiveDutiesInRange,
  formatDutyConflictErrorMessage,
} from "@/lib/arkan-harb/roster-leaves-sync";
import { handleApiError } from "@/lib/utils/api-error";
import { canViewOfficers } from "@/lib/officers/access";
import { checkGeneralRateLimit, rateLimitErrorResponse } from "@/lib/security/rate-limit";
import { errors } from "@/lib/auth/errors";

export async function GET(request: Request) {
  const ip = request.headers.get("x-forwarded-for") ?? "";
  const rl = checkGeneralRateLimit(ip);
  if (!rl.allowed) {
    return NextResponse.json(rateLimitErrorResponse(rl.resetAt), { status: 429 });
  }

  const auth = await authenticate();
  if (!auth.success) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
  }

  if (!canViewOfficers(auth.user!)) {
    return NextResponse.json({ success: false, error: errors.insufficientPermissions }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const officerId = searchParams.get("officerId");
  const startDate = searchParams.get("startDate");
  const endDate = searchParams.get("endDate");

  if (!officerId || !startDate || !endDate) {
    return NextResponse.json(
      { success: false, error: "معرف الضابط وتواريخ البداية والنهاية مطلوبة" },
      { status: 400 }
    );
  }

  try {
    const conflicts = await getOfficerActiveDutiesInRange(officerId, startDate, endDate);
    const hasConflicts = conflicts.length > 0;
    const errorMessage = hasConflicts ? formatDutyConflictErrorMessage(conflicts) : null;

    return NextResponse.json({
      success: true,
      data: {
        hasConflicts,
        conflictsCount: conflicts.length,
        conflicts,
        errorMessage,
      },
    });
  } catch (error) {
    return handleApiError(error, "حدث خطأ أثناء فحص نوبتجيات الضابط");
  }
}
