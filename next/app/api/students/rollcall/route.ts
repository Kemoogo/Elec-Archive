import { NextResponse } from "next/server";
import { authenticate } from "@/lib/auth/middleware";
import { hasModuleAccess } from "@/lib/auth/rbac";
import { errors } from "@/lib/auth/errors";
import { connectToDatabase } from "@/lib/db/connect";
import { Student } from "@/lib/db/models/Student";
import { StudentRollcall } from "@/lib/db/models/StudentRollcall";
import { getActiveStudentStage, formatMrhlaName } from "@/lib/students/settings";
import { logAuditEvent } from "@/lib/auth/audit";
import { saveRollcallSchema } from "@/lib/validations/student";
import type { StudentAttendanceStatus } from "@/lib/db/models/StudentRollcall.shared";
import type { IStudentRollcallEntryDoc } from "@/lib/db/models/StudentRollcall";
import type { IDisciplinaryRecord } from "@/lib/db/models/Student.shared";
import mongoose from "mongoose";

const PRESENT_STATUSES = new Set<StudentAttendanceStatus>(["present", "duty_service", "clinic"]);
const OUT_OFFICIAL_STATUSES = new Set<StudentAttendanceStatus>([
  "leave",
  "sick_leave",
  "rest",
  "hospital",
  "police_academy_exam",
  "military_academy_exam",
  "mission",
]);
const OUT_DISCIPLINARY_STATUSES = new Set<StudentAttendanceStatus>(["absent", "prison", "court"]);

function computeRollcallCounts(entries: Array<{ status: string }>) {
  let presentCount = 0;
  let outOfficialCount = 0;
  let outDisciplinaryCount = 0;

  for (const entry of entries) {
    const s = entry.status as StudentAttendanceStatus;
    if (PRESENT_STATUSES.has(s)) {
      presentCount++;
    } else if (OUT_OFFICIAL_STATUSES.has(s)) {
      outOfficialCount++;
    } else if (OUT_DISCIPLINARY_STATUSES.has(s)) {
      outDisciplinaryCount++;
    }
  }

  return {
    totalStrength: entries.length,
    presentCount,
    outOfficialCount,
    outDisciplinaryCount,
  };
}

export function isPastRollcallCutoff(dateStr: string): boolean {
  const [y, m, d] = dateStr.split("-").map(Number);
  const cutoff = new Date(y, m - 1, d, 6, 0, 0); // 06:00 AM local time
  return new Date() >= cutoff;
}

export function getTomorrowIsoDate(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().split("T")[0];
}

