import { NextResponse } from "next/server";
import { authenticate } from "@/lib/auth/middleware";
import { hasModuleAccess } from "@/lib/auth/rbac";
import { errors } from "@/lib/auth/errors";
import { connectToDatabase } from "@/lib/db/connect";
import { Student } from "@/lib/db/models/Student";
import { StudentBatch, DEFAULT_BATCH_CLASSIFICATIONS, formatBatchName } from "@/lib/db/models/StudentBatch";
import { logAuditEvent } from "@/lib/auth/audit";
import { updateBatchTargetSchema } from "@/lib/validations/student";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function PATCH(request: Request, context: RouteContext) {
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
    const parsed = updateBatchTargetSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0]?.message ?? "قيمة المقرر وصوله غير صالحة" },
        { status: 400 }
      );
    }

    await connectToDatabase();

    const arrivedCount = await Student.countDocuments({ mrhla });
    const targetCount = parsed.data.targetCount;
    const remainingCount = Math.max(0, targetCount - arrivedCount);

    const batch = await StudentBatch.findOneAndUpdate(
      { mrhla },
      {
        $set: {
          targetCount,
          arrivedCount,
          remainingCount,
          name: formatBatchName(mrhla),
        },
        $setOnInsert: {
          classifications: DEFAULT_BATCH_CLASSIFICATIONS,
          isActiveStage: false,
        },
      },
      { upsert: true, new: true }
    );

    const user = auth.user!;
    const clientIp = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "127.0.0.1";

    await logAuditEvent({
      userId: user.id,
      userName: user.fullName,
      action: "UPDATE",
      module: "students",
      targetId: batch._id.toString(),
      description: `تحديث القوة المقرر وصولها لمرحلة ${mrhla} لتصبح ${targetCount} جندي (المتبقي: ${remainingCount})`,
      ipAddress: clientIp,
    });

    return NextResponse.json({
      success: true,
      message: "تم تحديث المقرر وصوله بنجاح",
      data: {
        mrhla,
        targetCount,
        arrivedCount,
        remainingCount,
      },
    });
  } catch (error) {
    console.error("Error updating batch target count:", error);
    return NextResponse.json(
      { success: false, error: "حدث خطأ أثناء تحديث المقرر وصوله" },
      { status: 500 }
    );
  }
}
