export type BackupType = "quarterly_scheduled" | "manual_export" | "incremental";
export type BackupStatus = "in_progress" | "completed" | "failed" | "deleted";
export type RestoreStatus = "in_progress" | "completed" | "failed";

export interface IStorageStats {
  freeBytes: number;
  totalBytes: number;
  usedBytes: number;
  freePercentage: number;
  isWarning: boolean;
}

export interface IBackupRecordItem {
  id: string;
  filename: string;
  fileSizeBytes: number;
  backupType: BackupType;
  quarter?: string;
  status: BackupStatus;
  collectionsCount: number;
  documentsCount: number;
  checksumSha256?: string;
  createdByName: string;
  createdAt: string;
  deletedAt?: string;
  deletedReason?: string;
  isIncremental?: boolean;
  baseBackupId?: string;
  baseBackupFilename?: string;
}

export interface IRestoreOperationItem {
  id: string;
  backupId: string;
  backupFilename: string;
  status: RestoreStatus;
  startedAt: string;
  completedAt?: string;
  durationSeconds?: number;
  performedByName: string;
  errorDetails?: string;
}

export interface IBackupListResponse {
  backups: IBackupRecordItem[];
  storage: IStorageStats;
  retentionCap: number;
}

export interface IBackupManifest {
  version: string;
  timestamp: string;
  filename: string;
  backupType: BackupType;
  quarter?: string;
  checksumSha256: string;
  isIncremental?: boolean;
  baseBackupId?: string;
  baseBackupFilename?: string;
  baseBackupTimestamp?: string;
  collections: {
    name: string;
    count: number;
  }[];
  totalDocuments: number;
  uploadsFileCount: number;
}
