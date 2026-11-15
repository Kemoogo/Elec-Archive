import { NextResponse } from "next/server";
import fs from "fs/promises";
import { createWriteStream } from "fs";
import path from "path";
import { Readable } from "stream";
import { pipeline } from "stream/promises";
import type { ReadableStream as NodeWebReadableStream } from "stream/web";
import bcrypt from "bcryptjs";
import { connectToDatabase } from "@/lib/db/connect";
import { requireAdmin } from "@/lib/auth/middleware";
import { User } from "@/lib/db/models/User";
import { BackupRecord } from "@/lib/db/models/BackupRecord";
import { logAuditEvent } from "@/lib/auth/audit";
import { checkApiRateLimit, rateLimitErrorResponse } from "@/lib/security/rate-limit";
import {
  MAX_EXTERNAL_RESTORE_BYTES,
  restoreBackupSchema,
  restoreUploadBackupSchema,
} from "@/lib/validations/backup";
import { executeRestore } from "@/lib/backup/restore-engine";
import { computeFileSha256 } from "@/lib/backup/backup-engine";
import { checkDiskSpaceSufficient } from "@/lib/backup/disk-space";
import { enforceRetentionPolicy } from "@/lib/backup/retention-manager";
import { handleApiError } from "@/lib/utils/api-error";

async function verifyAdminPassword(params: {
  userId: string;
  userName: string;
  adminPassword: string;
  targetId: string;
  failDescription: string;
  ipAddress: string;
}): Promise<{ ok: true } | { ok: false; response: NextResponse }> {
  await connectToDatabase();
  const userDoc = await User.findById(params.userId).select("+password").exec();

  if (!userDoc) {
    return {
      ok: false,
      response: NextResponse.json(
        { success: false, error: "حساب المستخدم غير موجود" },
        { status: 404 }
      ),
    };
  }

  const isPasswordValid = await bcrypt.compare(params.adminPassword, userDoc.password);
  if (!isPasswordValid) {
    await logAuditEvent({
      userId: params.userId,
      userName: params.userName,
      action: "LOCK",
      module: "backup",
      targetId: params.targetId,
      description: params.failDescription,
      ipAddress: params.ipAddress,
    });

    return {
      ok: false,
      response: NextResponse.json(
        { success: false, error: "كلمة مرور مدير النظام غير صحيحة" },
        { status: 401 }
      ),
    };
  }

  return { ok: true };
}

