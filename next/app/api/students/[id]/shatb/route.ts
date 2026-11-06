import { NextResponse } from "next/server";
import { authenticate } from "@/lib/auth/middleware";
import { hasModuleAccess } from "@/lib/auth/rbac";
import { errors } from "@/lib/auth/errors";
import { connectToDatabase } from "@/lib/db/connect";
import { Student } from "@/lib/db/models/Student";
import { logAuditEvent } from "@/lib/auth/audit";
import { shatbStudentSchema } from "@/lib/validations/student";
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
    const parsed = shatbStudentSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0]?.message ?? "بيانات الشطب غير صالحة" },
        { status: 400 }
      );
    }

    const { shatbDate, shatbOrderNo, shatbReason } = parsed.data;

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

    if (student.isStriken) {
      return NextResponse.json(
        { success: false, error: "الطالب مشطوب بالفعل ومضموم لقوة الأفراد" },
        { status: 400 }
      );
    }

    const user = auth.user!;
    const shatbDateTime = new Date(shatbDate);

    student.isStriken = true;
    student.status = "transferred_personnel";
    student.shatbDate = shatbDateTime;
    student.shatbOrderNo = shatbOrderNo;
    student.shatbReason = shatbReason;

    if (!student.shatbHistory) {
      student.shatbHistory = [];
    }

    student.shatbHistory.push({
      shatbDate: shatbDateTime,
      shatbOrderNo,
      shatbReason,
      strickenBy: new mongoose.Types.ObjectId(user.id),
      strickenAt: new Date(),
    });

    await student.save();

    await logAuditEvent({
      userId: user.id,
      userName: user.fullName,
      action: "UPDATE",
      module: "students",
      targetId: student._id.toString(),
      description: `شطب الطالب ${student.fullName} (رقم عسكري ${student.militaryNo || student.studentId}) وضمه لقوة أفراد الوحدة بأمر رقم ${shatbOrderNo}`,
    });

    return NextResponse.json({
      success: true,
      message: "تم شطب الطالب وضمه لقوة الأفراد بنجاح",
      data: {
        studentId: student._id.toString(),
        isStriken: true,
        status: "transferred_personnel",
      },
    });
  } catch (error) {
    console.error("Error executing student shatb:", error);
    return NextResponse.json(
      { success: false, error: "فشل تنفيذ إجراء الشطب" },
      { status: 500 }
    );
  }
}
