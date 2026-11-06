export const dynamic = "force-dynamic";
export const revalidate = 0;

import { redirect } from "next/navigation";
import { authenticate } from "@/lib/auth/middleware";
import { connectToDatabase } from "@/lib/db/connect";
import { BackupRecord } from "@/lib/db/models/BackupRecord";
import { getStorageStats } from "@/lib/backup/disk-space";
import { BACKUP_RETENTION_CAP } from "@/lib/backup/retention-manager";
import { initQuarterlyBackupChecker } from "@/lib/backup/quarterly-checker";
import { BackupManagementClient } from "@/components/admin/backup/BackupManagementClient";
import type { IBackupRecordItem } from "@/types/backup";

export default async function AdminBackupPage() {
  const result = await authenticate();
  if (!result.success || !result.user) {
    redirect("/login");
  }

  if (result.user.role !== "admin") {
    redirect("/");
  }

  // Initialize in-process quarterly checker if not started
  initQuarterlyBackupChecker();

  await connectToDatabase();

  const [rawBackups, storageStats] = await Promise.all([
    BackupRecord.find({ status: { $ne: "deleted" } })
      .sort({ createdAt: -1 })
      .lean()
      .exec(),
    getStorageStats(),
  ]);

  const serializedBackups: IBackupRecordItem[] = rawBackups.map((b) => ({
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

  return (
    <BackupManagementClient
      initialBackups={serializedBackups}
      initialStorage={storageStats}
      retentionCap={BACKUP_RETENTION_CAP}
    />
  );
}
