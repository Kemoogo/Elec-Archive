import { authenticate } from "@/lib/auth/middleware";
import { logAuditEvent } from "@/lib/auth/audit";
import { connectToDatabase } from "@/lib/db/connect";
import type { AuditAction, AuditModule } from "@/lib/db/models/AuditLog";

export interface ActionContext {
  userId: string;
  userName: string;
}

export interface ActionOptions {
  module: AuditModule;
  action: AuditAction;
  requireOfficerEdit?: boolean;
}

export type ActionResponse<T = unknown> = 
  | { success: true; data?: T }
  | { success: false; error: string; data?: unknown };

/**
 * A Higher-Order Function to wrap Next.js Server Actions.
 * Handles Authentication, Database Connection, Error boundary, and optional Audit Logging.
 */
export function withActionWrapper<TArgs extends unknown[], TRet>(
  handler: (context: ActionContext, ...args: TArgs) => Promise<ActionResponse<TRet> & { auditDesc?: string, targetId?: string }>,
  options?: ActionOptions
) {
  return async (...args: TArgs): Promise<ActionResponse<TRet>> => {
    try {
      const auth = await authenticate();
      if (!auth.success || !auth.user) {
        if (auth.status === 503) {
          return { success: false, error: auth.error! };
        }
        return { success: false, error: "غير مصرح لك بإجراء هذه العملية" };
      }

      if (options?.requireOfficerEdit) {
        const { canEditOfficers } = await import("@/lib/officers/access");
        if (!canEditOfficers(auth.user)) {
          return { success: false, error: "غير مصرح لك بتعديل بيانات الضباط" };
        }
      }

      try {
        await connectToDatabase();
      } catch (error) {
        if (error instanceof Error && error.name === "DatabaseConnectionError") {
          return { success: false, error: "انقطع الاتصال بقاعدة البيانات، يرجى المحاولة لاحقاً" };
        }
        throw error;
      }

      const context: ActionContext = {
        userId: auth.user.id,
        userName: auth.user.fullName,
      };

      const result = await handler(context, ...args);

      if (result.success && options && result.auditDesc) {
        await logAuditEvent({
          userId: context.userId,
          userName: context.userName,
          action: options.action,
          module: options.module,
          targetId: result.targetId,
          description: result.auditDesc,
          ipAddress: "Server Action",
        });
      }

      // Remove internal audit properties from the final response
      const { auditDesc: _auditDesc, targetId: _targetId, ...rest } = result;
      return rest as ActionResponse<TRet>;
      
    } catch (error) {
      console.error("Action Error:", error);
      return { success: false, error: "حدث خطأ أثناء معالجة الطلب" };
    }
  };
}
