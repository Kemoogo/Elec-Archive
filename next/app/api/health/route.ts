import { NextResponse } from "next/server";
import { connectToDatabase, DatabaseConnectionError } from "@/lib/db/connect";
import { checkApiRateLimit, rateLimitErrorResponse } from "@/lib/security/rate-limit";

export async function GET(request: Request) {
  const ip = request.headers.get("x-forwarded-for") ?? "";
  const rl = checkApiRateLimit("", ip, "read");
  if (!rl.allowed) {
    return NextResponse.json(rateLimitErrorResponse(rl.resetAt), { status: 429 });
  }

  try {
    await connectToDatabase();

    return NextResponse.json({
      status: "ok",
      db: "connected",
      timestamp: new Date().toISOString(),
      app: process.env.NEXT_PUBLIC_APP_NAME ?? "الأرشيف الإلكتروني",
    });
  } catch (error) {
    const isDbError = error instanceof DatabaseConnectionError;

    return NextResponse.json(
      {
        status: isDbError ? "error" : "degraded",
        db: "disconnected",
        timestamp: new Date().toISOString(),
        app: process.env.NEXT_PUBLIC_APP_NAME ?? "الأرشيف الإلكتروني",
      },
      { status: isDbError ? 503 : 500 },
    );
  }
}
