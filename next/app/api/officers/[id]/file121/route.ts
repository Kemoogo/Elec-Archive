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

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const MILITARY_ID_REGEX = /^\d{1,14}$/;

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

    if (!file || file.type !== "application/pdf") {
      return NextResponse.json({ success: false, error: "يُرجى رفع ملف PDF فقط" }, { status: 400 });
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ success: false, error: "حجم الملف يتجاوز الحد المسموح (10 ميجابايت)" }, { status: 400 });
    }

    let militaryId = "";
    let officer = null;

    if (id === "new") {
      const trimmedMilitaryId = (reqMilitaryId || "").trim();
      if (!trimmedMilitaryId || !MILITARY_ID_REGEX.test(trimmedMilitaryId) || trimmedMilitaryId.includes("..") || trimmedMilitaryId.includes("/") || trimmedMilitaryId.includes("\\")) {
        return NextResponse.json({ success: false, error: "الرقم العسكري غير صالح (يجب أن يتكون من أرقام فقط بحد أقصى 14 رقماً)" }, { status: 400 });
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

    const targetDir = join(process.cwd(), "public", "uploads", "officers");
    if (!existsSync(targetDir)) {
      await mkdir(targetDir, { recursive: true });
    }

    // Rename to militaryId.pdf
    const fileName = `${militaryId}.pdf`;
    const filePath = join(targetDir, fileName);

    // Verify filePath is strictly within targetDir
    if (!filePath.startsWith(targetDir) || fileName.includes("..") || fileName.includes("/") || fileName.includes("\\")) {
      return NextResponse.json({ success: false, error: "مسار حفظ الملف غير صالح" }, { status: 400 });
    }

    // If officer had a file with different path, remove it (cleanup)
    if (officer?.file121Url) {
      const safeOldUrl = officer.file121Url.replace(/\\/g, "/");
      if (safeOldUrl.startsWith("/uploads/officers/") && !safeOldUrl.includes("..")) {
        const oldPath = join(process.cwd(), "public", safeOldUrl);
        if (existsSync(oldPath) && oldPath.startsWith(targetDir)) {
          try { await unlink(oldPath); } catch (e) { console.error("Error deleting old file:", e); }
        }
      }
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    await writeFile(filePath, buffer);

    const relativeUrl = `/uploads/officers/${fileName}`;
    if (officer) {
      officer.file121Url = relativeUrl;
      officer.file121UpdatedAt = new Date();

      try {
        const { parseOfficer121PdfAction } = await import("@/app/actions/officers");
        const parseFormData = new FormData();
        const pdfBlob = new Blob([buffer], { type: "application/pdf" });
        parseFormData.append("file", pdfBlob, fileName);

        const parseRes = await parseOfficer121PdfAction(parseFormData);
        if (parseRes.success && parseRes.extracted?.file121IssueDate) {
          officer.file121IssueDate = parseRes.extracted.file121IssueDate;
        }
      } catch (e) {
        console.error("Error extracting PDF issue date in API route:", e);
      }

      await officer.save();

      await logAuditEvent({
        userId: auth.user!.id,
        userName: auth.user!.username,
        action: "UPDATE",
        module: "officers",
        targetId: officer._id.toString(),
        description: `تم رفع وتحديث ملف 121 للضابط: ${officer.fullName} (${officer.militaryId})`,
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        fileUrl: relativeUrl,
        file121IssueDate: officer?.file121IssueDate,
        file121UpdatedAt: officer?.file121UpdatedAt ? officer.file121UpdatedAt.toISOString() : new Date().toISOString(),
      }
    });
  } catch (error) {
    return handleApiError(error, "حدث خطأ أثناء رفع الملف");
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
    if (!officer || !officer.file121Url) {
      return NextResponse.json({ success: false, error: "لا يوجد ملف للحذف" }, { status: 404 });
    }

    const safeUrl = officer.file121Url.replace(/\\/g, "/");
    const targetDir = join(process.cwd(), "public", "uploads", "officers");
    if (safeUrl.startsWith("/uploads/officers/") && !safeUrl.includes("..")) {
      const filePath = join(process.cwd(), "public", safeUrl);
      if (existsSync(filePath) && filePath.startsWith(targetDir)) {
        await unlink(filePath);
      }
    }

    officer.file121Url = undefined;
    officer.file121UpdatedAt = undefined;
    officer.file121IssueDate = undefined;
    await officer.save();

    await logAuditEvent({
      userId: auth.user!.id,
      userName: auth.user!.username,
      action: "DELETE",
      module: "officers",
      targetId: officer._id.toString(),
      description: `تم حذف ملف 121 للضابط: ${officer.fullName} (${officer.militaryId})`,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return handleApiError(error, "حدث خطأ أثناء حذف الملف");
  }
}
