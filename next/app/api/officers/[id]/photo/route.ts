import { NextResponse } from "next/server";
import { authenticate } from "@/lib/auth/middleware";
import { connectToDatabase } from "@/lib/db/connect";
import { Officer } from "@/lib/db/models/Officer";
import { handleApiError } from "@/lib/utils/api-error";
import { canEditOfficers } from "@/lib/officers/access";
import { logAuditEvent } from "@/lib/auth/audit";
import { checkApiRateLimit, rateLimitErrorResponse } from "@/lib/security/rate-limit";
import { join } from "path";
import { writeFile, unlink, mkdir } from "fs/promises";
import { existsSync } from "fs";
import { Types } from "mongoose";

const MAX_PHOTO_SIZE = 5 * 1024 * 1024; // 5MB
const MILITARY_ID_REGEX = /^\d{1,14}$/;
const ALLOWED_PHOTO_MIMES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const auth = await authenticate();
    if (!auth.success || !canEditOfficers(auth.user!)) {
      return NextResponse.json({ success: false, error: "غير مصرح لك" }, { status: 403 });
    }

    const ip = request.headers.get("x-forwarded-for") ?? "";
    const rl = checkApiRateLimit(auth.user!.id, ip, "upload");
    if (!rl.allowed) {
      return NextResponse.json(rateLimitErrorResponse(rl.resetAt), { status: 429 });
    }

    const { id } = await params;
    await connectToDatabase();

    const formData = await request.formData();
    const file = formData.get("file") as File;
    const reqMilitaryId = formData.get("militaryId") as string;

    if (!file) {
      return NextResponse.json({ success: false, error: "يُرجى اختيار صورة للرفع" }, { status: 400 });
    }

    const mimeType = (file.type || "").toLowerCase().trim();
    const ext = ALLOWED_PHOTO_MIMES[mimeType];
    if (!ext || mimeType === "image/svg+xml") {
      return NextResponse.json({
        success: false,
        error: "نوع الصورة غير مدعوم. يُسمح فقط بملفات JPEG و PNG و WebP (يُحظر ملفات SVG)",
      }, { status: 400 });
    }

    if (file.size > MAX_PHOTO_SIZE) {
      return NextResponse.json({ success: false, error: "حجم الصورة يتجاوز الحد المسموح (5 ميجابايت)" }, { status: 400 });
    }

    let militaryId = "";
    let officer = null;

    if (id === "new") {
      const trimmedMilitaryId = (reqMilitaryId || "").trim();
      if (!trimmedMilitaryId || !MILITARY_ID_REGEX.test(trimmedMilitaryId) || trimmedMilitaryId.includes("..") || trimmedMilitaryId.includes("/") || trimmedMilitaryId.includes("\\")) {
        return NextResponse.json({ success: false, error: "الرقم العسكري مطلوب وغير صالح (يجب أن يتكون من أرقام فقط بحد أقصى 14 رقماً)" }, { status: 400 });
      }
      militaryId = trimmedMilitaryId;
    } else {
      if (!Types.ObjectId.isValid(id)) {
        return NextResponse.json({ success: false, error: "معرف الضابط غير صالح" }, { status: 400 });
      }
      officer = await Officer.findById(id);
      if (!officer) {
        return NextResponse.json({ success: false, error: "الضابط غير موجود" }, { status: 404 });
      }
      const trimmedMilitaryId = (officer.militaryId || "").trim();
      if (!trimmedMilitaryId || !MILITARY_ID_REGEX.test(trimmedMilitaryId) || trimmedMilitaryId.includes("..") || trimmedMilitaryId.includes("/") || trimmedMilitaryId.includes("\\")) {
        return NextResponse.json({ success: false, error: "الرقم العسكري للضابط غير صالح" }, { status: 400 });
      }
      militaryId = trimmedMilitaryId;
    }

    const targetDir = join(process.cwd(), "public", "uploads", "officers", "photos");
    if (!existsSync(targetDir)) {
      await mkdir(targetDir, { recursive: true });
    }

    // Rename to militaryId.ext using trusted whitelist extension
    const fileName = `${militaryId}.${ext}`;
    const filePath = join(targetDir, fileName);

    // Verify filePath is strictly within targetDir
    if (!filePath.startsWith(targetDir) || fileName.includes("..") || fileName.includes("/") || fileName.includes("\\")) {
      return NextResponse.json({ success: false, error: "مسار حفظ الصورة غير صالح" }, { status: 400 });
    }

    // If officer had a photo with different path, remove it (cleanup)
    if (officer?.photoUrl) {
      const safeOldUrl = officer.photoUrl.replace(/\\/g, "/");
      if (safeOldUrl.startsWith("/uploads/officers/photos/") && !safeOldUrl.includes("..")) {
        const oldPath = join(process.cwd(), "public", safeOldUrl);
        if (existsSync(oldPath) && oldPath.startsWith(targetDir)) {
          try { await unlink(oldPath); } catch (e) { console.error("Error deleting old photo:", e); }
        }
      }
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    await writeFile(filePath, buffer);

    const relativeUrl = `/uploads/officers/photos/${fileName}`;
    if (officer) {
      await Officer.findByIdAndUpdate(id, { $set: { photoUrl: relativeUrl } });

      await logAuditEvent({
        userId: auth.user!.id,
        userName: auth.user!.username,
        action: "UPDATE",
        module: "officers",
        targetId: officer._id.toString(),
        description: `تم رفع وتحديث الصورة الشخصية للضابط: ${officer.fullName} (${officer.militaryId})`,
      });
    }

    return NextResponse.json({
      success: true,
      data: { fileUrl: relativeUrl }
    });
  } catch (error) {
    return handleApiError(error, "حدث خطأ أثناء رفع الصورة");
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const auth = await authenticate();
    if (!auth.success || !canEditOfficers(auth.user!)) {
      return NextResponse.json({ success: false, error: "غير مصرح لك" }, { status: 403 });
    }

    const { id } = await params;
    if (!Types.ObjectId.isValid(id)) {
      return NextResponse.json({ success: false, error: "معرف الضابط غير صالح" }, { status: 400 });
    }

    await connectToDatabase();

    const officer = await Officer.findById(id);
    if (!officer || !officer.photoUrl) {
      return NextResponse.json({ success: false, error: "لا يوجد صورة للحذف" }, { status: 404 });
    }

    const safeUrl = officer.photoUrl.replace(/\\/g, "/");
    const targetDir = join(process.cwd(), "public", "uploads", "officers", "photos");
    if (safeUrl.startsWith("/uploads/officers/photos/") && !safeUrl.includes("..")) {
      const filePath = join(process.cwd(), "public", safeUrl);
      if (existsSync(filePath) && filePath.startsWith(targetDir)) {
        await unlink(filePath);
      }
    }

    await Officer.findByIdAndUpdate(id, { $unset: { photoUrl: "" } });

    await logAuditEvent({
      userId: auth.user!.id,
      userName: auth.user!.username,
      action: "DELETE",
      module: "officers",
      targetId: officer._id.toString(),
      description: `تم حذف الصورة الشخصية للضابط: ${officer.fullName} (${officer.militaryId})`,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return handleApiError(error, "حدث خطأ أثناء حذف الصورة");
  }
}
