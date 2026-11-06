import { NextResponse } from "next/server";
import { authenticate } from "@/lib/auth/middleware";
import { hasModuleAccess } from "@/lib/auth/rbac";
import { errors } from "@/lib/auth/errors";
import { connectToDatabase } from "@/lib/db/connect";
import { Student } from "@/lib/db/models/Student";
import {
  StudentBatch,
  DEFAULT_BATCH_CLASSIFICATIONS,
  formatBatchName,
  type IBatchClassification,
} from "@/lib/db/models/StudentBatch";
import { logAuditEvent } from "@/lib/auth/audit";
import { batchClassificationSchema } from "@/lib/validations/student";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function POST(request: Request, context: RouteContext) {
  const auth = await authenticate();
  if (!auth.success) {
    return NextResponse.json(
      { success: false, error: auth.error },
      { status: auth.status }
    );
  }

  if (!hasModuleAccess(auth.user, "students", "edit")) {
    return NextResponse.json(
      { success: false, error: errors.insufficientPermissions },
      { status: 403 }
    );
  }

  try {
    const { id: mrhla } = await context.params;
    const body = await request.json();
    const parsed = batchClassificationSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0]?.message ?? "بيانات التصنيف غير صالحة" },
        { status: 400 }
      );
    }

    await connectToDatabase();

    let batch = await StudentBatch.findOne({ mrhla });
    if (!batch) {
      const count = await Student.countDocuments({ mrhla });
      batch = await StudentBatch.create({
        mrhla,
        name: formatBatchName(mrhla),
        targetCount: count,
        arrivedCount: count,
        remainingCount: 0,
        classifications: [...DEFAULT_BATCH_CLASSIFICATIONS],
      });
    }

    const { name, description } = parsed.data;
    const existingIndex = batch.classifications.findIndex(
      (c: IBatchClassification) => c.name.trim() === name.trim()
    );

    if (existingIndex >= 0) {
      batch.classifications[existingIndex].description = description || batch.classifications[existingIndex].description;
    } else {
      const slugId = `custom-${Date.now()}`;
      batch.classifications.push({
        id: slugId,
        name: name.trim(),
        description: description?.trim(),
        isDefault: false,
      });
    }

    await batch.save();

    const user = auth.user!;
    const clientIp = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "127.0.0.1";

    await logAuditEvent({
      userId: user.id,
      userName: user.fullName,
      action: "CREATE",
      module: "students",
      targetId: batch._id.toString(),
      description: `إضافة/تحديث التصنيف التخصصي (${name}) لمرحلة ${mrhla}`,
      ipAddress: clientIp,
    });

    return NextResponse.json({
      success: true,
      message: "تم حفظ التصنيف التخصصي بنجاح",
      data: batch.classifications,
    });
  } catch (error) {
    console.error("Error adding batch classification:", error);
    return NextResponse.json(
      { success: false, error: "حدث خطأ أثناء إضافة التصنيف" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request, context: RouteContext) {
  const auth = await authenticate();
  if (!auth.success) {
    return NextResponse.json(
      { success: false, error: auth.error },
      { status: auth.status }
    );
  }

  if (!hasModuleAccess(auth.user, "students", "edit")) {
    return NextResponse.json(
      { success: false, error: errors.insufficientPermissions },
      { status: 403 }
    );
  }

  try {
    const { id: mrhla } = await context.params;
    const { searchParams } = new URL(request.url);
    const classificationId = searchParams.get("id") || searchParams.get("classificationId");

    if (!classificationId) {
      return NextResponse.json(
        { success: false, error: "معرف التصنيف مطلوب للحذف" },
        { status: 400 }
      );
    }

    await connectToDatabase();

    const batch = await StudentBatch.findOne({ mrhla });
    if (!batch) {
      return NextResponse.json(
        { success: false, error: "المرحلة غير موجودة" },
        { status: 404 }
      );
    }

    const targetClass = batch.classifications.find(
      (c: IBatchClassification) => c.id === classificationId
    );
    if (!targetClass) {
      return NextResponse.json(
        { success: false, error: "التصنيف غير موجود في هذه المرحلة" },
        { status: 404 }
      );
    }

    batch.classifications = batch.classifications.filter(
      (c: IBatchClassification) => c.id !== classificationId
    );
    await batch.save();

    // Clear classification from students who had it
    await Student.updateMany(
      { mrhla, classificationId },
      { $unset: { classificationId: 1, classificationName: 1 } }
    );

    const user = auth.user!;
    const clientIp = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "127.0.0.1";

    await logAuditEvent({
      userId: user.id,
      userName: user.fullName,
      action: "DELETE",
      module: "students",
      targetId: batch._id.toString(),
      description: `حذف التصنيف التخصصي (${targetClass.name}) من مرحلة ${mrhla}`,
      ipAddress: clientIp,
    });

    return NextResponse.json({
      success: true,
      message: "تم حذف التصنيف بنجاح وتحديث سجلات الطلاب",
      data: batch.classifications,
    });
  } catch (error) {
    console.error("Error deleting batch classification:", error);
    return NextResponse.json(
      { success: false, error: "حدث خطأ أثناء حذف التصنيف" },
      { status: 500 }
    );
  }
}
