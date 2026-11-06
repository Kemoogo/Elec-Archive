import { NextResponse } from "next/server";
import { authenticate } from "@/lib/auth/middleware";
import { connectToDatabase } from "@/lib/db/connect";
import { Notification } from "@/lib/db/models/Notification";
import { addClient, removeClient, sendHeartbeat } from "@/lib/notifications/emitter";
import { checkApiRateLimit, rateLimitErrorResponse } from "@/lib/security/rate-limit";

export async function GET(request: Request) {
  const auth = await authenticate();
  if (!auth.success || !auth.user) {
    return NextResponse.json({ success: false, error: "غير مصرح" }, { status: 401 });
  }

  try {
    await connectToDatabase();

    const userId = auth.user.id;
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
