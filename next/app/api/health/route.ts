import { NextResponse } from "next/server";
import { checkApiRateLimit, rateLimitErrorResponse } from "@/lib/security/rate-limit";

export async function GET(request: Request) {
  const ip = request.headers.get("x-forwarded-for") ?? "";
  const rl = checkApiRateLimit("", ip, "read");
  if (!rl.allowed) {
    return NextResponse.json(rateLimitErrorResponse(rl.resetAt), { status: 429 });
  }

  return NextResponse.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    app: process.env.NEXT_PUBLIC_APP_NAME ?? "الأرشيف الإلكتروني",
  });
}
