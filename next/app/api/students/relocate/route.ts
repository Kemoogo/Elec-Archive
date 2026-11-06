import { NextResponse } from "next/server";
import { authenticate } from "@/lib/auth/middleware";
import { hasModuleAccess } from "@/lib/auth/rbac";
import { errors } from "@/lib/auth/errors";
import { connectToDatabase } from "@/lib/db/connect";
import { Student } from "@/lib/db/models/Student";
import { logAuditEvent } from "@/lib/auth/audit";
import { relocateStudentsSchema } from "@/lib/validations/student";
import mongoose from "mongoose";

export async function POST(request: Request) {
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
    const body = await request.json();
    const parsed = relocateStudentsSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0]?.message ?? "بيانات الترحيل غير صالحة" },
        { status: 400 }
      );
    }

    const { mrhla, classificationId, studentIds, destination, date, orderNo, reason } = parsed.data;

    await connectToDatabase();

    const query: Record<string, unknown> = { mrhla };

    if (studentIds && studentIds.length > 0) {
      const objectIds = studentIds
        .filter((id) => mongoose.Types.ObjectId.isValid(id))
        .map((id) => new mongoose.Types.ObjectId(id));
      query._id = { $in: objectIds };
    } else if (classificationId) {
      query.classificationId = classificationId;
    }

    // Only relocate soldiers who are currently in_unit or without a destination
    const studentsToRelocate = await Student.find(query).select("_id fullName militaryNo").lean();

    if (studentsToRelocate.length === 0) {
      return NextResponse.json(
        { success: false, error: "لم يتم العثور على أي جنود مطابقين للتحديد" },
        { status: 404 }
      );
    }

    const relocationDate = new Date(date);
    const user = auth.user!;
    const userObjId = mongoose.Types.ObjectId.isValid(user.id)
      ? new mongoose.Types.ObjectId(user.id)
      : undefined;

    const updatePayload = {
      locationStatus: "relocated",
      relocationDetails: {
        destination,
        date: relocationDate,
        orderNo,
        reason: reason || undefined,
        relocatedBy: userObjId,
        relocatedAt: new Date(),
      },
    };

    const targetIds = studentsToRelocate.map((s) => s._id);
    const updateResult = await Student.updateMany(
      { _id: { $in: targetIds } },
      { $set: updatePayload }
    );

    const clientIp = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "127.0.0.1";

    await logAuditEvent({
      userId: user.id,
      userName: user.fullName,
      action: "UPDATE",
      module: "students",
      targetId: targetIds[0].toString(),
      description: `ترحيل ${updateResult.modifiedCount} جندي من مرحلة ${mrhla} إلى جهة: ${destination} برقم أمر: ${orderNo}`,
      ipAddress: clientIp,
    });

    return NextResponse.json({
      success: true,
      message: `تم ترحيل ${updateResult.modifiedCount} جندي إلى ${destination} بنجاح`,
      count: updateResult.modifiedCount,
    });
  } catch (error) {
    console.error("Relocation error:", error);
    return NextResponse.json(
      { success: false, error: "حدث خطأ أثناء معالجة ترحيل الجنود" },
      { status: 500 }
    );
  }
}