export async function POST(request: Request) {
  const auth = await requireAdmin();
  if (!auth.success || !auth.user) {
    return NextResponse.json(
      { success: false, error: auth.error || "غير مصرح بالوصول" },
      { status: auth.status || 401 }
    );
  }

  const ipAddress = request.headers.get("x-forwarded-for") ?? "127.0.0.1";
  const rl = checkApiRateLimit(auth.user.id, ipAddress, "upload");
  if (!rl.allowed) {
    return NextResponse.json(rateLimitErrorResponse(rl.resetAt), { status: 429 });
  }

  let createdExternalBackup: { id?: string; filePath: string } | null = null;
  let externalUploadMeta: {
    filename: string;
    filePath: string;
    fileSizeBytes: number;
    checksumSha256: string;
  } | null = null;

  try {
    const contentType = request.headers.get("content-type") || "";
    let backupIdToRestore: string;
    let externalFilename: string | undefined;

    if (contentType.includes("multipart/form-data")) {
      const contentLengthHeader = request.headers.get("content-length");
      if (contentLengthHeader) {
        const declaredBytes = Number(contentLengthHeader);
        const multipartOverheadAllowance = 10 * 1024 * 1024;
        if (Number.isFinite(declaredBytes) && declaredBytes > MAX_EXTERNAL_RESTORE_BYTES + multipartOverheadAllowance) {
          return NextResponse.json(
            { success: false, error: "حجم ملف الأرشيف يتجاوز الحد الأقصى المسموح به (2 جيجابايت)" },
            { status: 413 }
          );
        }
      }

      const formData = await request.formData();
      const file = formData.get("file") as File | null;
      const adminPassword = (formData.get("adminPassword") as string) || "";
      const confirmationPhrase = (formData.get("confirmationPhrase") as string) || "";

      if (!file || typeof file === "string") {
        return NextResponse.json(
          { success: false, error: "ملف الأرشيف مطلوب بصيغة (.tar.gz)" },
          { status: 400 }
        );
      }

      if (file.size === 0) {
        return NextResponse.json(
          { success: false, error: "ملف الأرشيف المرفوع فارغ أو تالف" },
          { status: 400 }
        );
      }

      if (file.size > MAX_EXTERNAL_RESTORE_BYTES) {
        return NextResponse.json(
          { success: false, error: "حجم ملف الأرشيف يتجاوز الحد الأقصى المسموح به (2 جيجابايت)" },
          { status: 413 }
        );
      }

      externalFilename = file.name || "external-backup.tar.gz";
      const lowerName = externalFilename.toLowerCase();
      if (!lowerName.endsWith(".tar.gz") && !lowerName.endsWith(".tgz")) {
        return NextResponse.json(
          { success: false, error: "صيغة الملف غير مدعومة. يجب أن يكون الأرشيف بصيغة (.tar.gz)" },
          { status: 400 }
        );
      }

      const validation = restoreUploadBackupSchema.safeParse({
        adminPassword,
        confirmationPhrase,
      });

      if (!validation.success) {
        return NextResponse.json(
          { success: false, error: validation.error.issues[0]?.message ?? "بيانات التأكيد غير صالحة" },
          { status: 400 }
        );
      }

      const authCheck = await verifyAdminPassword({
        userId: auth.user.id,
        userName: auth.user.fullName,
        adminPassword,
        targetId: auth.user.id,
        failDescription: "محاولة فاشلة لاستعادة النظام من أرشيف خارجي: كلمة مرور غير صحيحة",
        ipAddress,
      });
      if (!authCheck.ok) {
        return authCheck.response;
      }

      // Check free disk space before writing and extracting external archive
      const baseUploadsDir = path.join(process.cwd(), "public", "uploads");
      const backupStorageDir = path.join(baseUploadsDir, "backups");
      await fs.mkdir(backupStorageDir, { recursive: true });

      const diskCheck = await checkDiskSpaceSufficient(backupStorageDir, file.size);
      if (!diskCheck.sufficient) {
        return NextResponse.json(
          { success: false, error: diskCheck.reason ?? "مساحة القرص الحرة غير كافية لتنفيذ الاستعادة" },
          { status: 507 }
        );
      }

      const safeOriginalName = externalFilename.replace(/[^a-zA-Z0-9._-]/g, "_");
      const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
      const savedFilename = `external-restore-${timestamp}-${safeOriginalName}`;
      const savedFilePath = path.join(backupStorageDir, savedFilename);
      createdExternalBackup = { filePath: savedFilePath };

      const webStream = file.stream() as unknown as NodeWebReadableStream<Uint8Array>;
      await pipeline(Readable.fromWeb(webStream), createWriteStream(savedFilePath));

      const checksumSha256 = await computeFileSha256(savedFilePath);

      // Create a BackupRecord for the external uploaded archive so executeRestore can verify & process it
      const backupDoc = await BackupRecord.create({
        filename: savedFilename,
        filePath: savedFilePath,
        fileSizeBytes: file.size,
        backupType: "manual_export",
        status: "completed",
        checksumSha256,
        createdBy: auth.user.id,
        createdByName: auth.user.fullName,
      });

      backupIdToRestore = backupDoc._id.toString();
      createdExternalBackup.id = backupIdToRestore;
      externalUploadMeta = {
        filename: savedFilename,
        filePath: savedFilePath,
        fileSizeBytes: file.size,
        checksumSha256,
      };
    } else {
      const body = await request.json();
      const validation = restoreBackupSchema.safeParse(body);

      if (!validation.success) {
        return NextResponse.json(
          { success: false, error: validation.error.issues[0]?.message ?? "بيانات الطلب غير صالحة" },
          { status: 400 }
        );
      }

      const { backupId, adminPassword } = validation.data;

      const authCheck = await verifyAdminPassword({
        userId: auth.user.id,
        userName: auth.user.fullName,
        adminPassword,
        targetId: backupId,
        failDescription: "محاولة فاشلة لاستعادة النظام: كلمة مرور غير صحيحة",
        ipAddress,
      });
      if (!authCheck.ok) {
        return authCheck.response;
      }

      backupIdToRestore = backupId;
    }

    // Execute atomic restore
    const restoreResult = await executeRestore({
      backupId: backupIdToRestore,
      userId: auth.user.id,
      userName: auth.user.fullName,
    });
    createdExternalBackup = null;

    // Re-persist the external archive record in the restored DB & enforce 4-backup retention cap
    if (externalUploadMeta) {
      const persistedBackup = await BackupRecord.findOneAndUpdate(
        { filename: externalUploadMeta.filename },
        {
          $set: {
            filePath: externalUploadMeta.filePath,
            fileSizeBytes: externalUploadMeta.fileSizeBytes,
            backupType: "manual_export",
            status: "completed",
            collectionsCount: restoreResult.restoredCollectionsCount,
            documentsCount: restoreResult.restoredDocumentsCount,
            checksumSha256: externalUploadMeta.checksumSha256,
            createdBy: auth.user.id,
            createdByName: auth.user.fullName,
          },
        },
        { upsert: true, new: true }
      );
      if (persistedBackup) {
        backupIdToRestore = persistedBackup._id.toString();
      }

      await enforceRetentionPolicy({
        userId: auth.user.id,
        userName: auth.user.fullName,
        ipAddress,
      });
    }

    // Log successful restore to AuditLog
    await logAuditEvent({
      userId: auth.user.id,
      userName: auth.user.fullName,
      action: "UPDATE",
      module: "backup",
      targetId: backupIdToRestore,
      description: externalFilename
        ? `استعادة المنظومة وقاعدة البيانات بنجاح من أرشيف خارجي (${externalFilename}) خلال ${restoreResult.durationSeconds} ثانية`
        : `استعادة المنظومة وقاعدة البيانات بنجاح من النسخة (${restoreResult.backupFilename}) خلال ${restoreResult.durationSeconds} ثانية`,
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
    if (createdExternalBackup) {
      await fs.unlink(createdExternalBackup.filePath).catch(() => {});
      if (createdExternalBackup.id) {
        await BackupRecord.findByIdAndDelete(createdExternalBackup.id).catch(() => {});
      }
    }
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
