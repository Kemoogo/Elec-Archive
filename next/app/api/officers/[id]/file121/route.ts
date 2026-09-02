import { NextResponse } from "next/server";
import { authenticate } from "@/lib/auth/middleware";
import { connectToDatabase } from "@/lib/db/connect";
import { Officer } from "@/lib/db/models/Officer";
import { handleApiError } from "@/lib/utils/api-error";
import { canEditOfficers } from "@/lib/officers/access";
import { logAuditEvent } from "@/lib/auth/audit";
import { join } from "path";
import { writeFile, unlink, mkdir } from "fs/promises";
import { existsSync } from "fs";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const auth = await authenticate();
    if (!auth.success || !canEditOfficers(auth.user!)) {
      return NextResponse.json({ success: false, error: "غير مصرح لك" }, { status: 403 });
    }

    const { id } = await params;
    await connectToDatabase();

    const formData = await request.formData();
    const file = formData.get("file") as File;
    const reqMilitaryId = formData.get("militaryId") as string;

    if (!file || file.type !== "application/pdf") {
      return NextResponse.json({ success: false, error: "يُرجى رفع ملف PDF فقط" }, { status: 400 });
    }

    let militaryId = "";
    let officer = null;

    if (id === "new") {
      if (!reqMilitaryId) {
        return NextResponse.json({ success: false, error: "الرقم العسكري مطلوب لرفع الملف للضابط الجديد" }, { status: 400 });
      }
      militaryId = reqMilitaryId;
    } else {
      officer = await Officer.findById(id);
      if (!officer) {
        return NextResponse.json({ success: false, error: "الضابط غير موجود" }, { status: 404 });
      }
      militaryId = officer.militaryId;
    }

    const targetDir = join(process.cwd(), "public", "uploads", "officers");
    if (!existsSync(targetDir)) {
      await mkdir(targetDir, { recursive: true });
    }

    // Rename to militaryId.pdf
    const fileName = `${militaryId}.pdf`;
    const filePath = join(targetDir, fileName);

    // If officer had a file with different path, remove it (cleanup)
    if (officer?.file121Url) {
       const oldPath = join(process.cwd(), "public", officer.file121Url);
       if (existsSync(oldPath)) {
         try { await unlink(oldPath); } catch (e) { console.error("Error deleting old file:", e); }
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
    await connectToDatabase();

    const officer = await Officer.findById(id);
    if (!officer || !officer.file121Url) {
      return NextResponse.json({ success: false, error: "لا يوجد ملف للحذف" }, { status: 404 });
    }

    const filePath = join(process.cwd(), "public", officer.file121Url);
    if (existsSync(filePath)) {
      await unlink(filePath);
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
