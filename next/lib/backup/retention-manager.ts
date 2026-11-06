import fs from "fs/promises";
import { BackupRecord } from "@/lib/db/models/BackupRecord";
import { logAuditEvent } from "@/lib/auth/audit";
import { connectToDatabase } from "@/lib/db/connect";

export const BACKUP_RETENTION_CAP = 4;

interface RetentionContext {
  userId: string;
  userName: string;
  ipAddress?: string;
}

/**
 * Enforces the strict retention policy of keeping at most 4 active backups.
 * Excess backups (beyond the newest 4) are removed from the filesystem,
 * marked as deleted in the database, and logged to AuditLog.
 */
export async function enforceRetentionPolicy(
  context: RetentionContext
): Promise<{ deletedCount: number; deletedFilenames: string[] }> {
  await connectToDatabase();

  // Find all active completed backups sorted newest to oldest
  const completedBackups = await BackupRecord.find({ status: "completed" })
    .sort({ createdAt: -1 })
    .exec();

  if (completedBackups.length <= BACKUP_RETENTION_CAP) {
    return { deletedCount: 0, deletedFilenames: [] };
  }

  // Backups from index 4 onwards are beyond the retention cap
  const backupsToPurge = completedBackups.slice(BACKUP_RETENTION_CAP);
  const deletedFilenames: string[] = [];

  for (const backup of backupsToPurge) {
    // 1. Remove archive file from disk if it exists
    if (backup.filePath) {
      try {
        await fs.unlink(backup.filePath);
      } catch (err: unknown) {
        // If file already unlinked or missing, continue
        const code = (err as { code?: string })?.code;
        if (code !== "ENOENT") {
          console.error(`Failed to unlink backup file ${backup.filePath}:`, err);
        }
      }
    }

    // 2. Mark database record as deleted
    backup.status = "deleted";
    backup.deletedAt = new Date();
    backup.deletedReason = "تطبيق سياسة تدوير النسخ وحفظ أحدث 4 نسخ فقط";
    await backup.save();
    deletedFilenames.push(backup.filename);

    // 3. Log audit event
    await logAuditEvent({
      userId: context.userId,
      userName: context.userName,
      action: "DELETE",
      module: "backup",
      targetId: backup._id.toString(),
      description: `تدوير وحذف النسخة الاحتياطية (${backup.filename}) لتجاوز سقف أحدث 4 نسخ على الخادم`,
      ipAddress: context.ipAddress,
    });
  }

  return {
    deletedCount: deletedFilenames.length,
    deletedFilenames,
  };
}
