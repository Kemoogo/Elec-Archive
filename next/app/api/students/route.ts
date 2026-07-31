import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db/connect";
import { authenticate } from "@/lib/auth/middleware";
import { logAuditEvent } from "@/lib/auth/audit";
import { errors } from "@/lib/auth/errors";
import { handleApiError } from "@/lib/utils/api-error";
import { Student } from "@/lib/db/models/Student";
import { studentsListQuerySchema, createStudentSchema } from "@/lib/validations/student";
import { escapeRegex } from "@/lib/utils";
import { checkApiRateLimit, rateLimitErrorResponse } from "@/lib/security/rate-limit";
import type { Types } from "mongoose";

export async function GET(request: Request) {
  const auth = await authenticate();
  if (!auth.success) {
    return NextResponse.json(
      { success: false, error: auth.error },
      { status: auth.status },
    );
  }

  const studentsPermission = auth.user!.permissions.students;
  if (studentsPermission === "none") {
    return NextResponse.json(
      { success: false, error: errors.insufficientPermissions },
      { status: 403 },
    );
  }

  const ip = request.headers.get("x-forwarded-for") ?? "";
  const rl = checkApiRateLimit(auth.user!.id, ip, "read");
  if (!rl.allowed) {
    return NextResponse.json(rateLimitErrorResponse(rl.resetAt), { status: 429 });
  }

  try {
    await connectToDatabase();

    const { searchParams } = new URL(request.url);
    const params = Object.fromEntries(searchParams.entries());

    const parsed = studentsListQuerySchema.safeParse(params);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: errors.validationFailed, details: parsed.error.issues },
        { status: 400 },
      );
    }

    const { page, limit, status, search } = parsed.data;

    const query: Record<string, unknown> = {};

    // Default to active-only unless explicitly set
    if (status === "all") {
      // no filter
    } else if (status) {
      query.status = status;
    } else {
      query.status = "active";
    }

    if (search) {
      const escapedSearch = escapeRegex(search);
      const searchRegex = { $regex: escapedSearch, $options: "i" };
      query.$or = [{ studentId: searchRegex }, { fullName: searchRegex }];
    }

    const skip = (page - 1) * limit;

    const [students, total] = await Promise.all([
      Student.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Student.countDocuments(query),
    ]);

    await logAuditEvent({
      userId: auth.user!.id,
      userName: auth.user!.fullName,
      action: "VIEW",
      module: "students",
      description: `عرض قائمة الطلبة (صفحة ${page})`,
      ipAddress: ip,
    });

    const serialized = students.map((s) => ({
      _id: (s._id as Types.ObjectId).toString(),
      studentId: s.studentId,
      fullName: s.fullName,
      enrollDate: (s.enrollDate as Date).toISOString(),
      status: s.status,
      documents: (s.documents as { name: string; fileUrl: string; uploadedAt: Date }[]).map((d) => ({
        name: d.name,
        fileUrl: d.fileUrl,
        uploadedAt: d.uploadedAt.toISOString(),
      })),
      notes: s.notes,
      createdAt: (s.createdAt as Date).toISOString(),
      updatedAt: (s.updatedAt as Date).toISOString(),
    }));

    const totalPages = Math.max(1, Math.ceil(total / limit));

    return NextResponse.json({
      success: true,
      data: {
        items: serialized,
        total,
        page,
        totalPages,
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: Request) {
  const auth = await authenticate();
  if (!auth.success) {
    return NextResponse.json(
      { success: false, error: auth.error },
      { status: auth.status },
    );
  }

  if (auth.user!.permissions.students !== "edit") {
    return NextResponse.json(
      { success: false, error: errors.insufficientPermissions },
      { status: 403 },
    );
  }

  const ip = request.headers.get("x-forwarded-for") ?? "";
  const rl = checkApiRateLimit(auth.user!.id, ip, "write");
  if (!rl.allowed) {
    return NextResponse.json(rateLimitErrorResponse(rl.resetAt), { status: 429 });
  }

  try {
    await connectToDatabase();
    const body = await request.json();
    const parsed = createStudentSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: errors.validationFailed, details: parsed.error.issues },
        { status: 400 },
      );
    }

    const { studentId, fullName, enrollDate, notes } = parsed.data;

    const existing = await Student.findOne({ studentId: studentId.trim() });
    if (existing) {
      return NextResponse.json(
        { success: false, error: "رقم الطالب موجود مسبقاً" },
        { status: 409 },
      );
    }

    const student = await Student.create({
      studentId: studentId.trim(),
      fullName: fullName.trim(),
      enrollDate: new Date(enrollDate),
      status: "active",
      notes: notes?.trim(),
    });

    await logAuditEvent({
      userId: auth.user!.id,
      userName: auth.user!.fullName,
      action: "CREATE",
      module: "students",
      targetId: student._id.toString(),
      description: `تم إنشاء طالب جديد: ${fullName} (${studentId})`,
      ipAddress: ip,
    });

    return NextResponse.json(
      {
        success: true,
        data: {
          _id: student._id.toString(),
          studentId: student.studentId,
          fullName: student.fullName,
          enrollDate: student.enrollDate.toISOString(),
          status: student.status,
          documents: [],
          notes: student.notes,
          createdAt: student.createdAt.toISOString(),
          updatedAt: student.updatedAt.toISOString(),
        },
      },
      { status: 201 },
    );
  } catch (error) {
    if (
      error instanceof Error &&
      "code" in error &&
      (error as { code: number }).code === 11000
    ) {
      return NextResponse.json(
        { success: false, error: "رقم الطالب موجود مسبقاً" },
        { status: 409 },
      );
    }

    return handleApiError(error);
  }
}
