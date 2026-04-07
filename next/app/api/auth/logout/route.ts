import { NextResponse } from "next/server";
import { clearTokenCookie, getTokenFromCookie, verifyToken } from "@/lib/auth/jwt";
import { connectToDatabase } from "@/lib/db/connect";
import { User } from "@/lib/db/models/User";
import { logAuditEvent } from "@/lib/auth/audit";
import { checkApiRateLimit, rateLimitErrorResponse } from "@/lib/security/rate-limit";

export async function POST(request: Request) {
  try {
    const ip = request.headers.get("x-forwarded-for") ?? "";
    const rl = checkApiRateLimit("", ip, "write");
    if (!rl.allowed) {
      return NextResponse.json(rateLimitErrorResponse(rl.resetAt), { status: 429 });
    }

    const token = await getTokenFromCookie();

    if (token) {
      const payload = verifyToken(token);

      if (payload) {
        await connectToDatabase();
        const user = await User.findById(payload.userId);

        if (user) {
          await logAuditEvent({
            userId: user._id.toString(),
            userName: user.username,
            action: "LOGOUT",
            module: "auth",
            description: `User ${user.username} logged out`,
            ipAddress: ip,
          });
        }
      }
    }

    await clearTokenCookie();

    return NextResponse.json({ success: true, message: "Logged out" });
  } catch (error) {
    console.error("Logout error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 },
    );
  }
}
