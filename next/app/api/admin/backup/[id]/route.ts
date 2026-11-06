import { NextResponse } from "next/server";
import fs from "fs/promises";
import { connectToDatabase } from "@/lib/db/connect";
import { requireAdmin } from "@/lib/auth/middleware";
import { BackupRecord } from "@/lib/db/models/BackupRecord";
import { logAuditEvent } from "@/lib/auth/audit";

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin();
  if (!auth.success || !auth.user) {
    return NextResponse.json(
      { success: false, error: auth.error || "غير مصرح بالوصول" },
      { status: auth.status || 401 }
    );
  }

  const { id } = await params;
  if (!id || !/^[0-9a-fA-F]{24}$/.test(id)) {
    return NextResponse.json(
      { success: false, error: "معرف النسخة الاحتياطية غير صالح" },
      { status: 400 }
    );
  }

  const ipAddress = request.headers.get("x-forwarded-for") ?? "127.0.0.1";

  try {
    await connectToDatabase();
    const backup = await BackupRecord.findById(id).exec();

    if (!backup || backup.status === "deleted") {
      return NextResponse.json(
        { success: false, error: "النسخة الاحتياطية غير موجودة أو تم حذفها مسبقاً" },
        { status: 404 }
      );
    }

    // 1. Remove file from storage
    if (backup.filePath) {
      try {
        await fs.unlink(backup.filePath);
      } catch (err: unknown) {
        const code = (err as { code?: string })?.code;
        if (code !== "ENOENT") {
          console.error("Failed to delete backup file from disk:", err);
        }
      }
    }

    // 2. Mark as deleted in DB
    backup.status = "deleted";
    backup.deletedAt = new Date();
    backup.deletedReason = "حذف يدوي بواسطة مدير النظام";
    await backup.save();

    // 3. Log audit event
    await logAuditEvent({
      userId: auth.user.id,
      userName: auth.user.fullName,
      action: "DELETE",
      module: "backup",
      targetId: backup._id.toString(),
      description: `حذف يدوي لملف النسخة الاحتياطية (${backup.filename}) من الخادم`,
      ipAddress,
    });

    return NextResponse.json({
      success: true,
      message: `تم حذف النسخة الاحتياطية (${backup.filename}) بنجاح`,
    });
  } catch (error) {
    console.error("Error deleting backup:", error);
    return NextResponse.json(
      { success: false, error: "حدث خطأ أثناء محاولة حذف النسخة الاحتياطية" },
      { status: 500 }
    );
  }
}
