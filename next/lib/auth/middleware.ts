import { getTokenFromCookie, verifyToken } from "./jwt";
import { connectToDatabase } from "@/lib/db/connect";
import { User } from "@/lib/db/models/User";
import type { AuthUser } from "./types";
import { errors } from "./errors";

export interface AuthResult {
  success: boolean;
  user?: AuthUser;
  error?: string;
  status?: number;
}

export async function authenticate(): Promise<AuthResult> {
  const token = await getTokenFromCookie();

  if (!token) {
    return { success: false, error: errors.notAuthenticated, status: 401 };
  }

  const payload = verifyToken(token);
  if (!payload) {
    return { success: false, error: errors.notAuthenticated, status: 401 };
  }

  try {
    await connectToDatabase();
  } catch (error) {
    if (error instanceof Error && error.name === "DatabaseConnectionError") {
      return { success: false, error: errors.dbConnectionError, status: 503 };
    }
    throw error;
  }

  const user = await User.findById(payload.userId).lean();
  if (!user) {
    return { success: false, error: errors.notAuthenticated, status: 401 };
  }

  if (user.tokenVersion !== payload.tokenVersion) {
    return { success: false, error: errors.notAuthenticated, status: 401 };
  }

  if (!user.isActive) {
    return { success: false, error: errors.accountDeactivated, status: 403 };
  }

  if (user.isLocked) {
    return { success: false, error: errors.accountLocked, status: 423 };
  }

  const authUser: AuthUser = {
    id: user._id.toString(),
    username: user.username,
    fullName: user.fullName,
    role: user.role,
    department: user.department ?? "",
    permissions: {
      fax: user.permissions.fax,
      officers: user.permissions.officers,
      medical: user.permissions.medical,
      students: user.permissions.students,
      education: user.permissions.education,
      arkan_harb: user.permissions.arkan_harb,
    },
    isActive: user.isActive,
    isLocked: user.isLocked,
  };

  return { success: true, user: authUser };
}

export async function requireAuth(): Promise<AuthResult> {
  return authenticate();
}

export async function requireRole(
  allowedRoles: string[],
): Promise<AuthResult> {
  const result = await authenticate();
  if (!result.success) {
    return result;
  }

  if (!allowedRoles.includes(result.user!.role)) {
    return { success: false, error: errors.insufficientPermissions, status: 403 };
  }

  return result;
}

export async function requireAdmin(): Promise<AuthResult> {
  return requireRole(["admin"]);
}
