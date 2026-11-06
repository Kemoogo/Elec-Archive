import { NextResponse } from "next/server";
import fs from "fs";
import fsPromises from "fs/promises";
import { Readable } from "stream";
import { connectToDatabase } from "@/lib/db/connect";
import { requireAdmin } from "@/lib/auth/middleware";
import { BackupRecord } from "@/lib/db/models/BackupRecord";
import { logAuditEvent } from "@/lib/auth/audit";

export async function GET(
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
        { success: false, error: "ملف النسخة الاحتياطية غير موجود أو تم حذفه" },
        { status: 404 }
      );
    }

    let fileStat;
    try {
      fileStat = await fsPromises.stat(backup.filePath);
    } catch {
      return NextResponse.json(
        { success: false, error: "ملف الأرشيف غير متواجد على وسيط التخزين" },
        { status: 404 }
      );
    }

    // Log the download action to AuditLog
    await logAuditEvent({
      userId: auth.user.id,
      userName: auth.user.fullName,
      action: "VIEW",
      module: "backup",
      targetId: backup._id.toString(),
      description: `تحميل وتنزيل ملف النسخة الاحتياطية (${backup.filename})`,
      ipAddress,
    });

    const nodeStream = fs.createReadStream(backup.filePath);
    const webStream = Readable.toWeb(nodeStream) as ReadableStream<Uint8Array>;

    return new Response(webStream, {
      status: 200,
      headers: {
        "Content-Type": "application/gzip",
        "Content-Disposition": `attachment; filename="${encodeURIComponent(backup.filename)}"`,
        "Content-Length": fileStat.size.toString(),
      },
    });
  } catch (error) {
    console.error("Error streaming backup download:", error);
    return NextResponse.json(
      { success: false, error: "حدث خطأ أثناء تحميل ملف النسخة الاحتياطية" },
      { status: 500 }
    );
  }
}
