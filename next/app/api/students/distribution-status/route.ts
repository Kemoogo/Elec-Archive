import { NextResponse } from "next/server";
import { authenticate } from "@/lib/auth/middleware";
import { hasModuleAccess } from "@/lib/auth/rbac";
import { errors } from "@/lib/auth/errors";
import { connectToDatabase } from "@/lib/db/connect";
import { Student } from "@/lib/db/models/Student";
import { logAuditEvent } from "@/lib/auth/audit";
import { updateDistributionStatusSchema } from "@/lib/validations/student";
import type { DistributionStatus } from "@/lib/db/models/Student.shared";
import mongoose from "mongoose";

const DISTRIBUTION_STATUS_LABELS: Record<DistributionStatus, string> = {
  stage_remnants: "متبقيات المرحلة",
  halt_transfer: "إيقاف ترحيل",
  distributed_to_unit: "تم التوزيع على الوحدة",
  without_distribution: "بدون توزيعة",
  unspecified: "غير محدد",
};

export async function PATCH(request: Request) {
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
    const parsed = updateDistributionStatusSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0]?.message ?? "بيانات الطلب غير صالحة" },
        { status: 400 }
      );
    }

    const { studentIds, distributionStatus } = parsed.data;
    const user = auth.user!;

    await connectToDatabase();

    const objectIds = studentIds
      .filter((id) => mongoose.Types.ObjectId.isValid(id))
      .map((id) => new mongoose.Types.ObjectId(id));

    if (objectIds.length === 0) {
      return NextResponse.json(
        { success: false, error: "معرفات الطلاب غير صالحة" },
        { status: 400 }
      );
    }

    const result = await Student.updateMany(
      { _id: { $in: objectIds } },
      {
        $set: {
          distributionStatus,
          distributionSetAt: new Date(),
          distributionSetBy: new mongoose.Types.ObjectId(user.id),
        },
      }
    );

    const statusLabel =
      DISTRIBUTION_STATUS_LABELS[distributionStatus as DistributionStatus] || distributionStatus;

    await logAuditEvent({
      userId: user.id,
      userName: user.fullName,
      action: "UPDATE",
      module: "students",
      targetId: objectIds[0].toString(),
      description: `تحديث حالة التوزيع إلى "${statusLabel}" لعدد ${result.modifiedCount} طالب بأرشيف المراحل السابقة`,
    });

    return NextResponse.json({
      success: true,
      message: `تم تحديث حالة التوزيع لعدد ${result.modifiedCount} طالب بنجاح`,
      data: {
        updatedCount: result.modifiedCount,
        distributionStatus,
      },
    });
  } catch (error) {
    console.error("Error updating distribution status:", error);
    return NextResponse.json(
      { success: false, error: "فشل تحديث حالة التوزيع" },
      { status: 500 }
    );
  }
}
