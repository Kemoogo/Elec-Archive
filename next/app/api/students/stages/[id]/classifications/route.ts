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
import { batchClassificationSchema, updateBatchClassificationSchema } from "@/lib/validations/student";

interface RouteContext {
  params: Promise<{ id: string }>;
}

function extractClientIp(request: Request): string {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "127.0.0.1";
}

async function getOrCreateStudentBatch(mrhla: string, requireExisting = false) {
  let batch = await StudentBatch.findOne({ mrhla });
  if (batch) return batch;

  const count = await Student.countDocuments({ mrhla });
  if (requireExisting && count === 0) {
    return null;
  }

  batch = await StudentBatch.create({
    mrhla,
    name: formatBatchName(mrhla),
    targetCount: count,
    arrivedCount: count,
    remainingCount: 0,
    classifications: [...DEFAULT_BATCH_CLASSIFICATIONS],
  });
  return batch;
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

    const batch = (await getOrCreateStudentBatch(mrhla, false))!;

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
    const clientIp = extractClientIp(request);

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

export async function PUT(request: Request, context: RouteContext) {
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
    const parsed = updateBatchClassificationSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0]?.message ?? "بيانات التصنيف غير صالحة" },
        { status: 400 }
      );
    }

    await connectToDatabase();

    const batch = await getOrCreateStudentBatch(mrhla, true);
    if (!batch) {
      return NextResponse.json(
        { success: false, error: "المرحلة غير موجودة" },
        { status: 404 }
      );
    }

    const { id: classId, name: newName, description } = parsed.data;

    const targetIndex = batch.classifications.findIndex(
      (c: IBatchClassification) => c.id === classId
    );
    if (targetIndex === -1) {
      return NextResponse.json(
        { success: false, error: "التصنيف غير موجود في هذه المرحلة" },
        { status: 404 }
      );
    }

    // Check duplicate name within the batch
    const duplicate = batch.classifications.some(
      (c: IBatchClassification) =>
        c.id !== classId && c.name.trim().toLowerCase() === newName.trim().toLowerCase()
    );
    if (duplicate) {
      return NextResponse.json(
        { success: false, error: "يوجد تصنيف آخر بنفس هذا المسمى في المرحلة" },
        { status: 400 }
      );
    }

    const oldName = batch.classifications[targetIndex].name;
    batch.classifications[targetIndex].name = newName.trim();
    if (description !== undefined) {
      batch.classifications[targetIndex].description = description.trim();
    }

    await batch.save();

    // Denormalized update on students
    if (oldName !== newName.trim()) {
      await Student.updateMany(
        { mrhla, classificationId: classId },
        { $set: { classificationName: newName.trim() } }
      );
    }

    const user = auth.user!;
    const clientIp = extractClientIp(request);

    await logAuditEvent({
      userId: user.id,
      userName: user.fullName,
      action: "UPDATE",
      module: "students",
      targetId: batch._id.toString(),
      description: `تعديل مسمى التصنيف التخصصي من (${oldName}) إلى (${newName.trim()}) لمرحلة ${mrhla}`,
      ipAddress: clientIp,
    });

    return NextResponse.json({
      success: true,
      message: "تم تعديل مسمى التصنيف بنجاح وتحديث بيانات الطلاب",
      data: batch.classifications,
    });
  } catch (error) {
    console.error("Error updating batch classification:", error);
    return NextResponse.json(
      { success: false, error: "حدث خطأ أثناء تعديل التصنيف" },
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

    const batch = await getOrCreateStudentBatch(mrhla, true);
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
    const clientIp = extractClientIp(request);

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
