import fs from "fs/promises";
import { createReadStream } from "fs";
import path from "path";
import zlib from "zlib";
import readline from "readline";
import { execFile } from "child_process";
import { promisify } from "util";
import mongoose, { Types } from "mongoose";
import { connectToDatabase } from "@/lib/db/connect";
import { BackupRecord } from "@/lib/db/models/BackupRecord";
import { RestoreOperation } from "@/lib/db/models/RestoreOperation";
import { computeFileSha256 } from "./backup-engine";
import { acquireLock, releaseLock } from "./mutex-lock";
import type { IBackupManifest } from "@/types/backup";

const execFileAsync = promisify(execFile);

export interface RestoreContext {
  backupId: string;
  userId: string;
  userName: string;
}

export interface RestoreResult {
  operationId: string;
  backupFilename: string;
  restoredCollectionsCount: number;
  restoredDocumentsCount: number;
  durationSeconds: number;
}

/**
 * Recursively copy directory preserving existing files in target that aren't overwritten,
 * and skipping the 'backups' directory.
 */
async function copyUploadsBack(srcDir: string, destDir: string): Promise<void> {
  await fs.mkdir(destDir, { recursive: true });

  let entries;
  try {
    entries = await fs.readdir(srcDir, { withFileTypes: true });
  } catch (err: unknown) {
    const code = (err as { code?: string })?.code;
    if (code === "ENOENT") return;
    throw err;
  }

  for (const entry of entries) {
    const srcPath = path.join(srcDir, entry.name);
    const destPath = path.join(destDir, entry.name);

    if (entry.isDirectory()) {
      if (entry.name === "backups") continue;
      await copyUploadsBack(srcPath, destPath);
    } else if (entry.isFile()) {
      await fs.copyFile(srcPath, destPath);
    }
  }
}

type MongoDoc = mongoose.mongo.BSON.Document;

/**
 * Restores a single collection from a .json.gz file in batches.
 * In full mode, clears existing documents.
 * In incremental mode, upserts by _id so existing untouched documents remain intact.
 */
async function restoreCollectionFromGz(
  collection: mongoose.mongo.Collection<MongoDoc>,
  filePath: string,
  isIncremental = false,
  batchSize = 500
): Promise<number> {
  const gunzip = zlib.createGunzip();
  const fileStream = createReadStream(filePath);
  const rl = readline.createInterface({
    input: fileStream.pipe(gunzip),
    crlfDelay: Infinity,
  });

  // Only clear existing records on full restore
  if (!isIncremental) {
    await collection.deleteMany({});
  }

  const { EJSON } = mongoose.mongo.BSON;
  let batch: MongoDoc[] = [];
  let totalCount = 0;

  for await (const line of rl) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    const doc = EJSON.parse(trimmed) as MongoDoc;
    batch.push(doc);

    if (batch.length >= batchSize) {
      if (isIncremental) {
        const ops: mongoose.mongo.AnyBulkWriteOperation<MongoDoc>[] = batch.map((d) => ({
          replaceOne: {
            filter: { _id: d._id as unknown as mongoose.mongo.BSON.ObjectId },
            replacement: d,
            upsert: true,
          },
        }));
        await collection.bulkWrite(ops);
      } else {
        await collection.insertMany(batch);
      }
      totalCount += batch.length;
      batch = [];
    }
  }

  if (batch.length > 0) {
    if (isIncremental) {
      const ops: mongoose.mongo.AnyBulkWriteOperation<MongoDoc>[] = batch.map((d) => ({
        replaceOne: {
          filter: { _id: d._id as unknown as mongoose.mongo.BSON.ObjectId },
          replacement: d,
          upsert: true,
        },
      }));
      await collection.bulkWrite(ops);
    } else {
      await collection.insertMany(batch);
    }
    totalCount += batch.length;
  }

  return totalCount;
}

/**
 * Core Atomic Restore Engine
 * Extracts backup archive, verifies SHA-256 integrity, replaces collections,
 * restores uploads directory, and updates operation history.
 */
