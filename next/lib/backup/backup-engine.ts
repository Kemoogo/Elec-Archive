import fs from "fs/promises";
import { createReadStream, createWriteStream } from "fs";
import path from "path";
import zlib from "zlib";
import crypto from "crypto";
import { execFile } from "child_process";
import { promisify } from "util";
import { pipeline } from "stream/promises";
import mongoose, { Types } from "mongoose";
import { connectToDatabase } from "@/lib/db/connect";
import { BackupRecord } from "@/lib/db/models/BackupRecord";
import { checkDiskSpaceSufficient } from "./disk-space";
import { acquireLock, releaseLock } from "./mutex-lock";
import type { BackupType, IBackupManifest } from "@/types/backup";

const execFileAsync = promisify(execFile);

export interface BackupContext {
  userId: string;
  userName: string;
  backupType: BackupType;
  quarter?: string;
  isIncremental?: boolean;
}

export interface BackupGenerationResult {
  backupId: string;
  filename: string;
  filePath: string;
  fileSizeBytes: number;
  collectionsCount: number;
  documentsCount: number;
  checksumSha256: string;
  isIncremental?: boolean;
  baseBackupFilename?: string;
}

/**
 * Compute SHA-256 checksum for a file on disk
 */
export function computeFileSha256(filePath: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash("sha256");
    const stream = createReadStream(filePath);
    stream.on("data", (chunk) => hash.update(chunk));
    stream.on("end", () => resolve(hash.digest("hex")));
    stream.on("error", reject);
  });
}

/**
 * Recursively copy uploads directory while strictly excluding the 'backups' folder.
 * If modifiedSince is provided, only files modified after that date are copied.
 */
async function copyUploadsExcludingBackups(
  srcDir: string,
  destDir: string,
  modifiedSince?: Date
): Promise<number> {
  let fileCount = 0;
  await fs.mkdir(destDir, { recursive: true });

  let entries;
  try {
    entries = await fs.readdir(srcDir, { withFileTypes: true });
  } catch (err: unknown) {
    const code = (err as { code?: string })?.code;
    if (code === "ENOENT") {
      return 0; // uploads directory empty or doesn't exist yet
    }
    throw err;
  }

  for (const entry of entries) {
    const srcPath = path.join(srcDir, entry.name);
    const destPath = path.join(destDir, entry.name);

    // Strictly skip backups and staging directories
    if (entry.isDirectory()) {
      if (entry.name === "backups" || entry.name.startsWith(".staging")) {
        continue;
      }
      fileCount += await copyUploadsExcludingBackups(srcPath, destPath, modifiedSince);
    } else if (entry.isFile()) {
      if (modifiedSince) {
        try {
          const stat = await fs.stat(srcPath);
          // If file was not modified after previous backup, skip it
          if (stat.mtime <= modifiedSince) {
            continue;
          }
        } catch {
          // If stat fails, copy conservatively
        }
      }
      await fs.copyFile(srcPath, destPath);
      fileCount++;
    }
  }

  return fileCount;
}

/**
 * Core Backup Engine
 * Streams MongoDB collections to compressed Extended JSON (.json.gz),
 * archives public/uploads, generates manifest.json with SHA-256 checksum,
 * and packs everything into a single .tar.gz archive.
 * Supports full and incremental/differential modes.
 */
