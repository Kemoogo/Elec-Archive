import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db/connect";
import { User } from "@/lib/db/models/User";
import { requireAdmin } from "@/lib/auth/middleware";
import { logAuditEvent } from "@/lib/auth/audit";
import { createUserSchema } from "@/validations/auth";
import { errors } from "@/lib/auth/errors";
import { checkApiRateLimit, rateLimitErrorResponse } from "@/lib/security/rate-limit";

export async function GET(request: Request) {
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

  try {
    await connectToDatabase();

    const { searchParams } = new URL(request.url);

    const role = searchParams.get("role");
    const department = searchParams.get("department");
    const isActive = searchParams.get("isActive");
    const search = searchParams.get("search")?.trim();

    // Build the filter object
    type UserFilter = {
      role?: string;
      department?: string;
      isActive?: boolean;
      $or?: Array<{ username: { $regex: string; $options: string } } | { fullName: { $regex: string; $options: string } } | { department: { $regex: string; $options: string } }>;
    };
    const filter: UserFilter = {};

    if (role) filter.role = role;
    if (department) filter.department = department;
    if (isActive) filter.isActive = isActive === "true";

    // Full-text search across username, fullName, department
    if (search) {
      const regex = { $regex: search, $options: "i" };
      filter.$or = [
        { username: regex },
        { fullName: regex },
        { department: regex },
      ];
    }

    const users = await User.find(filter)
      .select("-password")
      .sort({ createdAt: -1 });

    const total = await User.countDocuments(filter);

    return NextResponse.json({
      success: true,
      users: users.map((u) => ({
        id: u._id.toString(),
        username: u.username,
        fullName: u.fullName,
        role: u.role,
        department: u.department ?? "",
        isActive: u.isActive,
        isLocked: u.isLocked,
        createdAt: u.createdAt.toISOString(),
      })),
      total,
    });
  } catch (error) {
    console.error("Users GET error:", error);
    return NextResponse.json(
      { success: false, error: errors.internalError },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
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
    const parsed = createUserSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: errors.validationFailed, details: parsed.error.issues },
        { status: 400 },
      );
    }

    await connectToDatabase();

    const existing = await User.findOne({ username: parsed.data.username });
    if (existing) {
      return NextResponse.json(
        { success: false, error: errors.usernameExists },
        { status: 409 },
      );
    }

    const user = await User.create(parsed.data);

    await logAuditEvent({
      userId: auth.user!.id,
      userName: auth.user!.username,
      action: "CREATE",
      module: "users",
      targetId: user._id.toString(),
      description: `Admin ${auth.user!.username} created user ${user.username} with role ${user.role}`,
      ipAddress: ip,
    });

    return NextResponse.json(
      {
        success: true,
        user: {
          id: user._id.toString(),
          username: user.username,
          fullName: user.fullName,
          role: user.role,
          department: user.department ?? "",
          permissions: user.permissions,
        },
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("Create user error:", error);
    return NextResponse.json(
      { success: false, error: errors.internalError },
      { status: 500 },
    );
  }
}