export async function executeRestore(context: RestoreContext): Promise<RestoreResult> {
  const startedAt = new Date();

  // 1. Acquire mutex lock
  const lockAcquired = acquireLock("restore");
  if (!lockAcquired) {
    const err = new Error("توجد عملية نسخ احتياطي أو استعادة أخرى قيد التنفيذ حالياً");
    (err as { statusCode?: number }).statusCode = 409;
    throw err;
  }

  await connectToDatabase();
  const backup = await BackupRecord.findById(context.backupId).exec();
  if (!backup || backup.status === "deleted") {
    releaseLock();
    const err = new Error("ملف النسخة الاحتياطية غير موجود أو تم حذفه مسبقاً");
    (err as { statusCode?: number }).statusCode = 404;
    throw err;
  }

  // Verify file exists on disk
  try {
    await fs.stat(backup.filePath);
  } catch {
    releaseLock();
    const err = new Error("ملف الأرشيف غير موجود على وحدة التخزين");
    (err as { statusCode?: number }).statusCode = 404;
    throw err;
  }

  // 2. Verify SHA-256 checksum if recorded
  if (backup.checksumSha256) {
    const actualChecksum = await computeFileSha256(backup.filePath);
    if (actualChecksum !== backup.checksumSha256) {
      releaseLock();
      const err = new Error(
        "فشل التحقق من البصمة التشفيرية للأرشيف (SHA-256). الملف قد يكون تالفاً أو تم تعديله بصورة غير مصرح بها."
      );
      (err as { statusCode?: number }).statusCode = 400;
      throw err;
    }
  }

  const baseUploadsDir = path.join(process.cwd(), "public", "uploads");
  const backupStorageDir = path.join(baseUploadsDir, "backups");
  const stagingDirName = `.staging-restore-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const stagingDir = path.join(backupStorageDir, stagingDirName);

  let operationRecord;

  try {
    // 3. Create initial RestoreOperation record
    operationRecord = await RestoreOperation.create({
      backupId: backup._id,
      backupFilename: backup.filename,
      status: "in_progress",
      startedAt,
      performedBy: new Types.ObjectId(context.userId),
      performedByName: context.userName,
    });

    // 4. Extract archive to staging directory
    await fs.mkdir(stagingDir, { recursive: true });
    await execFileAsync("tar", ["-xzf", backup.filePath, "-C", stagingDir]);

    // 5. Read manifest
    const manifestPath = path.join(stagingDir, "manifest.json");
    const manifestContent = await fs.readFile(manifestPath, "utf-8");
    const manifest: IBackupManifest = JSON.parse(manifestContent);

    // 6. Restore MongoDB collections
    const db = mongoose.connection.db;
    if (!db) {
      throw new Error("تعذر الاتصال بقاعدة البيانات MongoDB");
    }

    let totalDocsRestored = 0;
    let collectionsRestored = 0;

    for (const item of manifest.collections) {
      const colName = item.name;
      const colFilePath = path.join(stagingDir, "data", `${colName}.json.gz`);

      try {
        await fs.stat(colFilePath);
      } catch {
        // Skip if collection file not in archive
        continue;
      }

      const collection = db.collection(colName);
      const isIncremental = Boolean(manifest.isIncremental);
      const count = await restoreCollectionFromGz(collection, colFilePath, isIncremental);
      totalDocsRestored += count;
      collectionsRestored++;
    }

    // 7. Restore uploads directory (excluding backups)
    const stagingUploadsDir = path.join(stagingDir, "uploads");
    try {
      await fs.stat(stagingUploadsDir);
      await copyUploadsBack(stagingUploadsDir, baseUploadsDir);
    } catch {
      // Staging uploads might be empty or absent
    }

    // 8. Update RestoreOperation record to completed
    const completedAt = new Date();
    const durationSeconds = Math.round((completedAt.getTime() - startedAt.getTime()) / 1000);

    operationRecord.status = "completed";
    operationRecord.completedAt = completedAt;
    operationRecord.durationSeconds = durationSeconds;
    await RestoreOperation.findByIdAndUpdate(
      operationRecord._id,
      {
        backupId: backup._id,
        backupFilename: backup.filename,
        status: "completed",
        startedAt,
        completedAt,
        durationSeconds,
        performedBy: new Types.ObjectId(context.userId),
        performedByName: context.userName,
      },
      { upsert: true }
    );

    return {
      operationId: operationRecord._id.toString(),
      backupFilename: backup.filename,
      restoredCollectionsCount: collectionsRestored,
      restoredDocumentsCount: totalDocsRestored,
      durationSeconds,
    };
  } catch (error) {
    if (operationRecord) {
      await RestoreOperation.findByIdAndUpdate(
        operationRecord._id,
        {
          backupId: backup._id,
          backupFilename: backup.filename,
          status: "failed",
          startedAt,
          performedBy: new Types.ObjectId(context.userId),
          performedByName: context.userName,
          errorDetails: error instanceof Error ? error.message : "خطأ غير معروف",
        },
        { upsert: true }
      ).catch(() => {});
    }
    throw error;
  } finally {
    // Clean up extraction staging folder and release lock
    try {
      await fs.rm(stagingDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup error
    }
    releaseLock();
  }
}
