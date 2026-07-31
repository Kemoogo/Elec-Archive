import { NextResponse } from "next/server";
import { authenticate } from "@/lib/auth/middleware";
import { connectToDatabase } from "@/lib/db/connect";
import { Officer } from "@/lib/db/models/Officer";
import { handleApiError } from "@/lib/utils/api-error";
import { canEditOfficers } from "@/lib/officers/access";
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

    if (!file || !file.type.startsWith("image/")) {
      return NextResponse.json({ success: false, error: "يُرجى رفع صورة فقط" }, { status: 400 });
    }

    let militaryId = "";
    let officer = null;

    if (id === "new") {
      if (!reqMilitaryId) {
        return NextResponse.json({ success: false, error: "الرقم العسكري مطلوب لرفع الصورة للضابط الجديد" }, { status: 400 });
      }
      militaryId = reqMilitaryId;
    } else {
      officer = await Officer.findById(id);
      if (!officer) {
        return NextResponse.json({ success: false, error: "الضابط غير موجود" }, { status: 404 });
      }
      militaryId = officer.militaryId;
    }

    const targetDir = join(process.cwd(), "public", "uploads", "officers", "photos");
    if (!existsSync(targetDir)) {
      await mkdir(targetDir, { recursive: true });
    }

    // Rename to militaryId.ext
    const ext = file.name.split('.').pop() || 'jpg';
    const fileName = `${militaryId}.${ext}`;
    const filePath = join(targetDir, fileName);

    // If officer had a photo with different path, remove it (cleanup)
    if (officer?.photoUrl) {
       const oldPath = join(process.cwd(), "public", officer.photoUrl);
       if (existsSync(oldPath)) {
         try { await unlink(oldPath); } catch (e) { console.error("Error deleting old photo:", e); }
       }
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    await writeFile(filePath, buffer);

    const relativeUrl = `/uploads/officers/photos/${fileName}`;
    if (officer) {
      await Officer.findByIdAndUpdate(id, { $set: { photoUrl: relativeUrl } });
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
    await connectToDatabase();

    const officer = await Officer.findById(id);
    if (!officer || !officer.photoUrl) {
      return NextResponse.json({ success: false, error: "لا يوجد صورة للحذف" }, { status: 404 });
    }

    const filePath = join(process.cwd(), "public", officer.photoUrl);
    if (existsSync(filePath)) {
      await unlink(filePath);
    }

    await Officer.findByIdAndUpdate(id, { $unset: { photoUrl: "" } });

    return NextResponse.json({ success: true });
  } catch (error) {
    return handleApiError(error, "حدث خطأ أثناء حذف الصورة");
  }
}
