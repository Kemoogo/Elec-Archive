import { NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";
import bcrypt from "bcryptjs";
import { connectToDatabase } from "@/lib/db/connect";
import { requireAdmin } from "@/lib/auth/middleware";
import { User } from "@/lib/db/models/User";
import { BackupRecord } from "@/lib/db/models/BackupRecord";
import { logAuditEvent } from "@/lib/auth/audit";
import { restoreBackupSchema, restoreUploadBackupSchema } from "@/lib/validations/backup";
import { executeRestore } from "@/lib/backup/restore-engine";
import { computeFileSha256 } from "@/lib/backup/backup-engine";
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
  let createdExternalBackup: { id: string; filePath: string } | null = null;

  try {
    const contentType = request.headers.get("content-type") || "";
    let backupIdToRestore: string;
    let externalFilename: string | undefined;

    if (contentType.includes("multipart/form-data")) {
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

      // Save uploaded archive to public/uploads/backups
      const baseUploadsDir = path.join(process.cwd(), "public", "uploads");
      const backupStorageDir = path.join(baseUploadsDir, "backups");
      await fs.mkdir(backupStorageDir, { recursive: true });

      const safeOriginalName = externalFilename.replace(/[^a-zA-Z0-9._-]/g, "_");
      const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
      const savedFilename = `external-restore-${timestamp}-${safeOriginalName}`;
      const savedFilePath = path.join(backupStorageDir, savedFilename);

      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      await fs.writeFile(savedFilePath, buffer);

      const checksumSha256 = await computeFileSha256(savedFilePath);

      // Create a BackupRecord for the external uploaded archive
      const backupDoc = await BackupRecord.create({
        filename: savedFilename,
        filePath: savedFilePath,
        fileSizeBytes: buffer.length,
        backupType: "manual_export",
        status: "completed",
        checksumSha256,
        createdBy: auth.user.id,
        createdByName: auth.user.fullName,
      });

      backupIdToRestore = backupDoc._id.toString();
      createdExternalBackup = { id: backupIdToRestore, filePath: savedFilePath };
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
      await BackupRecord.findByIdAndDelete(createdExternalBackup.id).catch(() => {});
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
