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
import { hasModuleAccess } from "@/lib/auth/rbac";
import { formatMrhlaName } from "@/lib/students/settings";
import { getGovernorateByName } from "@/lib/students/mappings";
import type { Types } from "mongoose";

export async function GET(request: Request) {
  const auth = await authenticate();
  if (!auth.success) {
    return NextResponse.json(
      { success: false, error: auth.error },
      { status: auth.status },
    );
  }

  if (!hasModuleAccess(auth.user, "students", "view")) {
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

    const {
      page,
      limit,
      status,
      search,
      mrhla,
      classificationId,
      locationStatus,
      qualification,
      governorate,
      bloodType,
      distributionStatus,
    } = parsed.data;

    const query: Record<string, unknown> = {};

    // Default to active-only unless explicitly set
    if (status === "all") {
      // no status filter
    } else if (status) {
      query.status = status;
    } else {
      query.status = "active";
    }

    if (mrhla) {
      query.mrhla = mrhla;
    }

    if (classificationId) {
      query.classificationId = classificationId;
    }

    if (locationStatus && locationStatus !== "all") {
      query.locationStatus = locationStatus;
    }

    if (qualification) {
      query.qualification = qualification;
    }

    if (governorate) {
      query.governorate = governorate;
    }

    if (bloodType) {
      query.bloodType = bloodType;
    }

    if (distributionStatus) {
      query.distributionStatus = distributionStatus;
    }

    const trimmedSearch = search?.trim();
    if (trimmedSearch && trimmedSearch.length >= 2) {
      const escapedSearch = escapeRegex(trimmedSearch);
      const searchRegex = { $regex: escapedSearch, $options: "i" };
      const matchedGov = getGovernorateByName(trimmedSearch);
      const orConditions: Array<Record<string, unknown>> = [
        { militaryNo: searchRegex },
        { studentId: searchRegex },
        { fullName: searchRegex },
        { nationalNo: searchRegex },
        { governorate: searchRegex },
        { recruitmentArea: searchRegex },
      ];
      if (matchedGov) {
        orConditions.push({ governorateCode: matchedGov.code });
        orConditions.push({ governorate: matchedGov.name });
      }
      query.$or = orConditions;
    }

    const skip = (page - 1) * limit;

    const [students, total] = await Promise.all([
      Student.find(query)
        .sort({ militaryNo: 1, createdAt: -1 })
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
      militaryNo: s.militaryNo || s.studentId,
      fullName: s.fullName,
      mrhla: s.mrhla || "",
      mrhlaName: s.mrhlaName || (s.mrhla ? formatMrhlaName(s.mrhla) : ""),
      nationalNo: s.nationalNo,
      solasyNo: s.solasyNo,
      birthDate: s.birthDate ? (s.birthDate as Date).toISOString() : undefined,
      tagneedDate: s.tagneedDate ? (s.tagneedDate as Date).toISOString() : undefined,
      tasrehDate: s.tasrehDate ? (s.tasrehDate as Date).toISOString() : undefined,
      qualification: s.qualification,
      qualificationName: s.qualificationName,
      classificationId: s.classificationId,
      classificationName: s.classificationName,
      locationStatus: s.locationStatus || "in_unit",
      relocationDetails: s.relocationDetails
        ? {
            destination: s.relocationDetails.destination,
            date: s.relocationDetails.date ? (s.relocationDetails.date as Date).toISOString() : "",
            orderNo: s.relocationDetails.orderNo,
            reason: s.relocationDetails.reason,
            relocatedAt: s.relocationDetails.relocatedAt
              ? (s.relocationDetails.relocatedAt as Date).toISOString()
              : undefined,
          }
        : undefined,
      unitPersonnelDetails: s.unitPersonnelDetails
        ? {
            transferDate: s.unitPersonnelDetails.transferDate
              ? (s.unitPersonnelDetails.transferDate as Date).toISOString()
              : "",
            orderNo: s.unitPersonnelDetails.orderNo,
            assignedRole: s.unitPersonnelDetails.assignedRole,
            transferredAt: s.unitPersonnelDetails.transferredAt
              ? (s.unitPersonnelDetails.transferredAt as Date).toISOString()
              : undefined,
          }
        : undefined,
      governorate: s.governorate,
      governorateCode: s.governorateCode,
      recruitmentArea: s.recruitmentArea,
      address: s.address,
      bloodType: s.bloodType,
      bloodTypeCode: s.bloodTypeCode,
      enrollDate: s.enrollDate ? (s.enrollDate as Date).toISOString() : undefined,
      status: s.status,
      distributionStatus: s.distributionStatus || "unspecified",
      distributionSetAt: s.distributionSetAt ? (s.distributionSetAt as Date).toISOString() : undefined,
      isStriken: Boolean(s.isStriken),
      shatbDate: s.shatbDate ? (s.shatbDate as Date).toISOString() : undefined,
      shatbOrderNo: s.shatbOrderNo,
      shatbReason: s.shatbReason,
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

  if (!hasModuleAccess(auth.user, "students", "edit")) {
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
