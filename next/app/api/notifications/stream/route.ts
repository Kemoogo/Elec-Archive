import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyToken } from "@/lib/auth/jwt";
import { connectToDatabase } from "@/lib/db/connect";
import { User } from "@/lib/db/models/User";
import { Notification } from "@/lib/db/models/Notification";
import { addClient, removeClient, sendHeartbeat } from "@/lib/notifications/emitter";
import { checkApiRateLimit, rateLimitErrorResponse } from "@/lib/security/rate-limit";

export async function GET(request: Request) {
  let token: string | undefined;

  const cookieStore = await cookies();
  token = cookieStore.get("token")?.value;

  if (!token) {
    const url = new URL(request.url);
    token = url.searchParams.get("token") ?? undefined;
  }

  if (!token) {
    return NextResponse.json({ success: false, error: "غير مصرح" }, { status: 401 });
  }

  const payload = verifyToken(token);
  if (!payload) {
    return NextResponse.json({ success: false, error: "غير مصرح" }, { status: 401 });
  }

  try {
    await connectToDatabase();

    const user = await User.findById(payload.userId);
    if (!user || !user.isActive || user.isLocked) {
      return NextResponse.json({ success: false, error: "غير مصرح" }, { status: 401 });
    }

    if (user.role !== "commander") {
      return NextResponse.json({ success: false, error: "غير مصرح" }, { status: 403 });
    }

    const userId = user._id.toString();
    const ip = request.headers.get("x-forwarded-for") ?? "";
    const rl = checkApiRateLimit(userId, ip, "read");
    if (!rl.allowed) {
      return NextResponse.json(rateLimitErrorResponse(rl.resetAt), { status: 429 });
    }

    const unreadCount = await Notification.countDocuments({ userId, isRead: false });

    const stream = new ReadableStream({
      start(controller) {
        const encoder = new TextEncoder();

        controller.enqueue(
          encoder.encode(`event: connected\ndata: ${JSON.stringify({ message: "connected", unreadCount })}\n\n`),
        );

        addClient(userId, controller);

        const heartbeatInterval = setInterval(() => {
          sendHeartbeat(controller);
        }, 30000);

        request.signal.addEventListener("abort", () => {
          clearInterval(heartbeatInterval);
          removeClient(userId, controller);
        });
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch {
    return NextResponse.json(
      { success: false, error: "حدث خطأ أثناء الاتصال بالإشعارات الفورية" },
      { status: 500 },
    );
  }
}
