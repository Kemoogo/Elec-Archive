import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db/connect";
import { User } from "@/lib/db/models/User";
import { authenticate } from "@/lib/auth/middleware";
import { logAuditEvent } from "@/lib/auth/audit";
import { changePasswordSchema } from "@/lib/validations/auth";
import { errors } from "@/lib/auth/errors";
import { handleApiError } from "@/lib/utils/api-error";
import { checkApiRateLimit, rateLimitErrorResponse } from "@/lib/security/rate-limit";
import { signToken, setTokenCookie } from "@/lib/auth/jwt";

export async function POST(request: Request) {
  const auth = await authenticate();
  if (!auth.success) {
    return NextResponse.json(
      { success: false, error: auth.error },
      { status: auth.status },
    );
  }

  const ip = request.headers.get("x-forwarded-for") ?? "";
  const rl = checkApiRateLimit(auth.user!.id, ip, "write");
  if (!rl.allowed) {
    return NextResponse.json(rateLimitErrorResponse(rl.resetAt), { status: 429 });
  }

  try {
    const body = await request.json();
    const parsed = changePasswordSchema.safeParse(body);

    if (!parsed.success) {
      const firstIssue = parsed.error.issues[0]?.message || errors.validationFailed;
      return NextResponse.json(
        { success: false, error: firstIssue, details: parsed.error.issues },
        { status: 400 },
      );
    }

    const { currentPassword, newPassword } = parsed.data;

    await connectToDatabase();

    const user = await User.findById(auth.user!.id).select("+password");
    if (!user) {
      return NextResponse.json(
        { success: false, error: "المستخدم غير موجود" },
        { status: 404 },
      );
    }

    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      return NextResponse.json(
        { success: false, error: "كلمة المرور الحالية غير صحيحة" },
        { status: 400 },
      );
    }

    // Set new password (the pre-save hook will hash it)
    user.password = newPassword;
    user.tokenVersion = (user.tokenVersion || 0) + 1;
    await user.save();

    // Re-issue JWT with the incremented tokenVersion so current session stays active seamlessly
    const newToken = signToken({
      userId: user._id.toString(),
      role: user.role,
      tokenVersion: user.tokenVersion,
    });
    await setTokenCookie(newToken);

    await logAuditEvent({
      userId: auth.user!.id,
      userName: auth.user!.fullName,
      action: "UPDATE",
      module: "auth",
      targetId: user._id.toString(),
      description: `تغيير كلمة المرور الخاصة بالمستخدم: ${user.fullName} (${user.username})`,
      ipAddress: ip,
    });

    return NextResponse.json({
      success: true,
      message: "تم تغيير كلمة المرور بنجاح",
    });
  } catch (error) {
    return handleApiError(error);
  }
}