export async function generateBackup(
  context: BackupContext
): Promise<BackupGenerationResult> {
  // 1. Acquire mutex lock
  const lockAcquired = acquireLock("backup");
  if (!lockAcquired) {
    const err = new Error("توجد عملية نسخ احتياطي أو استعادة أخرى قيد التنفيذ حالياً");
    (err as { statusCode?: number }).statusCode = 409;
    throw err;
  }

  await connectToDatabase();

  // Check if incremental mode requested and find baseline backup
  let baseBackupRecord = null;
  let modifiedSince: Date | undefined;

  if (context.isIncremental || context.backupType === "incremental") {
    baseBackupRecord = await BackupRecord.findOne({ status: "completed" })
      .sort({ createdAt: -1 })
      .exec();

    if (baseBackupRecord) {
      modifiedSince = baseBackupRecord.createdAt;
    }
  }

  const baseUploadsDir = path.join(process.cwd(), "public", "uploads");
  const backupStorageDir = path.join(baseUploadsDir, "backups");
  const timestampStr = new Date()
    .toISOString()
    .replace(/[-:]/g, "")
    .replace("T", "-")
    .replace(/\..+/, "");

  let effectiveBackupType: BackupType = context.backupType;
  let filenamePrefix = "backup-manual";

  if (baseBackupRecord) {
    effectiveBackupType = "incremental";
    filenamePrefix = "backup-incremental";
  } else if (context.backupType === "quarterly_scheduled") {
    const qStr = context.quarter ? context.quarter.toLowerCase() : "quarterly";
    filenamePrefix = `backup-${qStr}`;
  }

  const finalTarFilename = `${filenamePrefix}-${timestampStr}.tar.gz`;
  const finalArchivePath = path.join(backupStorageDir, finalTarFilename);

  const stagingDirName = `.staging-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const stagingDir = path.join(backupStorageDir, stagingDirName);

  try {
    // 2. Ensure directories exist and verify disk space
    await fs.mkdir(backupStorageDir, { recursive: true });
    await fs.mkdir(path.join(stagingDir, "data"), { recursive: true });
    await fs.mkdir(path.join(stagingDir, "uploads"), { recursive: true });

    const spaceCheck = await checkDiskSpaceSufficient(backupStorageDir);
    if (!spaceCheck.sufficient) {
      const err = new Error(spaceCheck.reason || "المساحة غير كافية لإنشاء نسخة احتياطية");
      (err as { statusCode?: number }).statusCode = 400;
      throw err;
    }

    // 3. Connect to database and retrieve native collections
    const db = mongoose.connection.db;
    if (!db) {
      throw new Error("تعذر الاتصال بقاعدة البيانات MongoDB");
    }

    const collections = await db.collections();
    const { EJSON } = mongoose.mongo.BSON;
    const collectionsSummary: { name: string; count: number }[] = [];
    let totalDocuments = 0;

    // 4. Stream each collection into .data/<colName>.json.gz (NDJSON format)
    for (const col of collections) {
      const colName = col.collectionName;
      // Skip internal MongoDB collections
      if (colName.startsWith("system.")) {
        continue;
      }

      const colFilePath = path.join(stagingDir, "data", `${colName}.json.gz`);
      const gzip = zlib.createGzip({ level: 6 });
      const writeStream = createWriteStream(colFilePath);

      let queryFilter: Record<string, unknown> = {};
      if (modifiedSince) {
        // If collection documents have updatedAt or createdAt, query only modified docs
        const sampleDoc = await col.findOne({
          $or: [
            { updatedAt: { $exists: true } },
            { createdAt: { $exists: true } },
          ],
        });

        if (sampleDoc) {
          queryFilter = {
            $or: [
              { updatedAt: { $gt: modifiedSince } },
              { createdAt: { $gt: modifiedSince } },
            ],
          };
        }
      }

      let docCount = 0;
      const cursor = col.find(queryFilter);

      // Push cursor docs through gzip pipeline
      const streamPromise = (async () => {
        for await (const doc of cursor) {
          const line = EJSON.stringify(doc) + "\n";
          if (!gzip.write(line)) {
            await new Promise((resolve) => gzip.once("drain", resolve));
          }
          docCount++;
        }
        gzip.end();
      })();

      await Promise.all([streamPromise, pipeline(gzip, writeStream)]);

      collectionsSummary.push({ name: colName, count: docCount });
      totalDocuments += docCount;
    }

    // 5. Copy uploads directory (excluding backups)
    const uploadsCount = await copyUploadsExcludingBackups(
      baseUploadsDir,
      path.join(stagingDir, "uploads"),
      modifiedSince
    );

    // 6. Write manifest.json
    const manifest: IBackupManifest = {
      version: "1.0.0",
      timestamp: new Date().toISOString(),
      filename: finalTarFilename,
      backupType: effectiveBackupType,
      quarter: context.quarter,
      checksumSha256: "", // placeholder before tar compression
      isIncremental: Boolean(baseBackupRecord),
      baseBackupId: baseBackupRecord ? baseBackupRecord._id.toString() : undefined,
      baseBackupFilename: baseBackupRecord ? baseBackupRecord.filename : undefined,
      baseBackupTimestamp: baseBackupRecord ? baseBackupRecord.createdAt.toISOString() : undefined,
      collections: collectionsSummary,
      totalDocuments,
      uploadsFileCount: uploadsCount,
    };

    await fs.writeFile(
      path.join(stagingDir, "manifest.json"),
      JSON.stringify(manifest, null, 2),
      "utf-8"
    );

    // 7. Compress staging directory into final .tar.gz archive
    await execFileAsync("tar", ["-czf", finalArchivePath, "-C", stagingDir, "."]);

    // 8. Compute checksum of the final archive
    const checksumSha256 = await computeFileSha256(finalArchivePath);
    const archiveStat = await fs.stat(finalArchivePath);

    // 9. Save BackupRecord in MongoDB
    const record = await BackupRecord.create({
      filename: finalTarFilename,
      filePath: finalArchivePath,
      fileSizeBytes: archiveStat.size,
      backupType: effectiveBackupType,
      quarter: context.quarter,
      status: "completed",
      collectionsCount: collectionsSummary.length,
      documentsCount: totalDocuments,
      checksumSha256,
      createdBy: new Types.ObjectId(context.userId),
      createdByName: context.userName,
      isIncremental: Boolean(baseBackupRecord),
      baseBackupId: baseBackupRecord ? baseBackupRecord._id : undefined,
      baseBackupFilename: baseBackupRecord ? baseBackupRecord.filename : undefined,
    });

    return {
      backupId: record._id.toString(),
      filename: finalTarFilename,
      filePath: finalArchivePath,
      fileSizeBytes: archiveStat.size,
      collectionsCount: collectionsSummary.length,
      documentsCount: totalDocuments,
      checksumSha256,
      isIncremental: Boolean(baseBackupRecord),
      baseBackupFilename: baseBackupRecord ? baseBackupRecord.filename : undefined,
    };
  } catch (error) {
    // Clean up temporary files on failure
    try {
      await fs.unlink(finalArchivePath);
    } catch {
      // Ignore if archive was not yet created
    }
    throw error;
  } finally {
    // Always clean up staging directory and release mutex lock
    try {
      await fs.rm(stagingDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup error
    }
    releaseLock();
  }
}