export async function GET(request: Request) {
  const auth = await authenticate();
  if (!auth.success) {
    return NextResponse.json(
      { success: false, error: auth.error },
      { status: auth.status }
    );
  }

  if (!hasModuleAccess(auth.user, "students", "view")) {
    return NextResponse.json(
      { success: false, error: errors.insufficientPermissions },
      { status: 403 }
    );
  }

  try {
    await connectToDatabase();
    const { searchParams } = new URL(request.url);

    let dateStr = searchParams.get("date");
    if (!dateStr) {
      dateStr = getTomorrowIsoDate();
    }

    let mrhla = searchParams.get("mrhla");
    if (!mrhla) {
      const activeStage = await getActiveStudentStage();
      mrhla = activeStage.mrhla;
    }

    if (!mrhla) {
      return NextResponse.json({
        success: false,
        error: "لا توجد مرحلة تجنيدية مسجلة في المنظومة",
      }, { status: 400 });
    }

    const targetDateStart = new Date(`${dateStr}T00:00:00.000Z`);
    const targetDateEnd = new Date(`${dateStr}T23:59:59.999Z`);

    const existingRollcall = await StudentRollcall.findOne({
      date: { $gte: targetDateStart, $lte: targetDateEnd },
      mrhla,
    }).lean();

    const isPastSixAm = isPastRollcallCutoff(dateStr);
    const isAdmin = auth.user!.role === "admin";
    const canEdit = hasModuleAccess(auth.user, "students", "edit");

    if (existingRollcall) {
      let effectiveStatus = existingRollcall.status;
      if (effectiveStatus === "approved" && isPastSixAm) {
        effectiveStatus = "closed";
      }

      return NextResponse.json({
        success: true,
        data: {
          rollcall: {
            ...existingRollcall,
            _id: existingRollcall._id.toString(),
            status: effectiveStatus,
            date: dateStr,
            entries: existingRollcall.entries.map((e: IStudentRollcallEntryDoc) => ({
              studentId: e.studentId.toString(),
              militaryNo: e.militaryNo,
              fullName: e.fullName,
              status: e.status,
              notes: e.notes,
              destination: e.destination,
              expectedReturnDate: e.expectedReturnDate
                ? (e.expectedReturnDate as Date).toISOString().split("T")[0]
                : undefined,
              isOngoingDisciplinary: e.isOngoingDisciplinary,
            })),
          },
          isGeneratedDraft: false,
          isPastSixAm,
          canEdit: isAdmin || (!isPastSixAm && canEdit && effectiveStatus !== "closed"),
          canReopen: isAdmin || (!isPastSixAm && canEdit && effectiveStatus === "approved"),
        },
      });
    }

    // Generate draft from active, in-unit students (exclude relocated & personnel transferred)
    const activeStudents = await Student.find({
      mrhla,
      status: "active",
      isStriken: { $ne: true },
      locationStatus: { $nin: ["relocated", "transferred_to_unit_personnel"] },
    })
      .sort({ militaryNo: 1 })
      .lean();

    const targetDate = new Date(`${dateStr}T00:00:00.000Z`);

    const draftEntries = activeStudents.map((s) => {
      let status: StudentAttendanceStatus = "present";
      let isOngoingDisciplinary = false;
      let notes = "";

      // Check ongoing disciplinary records
      if (s.disciplinaryRecords && s.disciplinaryRecords.length > 0) {
        const activeRecord = s.disciplinaryRecords.find((r: IDisciplinaryRecord) => {
          const start = new Date(r.startDate);
          const end = r.endDate ? new Date(r.endDate) : null;
          return start <= targetDate && (!end || end >= targetDate);
        });

        if (activeRecord) {
          status = activeRecord.type === "absence" ? "absent" : "prison";
          isOngoingDisciplinary = true;
          notes = activeRecord.notes || (activeRecord.type === "absence" ? "غياب مستمر من واقع ملف Access" : "حبس مستمر من واقع ملف Access");
        }
      }

      return {
        studentId: s._id.toString(),
        militaryNo: s.militaryNo || s.studentId,
        fullName: s.fullName,
        status,
        notes,
        destination: "",
        expectedReturnDate: undefined,
        isOngoingDisciplinary,
      };
    });

    const counts = computeRollcallCounts(draftEntries);

    return NextResponse.json({
      success: true,
      data: {
        rollcall: {
          date: dateStr,
          mrhla,
          status: "draft",
          ...counts,
          entries: draftEntries,
        },
        isGeneratedDraft: true,
        isPastSixAm,
        canEdit: isAdmin || (!isPastSixAm && canEdit),
        canReopen: false,
      },
    });
  } catch (error) {
    console.error("Error fetching rollcall:", error);
    return NextResponse.json(
      { success: false, error: "فشل استرجاع بيانات التمام اليومي للطلبة" },
      { status: 500 }
    );
  }
}

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
    const parsed = saveRollcallSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0]?.message ?? "بيانات التمام غير صالحة" },
        { status: 400 }
      );
    }

    const { date: dateStr, mrhla, action, entries, overrideReason } = parsed.data;
    const isPastSixAm = isPastRollcallCutoff(dateStr);
    const isAdmin = auth.user!.role === "admin";
    const user = auth.user!;

    // Check 06:00 AM cutoff enforcement
    if (isPastSixAm && !isAdmin) {
      return NextResponse.json(
        {
          success: false,
          error: "تم إغلاق التمام نهائياً عند الساعة 06:00 صباحاً. التعديل وإعادة الفتح متاح فقط لمدير النظام بتصديق استثنائي.",
        },
        { status: 403 }
      );
    }

    if (isPastSixAm && isAdmin && (!overrideReason || overrideReason.trim().length < 3)) {
      return NextResponse.json(
        {
          success: false,
          error: "يجب تسجيل سبب التعديل الاستثنائي بعد الساعة 06:00 صباحاً لتوثيقه بسجل التدقيق.",
        },
        { status: 400 }
      );
    }

    await connectToDatabase();
    const targetDateStart = new Date(`${dateStr}T00:00:00.000Z`);
    const targetDateEnd = new Date(`${dateStr}T23:59:59.999Z`);

    const existingRollcall = await StudentRollcall.findOne({
      date: { $gte: targetDateStart, $lte: targetDateEnd },
      mrhla,
    });

    const counts = computeRollcallCounts(entries);

    const docEntries = entries.map((e) => ({
      studentId: new mongoose.Types.ObjectId(e.studentId),
      militaryNo: e.militaryNo,
      fullName: e.fullName,
      status: e.status,
      notes: e.notes || undefined,
      destination: e.destination || undefined,
      expectedReturnDate: e.expectedReturnDate ? new Date(e.expectedReturnDate) : undefined,
      isOngoingDisciplinary: Boolean(e.isOngoingDisciplinary),
    }));

    let updatedDoc;

    if (action === "reopen") {
      if (!existingRollcall) {
        return NextResponse.json(
          { success: false, error: "لا يوجد تمام مسجل لإعادة فتحه" },
          { status: 404 }
        );
      }

      existingRollcall.status = "draft";
      existingRollcall.reopenHistory.push({
        reopenedBy: new mongoose.Types.ObjectId(user.id),
        reopenedAt: new Date(),
        reason: overrideReason || "إعادة فتح بطلب المشرف",
      });

      if (overrideReason && isAdmin) {
        existingRollcall.overrideNotes = overrideReason;
        existingRollcall.overrideBy = new mongoose.Types.ObjectId(user.id);
      }

      await existingRollcall.save();
      updatedDoc = existingRollcall;

      await logAuditEvent({
        userId: user.id,
        userName: user.fullName,
        action: "UPDATE",
        module: "students",
        targetId: existingRollcall._id.toString(),
        description: `إعادة فتح تمام الطلبة لتاريخ ${dateStr} دفعة ${formatMrhlaName(mrhla)} ${overrideReason ? `(السبب: ${overrideReason})` : ""}`,
      });

      return NextResponse.json({
        success: true,
        message: "تم إعادة فتح التمام للتعديل بنجاح",
        data: {
          rollcallId: updatedDoc._id.toString(),
          status: "draft",
        },
      });
    }

    const newStatus = action === "approve" ? "approved" : "draft";

    if (existingRollcall) {
      existingRollcall.status = newStatus;
      existingRollcall.totalStrength = counts.totalStrength;
      existingRollcall.presentCount = counts.presentCount;
      existingRollcall.outOfficialCount = counts.outOfficialCount;
      existingRollcall.outDisciplinaryCount = counts.outDisciplinaryCount;
      existingRollcall.entries = docEntries;

      if (action === "approve") {
        existingRollcall.approvedBy = new mongoose.Types.ObjectId(user.id);
        existingRollcall.approvedAt = new Date();
      }

      if (overrideReason) {
        existingRollcall.overrideNotes = overrideReason;
        existingRollcall.overrideBy = new mongoose.Types.ObjectId(user.id);
      }

      await existingRollcall.save();
      updatedDoc = existingRollcall;
    } else {
      updatedDoc = await StudentRollcall.create({
        date: targetDateStart,
        mrhla,
        status: newStatus,
        ...counts,
        entries: docEntries,
        preparedBy: new mongoose.Types.ObjectId(user.id),
        approvedBy: action === "approve" ? new mongoose.Types.ObjectId(user.id) : undefined,
        approvedAt: action === "approve" ? new Date() : undefined,
        overrideNotes: overrideReason || undefined,
        overrideBy: overrideReason ? new mongoose.Types.ObjectId(user.id) : undefined,
        reopenHistory: [],
      });
    }

    await logAuditEvent({
      userId: user.id,
      userName: user.fullName,
      action: action === "approve" ? "UPDATE" : "CREATE",
      module: "students",
      targetId: updatedDoc._id.toString(),
      description: `${action === "approve" ? "اعتماد" : "حفظ مسودة"} تمام الطلبة لتاريخ ${dateStr} دفعة ${formatMrhlaName(mrhla)} (قوة ${counts.totalStrength} - موجود ${counts.presentCount})`,
    });

    return NextResponse.json({
      success: true,
      message: action === "approve" ? "تم اعتماد التمام بنجاح" : "تم حفظ مسودة التمام بنجاح",
      data: {
        rollcallId: updatedDoc._id.toString(),
        status: updatedDoc.status,
        counts,
      },
    });
  } catch (error) {
    console.error("Error saving student rollcall:", error);
    return NextResponse.json(
      { success: false, error: "فشل حفظ التمام اليومي" },
      { status: 500 }
    );
  }
}
