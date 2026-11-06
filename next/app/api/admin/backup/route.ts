import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db/connect";
import { requireAdmin } from "@/lib/auth/middleware";
import { BackupRecord } from "@/lib/db/models/BackupRecord";
import { logAuditEvent } from "@/lib/auth/audit";
import { exportBackupSchema } from "@/lib/validations/backup";
import { generateBackup } from "@/lib/backup/backup-engine";
import { enforceRetentionPolicy, BACKUP_RETENTION_CAP } from "@/lib/backup/retention-manager";
import { getStorageStats } from "@/lib/backup/disk-space";
import { handleApiError } from "@/lib/utils/api-error";
import type { IBackupRecordItem } from "@/types/backup";

/**
 * GET /api/admin/backup
 * Returns active backups list, current storage stats, and retention cap
 */
export async function GET() {
  const auth = await requireAdmin();
  if (!auth.success || !auth.user) {
    return NextResponse.json(
      { success: false, error: auth.error || "غير مصرح بالوصول" },
      { status: auth.status || 401 }
    );
  }

  try {
    await connectToDatabase();

    const [rawBackups, storageStats] = await Promise.all([
      BackupRecord.find({ status: { $ne: "deleted" } })
        .sort({ createdAt: -1 })
        .lean()
        .exec(),
      getStorageStats(),
    ]);

    const backups: IBackupRecordItem[] = rawBackups.map((b) => ({
      id: b._id.toString(),
      filename: b.filename,
      fileSizeBytes: b.fileSizeBytes,
      backupType: b.backupType,
      quarter: b.quarter,
      status: b.status,
      collectionsCount: b.collectionsCount,
      documentsCount: b.documentsCount,
      checksumSha256: b.checksumSha256,
      createdByName: b.createdByName,
      createdAt: b.createdAt.toISOString(),
      deletedAt: b.deletedAt?.toISOString(),
      deletedReason: b.deletedReason,
      isIncremental: b.isIncremental,
      baseBackupId: b.baseBackupId?.toString(),
      baseBackupFilename: b.baseBackupFilename,
    }));

    return NextResponse.json({
      success: true,
      data: {
        backups,
        storage: storageStats,
        retentionCap: BACKUP_RETENTION_CAP,
      },
    });
  } catch (error) {
    return handleApiError(error, "فشل استرجاع قائمة النسخ الاحتياطية");
  }
}

/**
 * POST /api/admin/backup
 * Creates an on-demand manual backup, applies retention rotation, and logs to AuditLog
 */
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
    let body = {};
    try {
      body = await request.json();
    } catch {
      // Body is optional
    }

    const validation = exportBackupSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: validation.error.issues[0]?.message ?? "بيانات غير صالحة" },
        { status: 400 }
      );
    }

    const isIncremental = Boolean(validation.data.isIncremental);

    // 1. Generate backup (full or incremental)
    const backupResult = await generateBackup({
      userId: auth.user.id,
      userName: auth.user.fullName,
      backupType: isIncremental ? "incremental" : "manual_export",
      isIncremental,
    });

    // 2. Enforce retention policy (keep newest 4 backups)
    const rotationResult = await enforceRetentionPolicy({
      userId: auth.user.id,
      userName: auth.user.fullName,
      ipAddress,
    });

    // 3. Log audit event
    await logAuditEvent({
      userId: auth.user.id,
      userName: auth.user.fullName,
      action: "CREATE",
      module: "backup",
      targetId: backupResult.backupId,
      description: isIncremental
        ? `تصدير نسخة احتياطية تزايدية (${backupResult.filename}) للملفات والبيانات المعدلة`
        : `تصدير نسخة احتياطية فورية (${backupResult.filename}) عند الطلب`,
      ipAddress,
    });

    return NextResponse.json(
      {
        success: true,
        message: isIncremental
          ? "تم إنشاء النسخة التزايدية وتطبيق قاعدة التدوير بنجاح"
          : "تم إنشاء النسخة الاحتياطية وتطبيق قاعدة التدوير بنجاح",
        data: {
          backupId: backupResult.backupId,
          filename: backupResult.filename,
          fileSizeBytes: backupResult.fileSizeBytes,
          downloadUrl: `/api/admin/backup/download/${backupResult.backupId}`,
          rotatedDeletedCount: rotationResult.deletedCount,
          isIncremental: backupResult.isIncremental,
          baseBackupFilename: backupResult.baseBackupFilename,
        },
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    const err = error as { statusCode?: number; message?: string };
    if (err.statusCode) {
      return NextResponse.json(
        { success: false, error: err.message },
        { status: err.statusCode }
      );
    }
    return handleApiError(error, "فشل إنشاء النسخة الاحتياطية الفورية");
  }
}
