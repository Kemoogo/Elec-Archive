import { NextResponse } from "next/server";
import { authenticate } from "@/lib/auth/middleware";
import { hasModuleAccess } from "@/lib/auth/rbac";
import { errors } from "@/lib/auth/errors";
import { getActiveStudentStage, setActiveStudentStage, formatMrhlaName } from "@/lib/students/settings";
import { logAuditEvent } from "@/lib/auth/audit";
import { activeStageSchema } from "@/lib/validations/student";

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
    const parsed = activeStageSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0]?.message ?? "بيانات الطلب غير صالحة" },
        { status: 400 }
      );
    }

    const { mrhla } = parsed.data;
    const user = auth.user!;
    const prevStage = await getActiveStudentStage();

    await setActiveStudentStage(mrhla, user.id);

    await logAuditEvent({
      userId: user.id,
      userName: user.fullName,
      action: "UPDATE",
      module: "students",
      targetId: user.id,
      description: `تغيير المرحلة الحالية للطلبة من ${prevStage.name || prevStage.mrhla || "لا يوجد"} إلى ${formatMrhlaName(mrhla)}`,
    });

    return NextResponse.json({
      success: true,
      message: `تم اعتماد ${formatMrhlaName(mrhla)} كمرحلة حالية بنجاح`,
      data: {
        mrhla,
        name: formatMrhlaName(mrhla),
      },
    });
  } catch (error) {
    console.error("Error setting active student stage:", error);
    return NextResponse.json(
      { success: false, error: "فشل تحديث المرحلة الحالية" },
      { status: 500 }
    );
  }
}
