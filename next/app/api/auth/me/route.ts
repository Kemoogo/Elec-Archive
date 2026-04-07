import { NextResponse } from "next/server";
import { authenticate } from "@/lib/auth/middleware";
import { checkApiRateLimit, rateLimitErrorResponse } from "@/lib/security/rate-limit";

export async function GET(request: Request) {
  const result = await authenticate();

  if (!result.success) {
    return NextResponse.json(
      { success: false, error: result.error },
      { status: result.status },
    );
  }

  const ip = request.headers.get("x-forwarded-for") ?? "";
  const rl = checkApiRateLimit(result.user!.id, ip, "read");
  if (!rl.allowed) {
    return NextResponse.json(rateLimitErrorResponse(rl.resetAt), { status: 429 });
  }

  return NextResponse.json({
    success: true,
    user: result.user,
  });
}
