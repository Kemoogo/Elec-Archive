import { connectToDatabase } from "@/lib/db/connect";
import { AuditLog } from "@/lib/db/models/AuditLog";
import type { AuditAction, AuditModule } from "@/lib/db/models/AuditLog";

interface AuditLogParams {
  userId: string;
  userName: string;
  action: AuditAction;
  module: AuditModule;
  targetId?: string;
  description: string;
  ipAddress?: string;
}

export async function logAuditEvent(params: AuditLogParams): Promise<void> {
  try {
    await connectToDatabase();

    await AuditLog.create({
      userId: params.userId,
      userName: params.userName,
      action: params.action,
      module: params.module,
      targetId: params.targetId,
      description: params.description,
      ipAddress: params.ipAddress ?? "",
    });
  } catch (error) {
    console.error("Audit log failed:", error);
  }
}
