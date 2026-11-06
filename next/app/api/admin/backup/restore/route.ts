import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { connectToDatabase } from "@/lib/db/connect";
import { requireAdmin } from "@/lib/auth/middleware";
import { User } from "@/lib/db/models/User";
import { logAuditEvent } from "@/lib/auth/audit";
import { restoreBackupSchema } from "@/lib/validations/backup";
import { executeRestore } from "@/lib/backup/restore-engine";
import { handleApiError } from "@/lib/utils/api-error";

export async function POST(request: Request) {
  const auth = await requireAdmin();
  if (!auth.success || !auth.user) {
    return NextResponse.json(
      { success: false, error: auth.error || "غير مصرح بالوصول" },
      { status: auth.status || 401 }
    );
  }

  const ipAddress = request.headers.get("x-forwarded-for") ?? "127.0.0.1";

  try {
    const body = await request.json();
    const validation = restoreBackupSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: validation.error.issues[0]?.message ?? "بيانات الطلب غير صالحة" },
        { status: 400 }
      );
    }

    const { backupId, adminPassword } = validation.data;

    await connectToDatabase();
    const userDoc = await User.findById(auth.user.id).select("+password").exec();

    if (!userDoc) {
      return NextResponse.json(
        { success: false, error: "حساب المستخدم غير موجود" },
        { status: 404 }
      );
    }

    // Verify admin password
    const isPasswordValid = await bcrypt.compare(adminPassword, userDoc.password);
    if (!isPasswordValid) {
      await logAuditEvent({
        userId: auth.user.id,
        userName: auth.user.fullName,
        action: "LOCK",
        module: "backup",
        targetId: backupId,
        description: "محاولة فاشلة لاستعادة النظام: كلمة مرور غير صحيحة",
        ipAddress,
      });

      return NextResponse.json(
        { success: false, error: "كلمة مرور مدير النظام غير صحيحة" },
        { status: 401 }
      );
    }

    // Execute atomic restore
    const restoreResult = await executeRestore({
      backupId,
      userId: auth.user.id,
      userName: auth.user.fullName,
    });

    // Log successful restore to AuditLog
    await logAuditEvent({
      userId: auth.user.id,
      userName: auth.user.fullName,
      action: "UPDATE",
      module: "backup",
      targetId: backupId,
      description: `استعادة المنظومة وقاعدة البيانات بنجاح من النسخة (${restoreResult.backupFilename}) خلال ${restoreResult.durationSeconds} ثانية`,
      ipAddress,
    });

    return NextResponse.json({
      success: true,
      message: "تمت استعادة المنظومة وقاعدة البيانات والمرفقات بنجاح",
      data: {
        restoredCollectionsCount: restoreResult.restoredCollectionsCount,
        restoredDocumentsCount: restoreResult.restoredDocumentsCount,
        durationSeconds: restoreResult.durationSeconds,
      },
    });
  } catch (error: unknown) {
    const err = error as { statusCode?: number; message?: string };
    if (err.statusCode) {
      return NextResponse.json(
        { success: false, error: err.message },
        { status: err.statusCode }
      );
    }
    return handleApiError(error, "فشلت عملية استعادة المنظومة");
  }
}
