import { NextResponse } from "next/server";
import { authenticate } from "@/lib/auth/middleware";
import { hasModuleAccess } from "@/lib/auth/rbac";
import { errors } from "@/lib/auth/errors";
import { connectToDatabase } from "@/lib/db/connect";
import { Student } from "@/lib/db/models/Student";
import { logAuditEvent } from "@/lib/auth/audit";
import { shatbReverseSchema } from "@/lib/validations/student";
import mongoose from "mongoose";

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
    const { id } = await context.params;
    const body = await request.json();
    const parsed = shatbReverseSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0]?.message ?? "سبب إلغاء الشطب مطلوب" },
        { status: 400 }
      );
    }

    const { reversalReason } = parsed.data;

    await connectToDatabase();

    const query = mongoose.Types.ObjectId.isValid(id)
      ? { _id: id }
      : { studentId: id };

    const student = await Student.findOne(query);
    if (!student) {
      return NextResponse.json(
        { success: false, error: "الطالب غير موجود" },
        { status: 404 }
      );
    }

    if (!student.isStriken) {
      return NextResponse.json(
        { success: false, error: "الطالب غير مشطوب حالياً" },
        { status: 400 }
      );
    }

    const user = auth.user!;
    const isAdmin = user.role === "admin";

    // 24-hour time limit check for non-admin editors
    const latestHistory =
      student.shatbHistory && student.shatbHistory.length > 0
        ? student.shatbHistory[student.shatbHistory.length - 1]
        : null;

    const shatbTimestamp = latestHistory?.strickenAt
      ? new Date(latestHistory.strickenAt).getTime()
      : student.shatbDate
      ? new Date(student.shatbDate).getTime()
      : Date.now();

    const hoursElapsed = (Date.now() - shatbTimestamp) / (1000 * 60 * 60);

    if (hoursElapsed > 24 && !isAdmin) {
      return NextResponse.json(
        {
          success: false,
          error: "تجاوزت مهلة إلغاء الشطب المحددة بـ 24 ساعة. لا يمكن إلغاء الشطب إلا بتصديق مدير النظام.",
        },
        { status: 403 }
      );
    }

    // Update history record
    if (latestHistory) {
      latestHistory.reversalReason = reversalReason;
      latestHistory.reversedBy = new mongoose.Types.ObjectId(user.id);
      latestHistory.reversedAt = new Date();
    }

    // Restore student
    student.isStriken = false;
    student.status = "active";
    student.shatbDate = undefined;
    student.shatbOrderNo = undefined;
    student.shatbReason = undefined;

    await student.save();

    await logAuditEvent({
      userId: user.id,
      userName: user.fullName,
      action: "UPDATE",
      module: "students",
      targetId: student._id.toString(),
      description: `إلغاء شطب الطالب ${student.fullName} (رقم عسكري ${student.militaryNo || student.studentId}) وإعادته للقوة النشطة (السبب: ${reversalReason})`,
    });

    return NextResponse.json({
      success: true,
      message: "تم إلغاء شطب الطالب وإعادته للقوة بنجاح",
      data: {
        studentId: student._id.toString(),
        isStriken: false,
        status: "active",
      },
    });
  } catch (error) {
    console.error("Error reversing student shatb:", error);
    return NextResponse.json(
      { success: false, error: "فشل إلغاء إجراء الشطب" },
      { status: 500 }
    );
  }
}
