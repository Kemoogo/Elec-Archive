import { NextResponse } from "next/server";
import { authenticate } from "@/lib/auth/middleware";
import { hasModuleAccess } from "@/lib/auth/rbac";
import { errors } from "@/lib/auth/errors";
import { connectToDatabase } from "@/lib/db/connect";
import { Student } from "@/lib/db/models/Student";
import { logAuditEvent } from "@/lib/auth/audit";
import { transferToPersonnelSchema } from "@/lib/validations/student";
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
    const parsed = transferToPersonnelSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0]?.message ?? "بيانات النقل لقوة الأفراد غير صالحة" },
        { status: 400 }
      );
    }

    const { mrhla, studentIds, transferDate, orderNo, assignedRole } = parsed.data;

    await connectToDatabase();

    const objectIds = studentIds
      .filter((id) => mongoose.Types.ObjectId.isValid(id))
      .map((id) => new mongoose.Types.ObjectId(id));

    if (objectIds.length === 0) {
      return NextResponse.json(
        { success: false, error: "لم يتم تحديد أي جنود صالحين" },
        { status: 400 }
      );
    }

    const studentsToTransfer = await Student.find({
      _id: { $in: objectIds },
      mrhla,
    }).select("_id fullName militaryNo").lean();

    if (studentsToTransfer.length === 0) {
      return NextResponse.json(
        { success: false, error: "لم يتم العثور على أي جنود مطابقين للتحديد في هذه المرحلة" },
        { status: 404 }
      );
    }

    const transferDateTime = new Date(transferDate);
    const user = auth.user!;
    const userObjId = mongoose.Types.ObjectId.isValid(user.id)
      ? new mongoose.Types.ObjectId(user.id)
      : undefined;

    const updatePayload = {
      locationStatus: "transferred_to_unit_personnel",
      unitPersonnelDetails: {
        transferDate: transferDateTime,
        orderNo,
        assignedRole: assignedRole || undefined,
        transferredBy: userObjId,
        transferredAt: new Date(),
      },
    };

    const targetIds = studentsToTransfer.map((s) => s._id);
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
      description: `نقل ${updateResult.modifiedCount} جندي من مرحلة ${mrhla} إلى قوة أفراد الوحدة برقم أمر: ${orderNo}`,
      ipAddress: clientIp,
    });

    return NextResponse.json({
      success: true,
      message: `تم نقل وتسكين ${updateResult.modifiedCount} جندي على قوة أفراد الوحدة بنجاح`,
      count: updateResult.modifiedCount,
    });
  } catch (error) {
    console.error("Transfer to personnel error:", error);
    return NextResponse.json(
      { success: false, error: "حدث خطأ أثناء معالجة النقل لقوة الأفراد" },
      { status: 500 }
    );
  }
}
