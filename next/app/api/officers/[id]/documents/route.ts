import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db/connect";
import { authenticate } from "@/lib/auth/middleware";
import { logAuditEvent } from "@/lib/auth/audit";
import { errors } from "@/lib/auth/errors";
import { Officer } from "@/lib/db/models/Officer";
import { canEditOfficers } from "@/lib/officers/access";
import { deleteDocumentSchema } from "@/lib/validations/officers";
import { checkOfficersRateLimit, rateLimitErrorResponse } from "@/lib/security/rate-limit";
import { saveOfficerFile, OFFICERS_MAX_DOCUMENTS_COUNT } from "@/lib/uploads/officers";
import { unlink } from "fs/promises";
import { join } from "path";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await authenticate();
  if (!auth.success) {
    return NextResponse.json(
      { success: false, error: auth.error },
      { status: auth.status },
    );
  }

  if (!canEditOfficers(auth.user!)) {
    return NextResponse.json(
      { success: false, error: errors.insufficientPermissions },
      { status: 403 },
    );
  }

  const ip = request.headers.get("x-forwarded-for") ?? "";
  const rl = checkOfficersRateLimit(auth.user!.id, ip, "upload");
  if (!rl.allowed) {
    return NextResponse.json(rateLimitErrorResponse(rl.resetAt), { status: 429 });
  }

  await connectToDatabase();

  const { id } = await params;
  const officer = await Officer.findById(id);
  if (!officer) {
    return NextResponse.json(
      { success: false, error: "الضابط غير موجود" },
      { status: 404 },
    );
  }

  if (officer.documents.length >= OFFICERS_MAX_DOCUMENTS_COUNT) {
    return NextResponse.json(
      { success: false, error: `لا يمكن إرفاق أكثر من ${OFFICERS_MAX_DOCUMENTS_COUNT} مستندًا` },
      { status: 400 },
    );
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json(
        { success: false, error: "الملف مطلوب" },
        { status: 400 },
      );
    }

    const uploadResult = await saveOfficerFile(file);
    if (!uploadResult.success) {
      return NextResponse.json(
        { success: false, error: uploadResult.error },
        { status: 400 },
      );
    }

    officer.documents.push({
      _id: new (await import("mongoose")).Types.ObjectId(),
      originalName: file.name,
      storedPath: uploadResult.filePath!,
      mimeType: file.type || "application/octet-stream",
      sizeBytes: file.size,
      uploadedAt: new Date(),
      uploadedBy: new (await import("mongoose")).Types.ObjectId(auth.user!.id),
    });

    await officer.save();

    const newDoc = officer.documents[officer.documents.length - 1];

    await logAuditEvent({
      userId: auth.user!.id,
      userName: auth.user!.fullName,
      action: "CREATE",
      module: "officers",
      targetId: id,
      description: `رفع مستند PDF للضابط: ${file.name}`,
      ipAddress: ip,
    });

    return NextResponse.json(
      {
        success: true,
        data: {
          document: {
            id: newDoc._id.toString(),
            originalName: newDoc.originalName,
            uploadedAt: newDoc.uploadedAt.toISOString(),
          },
        },
      },
      { status: 201 },
    );
  } catch {
    return NextResponse.json(
      { success: false, error: errors.internalError },
      { status: 500 },
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await authenticate();
  if (!auth.success) {
    return NextResponse.json(
      { success: false, error: auth.error },
      { status: auth.status },
    );
  }

  if (!canEditOfficers(auth.user!)) {
    return NextResponse.json(
      { success: false, error: errors.insufficientPermissions },
      { status: 403 },
    );
  }

  const ip = request.headers.get("x-forwarded-for") ?? "";
  const rl = checkOfficersRateLimit(auth.user!.id, ip, "write");
  if (!rl.allowed) {
    return NextResponse.json(rateLimitErrorResponse(rl.resetAt), { status: 429 });
  }

  await connectToDatabase();

  const { id } = await params;
  const officer = await Officer.findById(id);
  if (!officer) {
    return NextResponse.json(
      { success: false, error: "الضابط غير موجود" },
      { status: 404 },
    );
  }

  try {
    const body = await request.json();
    const parsed = deleteDocumentSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: errors.validationFailed, details: parsed.error.issues },
        { status: 400 },
      );
    }

    const { documentId } = parsed.data;
    const docIndex = officer.documents.findIndex(
      (d: { _id: { toString: () => string } }) => d._id.toString() === documentId,
    );

    if (docIndex === -1) {
      return NextResponse.json(
        { success: false, error: "المستند غير موجود" },
        { status: 404 },
      );
    }

    const doc = officer.documents[docIndex];

    if (doc.storedPath) {
      const fullPath = join(process.cwd(), "public", doc.storedPath);
      try {
        await unlink(fullPath);
      } catch {
        // File may already be deleted
      }
    }

    officer.documents.splice(docIndex, 1);
    await officer.save();

    await logAuditEvent({
      userId: auth.user!.id,
      userName: auth.user!.fullName,
      action: "DELETE",
      module: "officers",
      targetId: id,
      description: `حذف مستند PDF للضابط: ${doc.originalName}`,
      ipAddress: ip,
    });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { success: false, error: errors.internalError },
      { status: 500 },
    );
  }
}
