import { NextResponse } from "next/server";
import { authenticate } from "@/lib/auth/middleware";
import { hasModuleAccess } from "@/lib/auth/rbac";
import { errors } from "@/lib/auth/errors";
import { connectToDatabase } from "@/lib/db/connect";
import { Student } from "@/lib/db/models/Student";
import { StudentBatch, DEFAULT_BATCH_CLASSIFICATIONS, formatBatchName } from "@/lib/db/models/StudentBatch";
import { parseMdbRecruitmentFile } from "@/lib/students/mdb-parser";
import { setActiveStudentStage } from "@/lib/students/settings";
import { logAuditEvent } from "@/lib/auth/audit";
import { importConfirmSchema } from "@/lib/validations/student";
import { safeMoveFile, cleanupStaleTempFiles } from "@/lib/students/temp-storage";
import path from "path";
import { access } from "fs/promises";
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
    const parsed = importConfirmSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0]?.message ?? "بيانات الطلب غير صالحة" },
        { status: 400 }
      );
    }

    const { fileId } = parsed.data;
    const tempFilePath = path.join(process.cwd(), "public", "uploads", "temp-mdb", fileId);

    // Verify temp file exists
    try {
      await access(tempFilePath);
    } catch {
      return NextResponse.json(
        { success: false, error: "الملف المؤقت غير موجود أو انتهت صلاحيته. يرجى إعادة رفع الملف." },
        { status: 404 }
      );
    }

    // Parse data
    const parseResult = await parseMdbRecruitmentFile(tempFilePath);

    await connectToDatabase();

    // Map disciplinary records by militaryNo
    const discMap = new Map<string, typeof parseResult.disciplinary>();
    for (const d of parseResult.disciplinary) {
      const existing = discMap.get(d.militaryNo) ?? [];
      existing.push(d);
      discMap.set(d.militaryNo, existing);
    }

    // Prepare atomic bulkWrite operations
    const bulkOps = [];
    const uniqueStages = new Set<string>();

    for (const s of parseResult.soldiers) {
      if (s.mrhla) uniqueStages.add(s.mrhla);
      const studentDisc = discMap.get(s.militaryNo) ?? [];

      const setOnInsert: Record<string, unknown> = {
        studentId: s.militaryNo,
        militaryNo: s.militaryNo,
        enrollDate: s.tagneedDate ?? new Date(),
        status: "active",
        locationStatus: "in_unit",
        distributionStatus: "unspecified",
        isStriken: false,
        shatbHistory: [],
        documents: [],
      };

      const setFields: Record<string, unknown> = {
        fullName: s.fullName,
        mrhla: s.mrhla,
        mrhlaName: s.mrhlaName,
        qualification: s.qualification,
      };

      if (s.nationalNo) setFields.nationalNo = s.nationalNo;
      if (s.solasyNo) setFields.solasyNo = s.solasyNo;
      if (s.birthDate) setFields.birthDate = s.birthDate;
      if (s.tagneedDate) setFields.tagneedDate = s.tagneedDate;
      if (s.tasrehDate) setFields.tasrehDate = s.tasrehDate;
      if (s.qualificationName) setFields.qualificationName = s.qualificationName;
      if (s.governorate) setFields.governorate = s.governorate;
      if (s.governorateCode !== undefined) setFields.governorateCode = s.governorateCode;
      if (s.recruitmentArea) setFields.recruitmentArea = s.recruitmentArea;
      if (s.address) setFields.address = s.address;
      if (s.bloodType) setFields.bloodType = s.bloodType;
      if (s.bloodTypeCode !== undefined) setFields.bloodTypeCode = s.bloodTypeCode;
      if (s.guardianName) setFields.guardianName = s.guardianName;
      if (s.guardianPhone) setFields.guardianPhone = s.guardianPhone;
      if (s.guardianRelation) setFields.guardianRelation = s.guardianRelation;

      // Update operation with $set and $setOnInsert
      const updateOp: Record<string, unknown> = {
        $set: setFields,
        $setOnInsert: setOnInsert,
      };

      // Disciplinary records handling: add only non-existing ones
      if (studentDisc.length > 0) {
        updateOp.$addToSet = {
          disciplinaryRecords: {
            $each: studentDisc.map((d) => ({
              type: d.type,
              startDate: d.startDate,
              endDate: d.endDate,
              totalDays: d.totalDays,
              source: "mdb_import",
            })),
          },
        };
      }

      bulkOps.push({
        updateOne: {
          filter: { militaryNo: s.militaryNo },
          update: updateOp,
          upsert: true,
        },
      });
    }

    const bulkResult = await Student.bulkWrite(bulkOps, { ordered: false });

    // Sync StudentBatch metadata for each stage found in this import
    for (const stg of uniqueStages) {
      const arrived = await Student.countDocuments({ mrhla: stg });
      const existingBatch = await StudentBatch.findOne({ mrhla: stg });
      const target =
        existingBatch?.targetCount && existingBatch.targetCount > 0
          ? existingBatch.targetCount
          : arrived;
      const remaining = Math.max(0, target - arrived);

      await StudentBatch.findOneAndUpdate(
        { mrhla: stg },
        {
          $set: {
            arrivedCount: arrived,
            targetCount: target,
            remainingCount: remaining,
            name: formatBatchName(stg),
          },
          $setOnInsert: {
            classifications: [...DEFAULT_BATCH_CLASSIFICATIONS],
            isActiveStage: false,
          },
        },
        { upsert: true }
      );
    }

    // Safely move file to permanent archive public/uploads/mdb-archives/
    const archiveDir = path.join(process.cwd(), "public", "uploads", "mdb-archives");
    try {
      await safeMoveFile(tempFilePath, archiveDir, fileId);
    } catch (mvErr) {
      console.warn("Could not archive MDB file:", mvErr);
    }

    // Clean up any remaining stale temporary files in the background
    cleanupStaleTempFiles(path.dirname(tempFilePath), 2).catch((err) => {
      console.warn("Error cleaning stale temp MDB files:", err);
    });

    // Auto-set active stage if none exists or higher stage detected
    const sortedStages = Array.from(uniqueStages).sort().reverse();
    if (sortedStages.length > 0) {
      const highestStage = sortedStages[0];
      await setActiveStudentStage(highestStage, auth.user!.id);
    }

    // Log Audit Event
    await logAuditEvent({
      userId: auth.user!.id,
      userName: auth.user!.username,
      action: "UPDATE",
      module: "students",
      targetId: new mongoose.Types.ObjectId().toString(),
      description: `استيراد ملف قاعدة بيانات أكسس (${fileId}) وتحديث ${parseResult.soldiers.length} طالباً (${bulkResult.upsertedCount} جديد، ${bulkResult.modifiedCount} محدث)`,
    });

    return NextResponse.json({
      success: true,
      message: `تم استيراد وتحديث بيانات ${parseResult.soldiers.length} طالباً بنجاح`,
      data: {
        total: parseResult.soldiers.length,
        inserted: bulkResult.upsertedCount,
        updated: bulkResult.modifiedCount,
        disciplinaryCount: parseResult.disciplinary.length,
      },
    });
  } catch (error) {
    console.error("Error confirming MDB import:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "فشل حفظ وتحديث بيانات الطلاب",
      },
      { status: 500 }
    );
  }
}
