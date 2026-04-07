export type UserRole = "admin" | "commander" | "employee" | "viewer";

export type PermissionLevel = "none" | "view" | "edit";

export interface ModulePermissions {
  fax: PermissionLevel;
  officers: PermissionLevel;
  medical: PermissionLevel;
  students: PermissionLevel;
  education: PermissionLevel;
}

export interface JwtPayload {
  userId: string;
  role: UserRole;
}

export interface AuthUser {
  id: string;
  username: string;
  fullName: string;
  role: UserRole;
  department: string;
  permissions: ModulePermissions;
  isActive: boolean;
  isLocked: boolean;
}

export interface AuthenticatedRequest {
  user: AuthUser;
}
