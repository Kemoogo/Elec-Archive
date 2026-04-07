import { NextResponse } from "next/server";
import { authenticate } from "@/lib/auth/middleware";
import { errors } from "@/lib/auth/errors";
import { getDashboardStats } from "@/lib/medical/queries";
import { checkApiRateLimit, rateLimitErrorResponse } from "@/lib/security/rate-limit";

export async function GET(request: Request) {
  const auth = await authenticate();
  if (!auth.success) {
    return NextResponse.json(
      { success: false, error: auth.error },
      { status: auth.status },
    );
  }

  const medicalPermission = auth.user!.permissions.medical;
  if (medicalPermission === "none") {
    return NextResponse.json(
      { success: false, error: errors.insufficientPermissions },
      { status: 403 },
    );
  }

  const ip = request.headers.get("x-forwarded-for") ?? "";
  const rl = checkApiRateLimit(auth.user!.id, ip, "read");
  if (!rl.allowed) {
    return NextResponse.json(rateLimitErrorResponse(rl.resetAt), { status: 429 });
  }

  const stats = await getDashboardStats();

  return NextResponse.json({
    success: true,
    data: stats,
  });
}
