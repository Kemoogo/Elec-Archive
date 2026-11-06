import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db/connect";
import { requireAdmin } from "@/lib/auth/middleware";
import { User } from "@/lib/db/models/User";
import { BackupRecord } from "@/lib/db/models/BackupRecord";
import { logAuditEvent } from "@/lib/auth/audit";
import { quarterlyBackupSchema } from "@/lib/validations/backup";
import { generateBackup } from "@/lib/backup/backup-engine";
import { enforceRetentionPolicy } from "@/lib/backup/retention-manager";
import { handleApiError } from "@/lib/utils/api-error";

/**
 * Determine the current quarter string, e.g. "Q1-2026"
 */
export function getCurrentQuarterString(date = new Date()): string {
  const month = date.getMonth(); // 0 to 11
  const year = date.getFullYear();
  const quarterIndex = Math.floor(month / 3) + 1;
  return `Q${quarterIndex}-${year}`;
}

export async function POST(request: Request) {
  const cronKeyHeader = request.headers.get("x-system-cron-key");
  const expectedCronKey = process.env.SYSTEM_CRON_KEY || "elec-archive-internal-cron-secret";

  let userId: string;
  let userName: string;

  const auth = await requireAdmin();
  if (auth.success && auth.user) {
    userId = auth.user.id;
    userName = auth.user.fullName;
  } else if (cronKeyHeader && cronKeyHeader === expectedCronKey) {
    await connectToDatabase();
    const systemAdmin = await User.findOne({ role: "admin" }).sort({ createdAt: 1 }).lean();
    userId = systemAdmin ? systemAdmin._id.toString() : "000000000000000000000000";
    userName = "النظام الآلي";
  } else {
    return NextResponse.json(
      { success: false, error: auth.error || "غير مصرح بالوصول" },
      { status: 401 }
    );
  }

  const ipAddress = request.headers.get("x-forwarded-for") ?? "127.0.0.1";

  try {
    let body = {};
    try {
      body = await request.json();
    } catch {
      // Body may be empty for automated calls
    }

    const validation = quarterlyBackupSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: validation.error.issues[0]?.message ?? "بيانات الطلب غير صالحة" },
        { status: 400 }
      );
    }

    const quarter = validation.data.quarter || getCurrentQuarterString();
    const force = validation.data.force ?? false;

    await connectToDatabase();

    // Check if quarterly backup already exists for this quarter unless forced
    if (!force) {
      const existing = await BackupRecord.findOne({
        backupType: "quarterly_scheduled",
        quarter,
        status: "completed",
      }).exec();

      if (existing) {
        return NextResponse.json({
          success: true,
          message: `تم أخذ نسخة احتياطية لهذا الربع (${quarter}) مسبقاً`,
          data: {
            backupId: existing._id.toString(),
            filename: existing.filename,
            alreadyExists: true,
          },
        });
      }
    }

    // 1. Generate backup
    const backupResult = await generateBackup({
      userId,
      userName,
      backupType: "quarterly_scheduled",
      quarter,
    });

    // 2. Enforce retention policy (keep newest 4 backups)
    const rotationResult = await enforceRetentionPolicy({
      userId,
      userName,
      ipAddress,
    });

    // 3. Log audit event
    await logAuditEvent({
      userId,
      userName,
      action: "CREATE",
      module: "backup",
      targetId: backupResult.backupId,
      description: `إنشاء النسخة الاحتياطية الربع سنوية (${backupResult.filename}) للربع ${quarter}`,
      ipAddress,
    });

    return NextResponse.json({
      success: true,
      message: "تمت معالجة النسخة الربع سنوية وتطبيق سياسة التدوير بنجاح",
      data: {
        backupId: backupResult.backupId,
        filename: backupResult.filename,
        fileSizeBytes: backupResult.fileSizeBytes,
        quarter,
        rotatedDeletedCount: rotationResult.deletedCount,
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
    return handleApiError(error, "فشل إنشاء النسخة الاحتياطية الربع سنوية");
  }
}
