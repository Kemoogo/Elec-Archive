import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db/connect";
import { User } from "@/lib/db/models/User";
import { requireAdmin } from "@/lib/auth/middleware";
import { logAuditEvent } from "@/lib/auth/audit";
import { updateUserSchema } from "@/lib/validations/auth";
import { errors } from "@/lib/auth/errors";
import { handleApiError } from "@/lib/utils/api-error";
import { checkApiRateLimit, rateLimitErrorResponse } from "@/lib/security/rate-limit";
import { signToken, setTokenCookie } from "@/lib/auth/jwt";
import { UpdateQuery } from "mongoose";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdmin();
  if (!auth.success) {
    return NextResponse.json(
      { success: false, error: auth.error },
      { status: auth.status },
    );
  }

  const ip = request.headers.get("x-forwarded-for") ?? "";
  const rl = checkApiRateLimit(auth.user!.id, ip, "read");
  if (!rl.allowed) {
    return NextResponse.json(rateLimitErrorResponse(rl.resetAt), { status: 429 });
  }

  await connectToDatabase();

  const { id } = await params;
  const user = await User.findById(id).select("-password");

  if (!user) {
    return NextResponse.json(
      { success: false, error: errors.userNotFound },
      { status: 404 },
    );
  }

  return NextResponse.json({
    success: true,
    user: {
      id: user._id.toString(),
      username: user.username,
      fullName: user.fullName,
      role: user.role,
      department: user.department ?? "",
      permissions: user.permissions,
      isActive: user.isActive,
      isLocked: user.isLocked,
      createdAt: user.createdAt.toISOString(),
    },
  });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdmin();
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
    const parsed = updateUserSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: errors.validationFailed, details: parsed.error.issues },
        { status: 400 },
      );
    }

    await connectToDatabase();

    const { id } = await params;

    if (id === auth.user!.id && parsed.data.isActive === false) {
      const adminCount = await User.countDocuments({ role: "admin", isActive: true });
      if (adminCount <= 1) {
        return NextResponse.json(
          { success: false, error: errors.cannotDeactivateSelf },
          { status: 400 },
        );
      }
    }

    if (id === auth.user!.id && parsed.data.isLocked === true) {
      return NextResponse.json(
        { success: false, error: errors.cannotLockSelf },
        { status: 400 },
      );
    }

    const targetUser = await User.findById(id);
    if (!targetUser) {
      return NextResponse.json({ success: false, error: "المستخدم غير موجود" }, { status: 404 });
    }

    const effectiveRole = parsed.data.role ?? targetUser.role;
    if (effectiveRole === "viewer") {
      const permsToCheck = parsed.data.permissions ?? targetUser.permissions;
      if (permsToCheck && Object.values(permsToCheck).some((p) => p === "edit")) {
        return NextResponse.json(
          { success: false, error: "المستخدم بدور مستعرض (viewer) لا يمكن أن يمتلك صلاحية تعديل (edit)" },
          { status: 400 }
        );
      }
    }

    const updateData: Record<string, unknown> = {};
    const incData: Record<string, number> = {};
    let shouldIncrementTokenVersion = false;

    if (parsed.data.fullName !== undefined) updateData.fullName = parsed.data.fullName;
    if (parsed.data.role !== undefined) updateData.role = parsed.data.role;
    if (parsed.data.department !== undefined) updateData.department = parsed.data.department;
    if (parsed.data.permissions !== undefined) updateData.permissions = parsed.data.permissions;
    if (parsed.data.isActive !== undefined) {
      updateData.isActive = parsed.data.isActive;
      if (parsed.data.isActive === false) shouldIncrementTokenVersion = true;
    }
    if (parsed.data.isLocked !== undefined) {
      updateData.isLocked = parsed.data.isLocked;
      if (parsed.data.isLocked === false) {
        updateData.failedLoginAttempts = 0;
      } else {
        shouldIncrementTokenVersion = true;
      }
    }
    if (parsed.data.password !== undefined) {
      const { hash } = await import("bcryptjs");
      updateData.password = await hash(parsed.data.password, 12);
      shouldIncrementTokenVersion = true;
    }

    if (shouldIncrementTokenVersion) {
      incData.tokenVersion = 1;
    }

    const updateQuery: UpdateQuery<typeof User> = Object.keys(updateData).length > 0 ? { $set: updateData } : {};
    if (Object.keys(incData).length > 0) {
      updateQuery.$inc = incData;
    }

    const user = await User.findByIdAndUpdate(id, updateQuery, { returnDocument: "after" }).select("-password");

    if (!user) {
      return NextResponse.json(
        { success: false, error: errors.userNotFound },
        { status: 404 },
      );
    }

    if (id === auth.user!.id && shouldIncrementTokenVersion) {
      const newToken = signToken({
        userId: user._id.toString(),
        role: user.role,
        tokenVersion: user.tokenVersion,
      });
      await setTokenCookie(newToken);
    }

    const changes = Object.keys(updateData).filter((k) => k !== "password").join(", ");
    const description = `Admin ${auth.user!.username} updated user ${user.username}${changes ? `: ${changes}` : ""}${parsed.data.password ? " (password changed)" : ""}`;
    await logAuditEvent({
      userId: auth.user!.id,
      userName: auth.user!.username,
      action: "UPDATE",
      module: "users",
      targetId: user._id.toString(),
      description,
      ipAddress: ip,
    });

    if (parsed.data.isLocked === false) {
      await logAuditEvent({
        userId: auth.user!.id,
        userName: auth.user!.username,
        action: "UNLOCK",
        module: "auth",
        targetId: user._id.toString(),
        description: `Admin unlocked account ${user.username}`,
        ipAddress: ip,
      });
    }

    return NextResponse.json({
      success: true,
      user: {
        id: user._id.toString(),
        username: user.username,
        fullName: user.fullName,
        role: user.role,
        department: user.department ?? "",
        permissions: user.permissions,
        isActive: user.isActive,
        isLocked: user.isLocked,
      },
    });
  } catch (error) {
    return handleApiError(error, "حدث خطأ أثناء تحديث المستخدم");
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdmin();
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

  await connectToDatabase();

  const { id } = await params;

  if (id === auth.user!.id) {
    const adminCount = await User.countDocuments({ role: "admin", isActive: true });
    if (adminCount <= 1) {
      return NextResponse.json(
        { success: false, error: errors.cannotDeactivateSelf },
        { status: 400 },
      );
    }
  }

  const user = await User.findByIdAndUpdate(id, { $set: { isActive: false }, $inc: { tokenVersion: 1 } }, { returnDocument: "after" });

  if (!user) {
    return NextResponse.json(
      { success: false, error: "User not found" },
      { status: 404 },
    );
  }

  await logAuditEvent({
    userId: auth.user!.id,
    userName: auth.user!.username,
    action: "DELETE",
    module: "users",
    targetId: user._id.toString(),
    description: `Admin deactivated user ${user.username}`,
    ipAddress: ip,
  });

  return NextResponse.json({
    success: true,
    message: "User deactivated",
  });
}
