import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db/connect";
import { User } from "@/lib/db/models/User";
import { signToken, setTokenCookie } from "@/lib/auth/jwt";
import { logAuditEvent } from "@/lib/auth/audit";
import { loginSchema } from "@/validations/auth";
import { errors } from "@/lib/auth/errors";
import { checkLoginRateLimit, rateLimitErrorResponse } from "@/lib/security/rate-limit";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = loginSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: errors.validationFailed, details: parsed.error.issues },
        { status: 400 },
      );
    }

    const ip = request.headers.get("x-forwarded-for") ?? "";
    const rl = checkLoginRateLimit(ip);
    if (!rl.allowed) {
      return NextResponse.json(rateLimitErrorResponse(rl.resetAt), { status: 429 });
    }

    const { username, password } = parsed.data;

    await connectToDatabase();

    const user = await User.findOne({ username }).select("+password");

    if (!user) {
      return NextResponse.json(
        { success: false, error: errors.invalidCredentials },
        { status: 401 },
      );
    }

    if (!user.isActive) {
      return NextResponse.json(
        { success: false, error: errors.accountDeactivated },
        { status: 403 },
      );
    }

    if (user.isLocked) {
      return NextResponse.json(
        { success: false, error: errors.accountLocked },
        { status: 423 },
      );
    }

    const isMatch = await user.comparePassword(password);

    if (!isMatch) {
      user.failedLoginAttempts += 1;

      if (user.failedLoginAttempts >= 5) {
        user.isLocked = true;
        await user.save();

        await logAuditEvent({
          userId: user._id.toString(),
          userName: user.username,
          action: "LOCK",
          module: "auth",
          description: `Account ${user.username} locked after ${user.failedLoginAttempts} failed attempts`,
          ipAddress: request.headers.get("x-forwarded-for") ?? "",
        });

        return NextResponse.json(
          { success: false, error: errors.accountLocked },
          { status: 423 },
        );
      }

      await user.save();

      await logAuditEvent({
        userId: user._id.toString(),
        userName: user.username,
        action: "LOGIN_FAILED",
        module: "auth",
        description: `Failed login attempt for username ${user.username}`,
        ipAddress: request.headers.get("x-forwarded-for") ?? "",
      });

      return NextResponse.json(
        { success: false, error: errors.invalidCredentials },
        { status: 401 },
      );
    }

    user.failedLoginAttempts = 0;
    await user.save();

    const token = signToken({ 
      userId: user._id.toString(), 
      role: user.role,
      tokenVersion: user.tokenVersion || 0,
    });
    await setTokenCookie(token);

    await logAuditEvent({
      userId: user._id.toString(),
      userName: user.username,
      action: "LOGIN",
      module: "auth",
      description: `User ${user.username} logged in`,
      ipAddress: request.headers.get("x-forwarded-for") ?? "",
    });

    return NextResponse.json({
      success: true,
      user: {
        id: user._id.toString(),
        username: user.username,
        fullName: user.fullName,
        role: user.role,
        department: user.department ?? "",
        permissions: user.permissions,
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json(
      { success: false, error: errors.internalError },
      { status: 500 },
    );
  }
}
