import { NextResponse } from "next/server";
import { authenticate } from "@/lib/auth/middleware";
import { hasModuleAccess } from "@/lib/auth/rbac";
import { errors } from "@/lib/auth/errors";
import { connectToDatabase } from "@/lib/db/connect";
import { Student } from "@/lib/db/models/Student";
import { parseMdbRecruitmentFile } from "@/lib/students/mdb-parser";
import { cleanupStaleTempFiles } from "@/lib/students/temp-storage";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import crypto from "crypto";
import type { IStudentPreviewRow, IMdbPreviewData } from "@/types/student";

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
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json(
        { success: false, error: "يرجى تحديد ملف قاعدة البيانات (.mdb)" },
        { status: 400 }
      );
    }

    const fileName = file.name;
    if (!fileName.toLowerCase().endsWith(".mdb")) {
      return NextResponse.json(
        { success: false, error: "صيغة الملف غير مدعومة: يجب رفع ملف قاعدة بيانات أكسس بامتداد .mdb" },
        { status: 400 }
      );
    }

    // Save temporarily in public/uploads/temp-mdb/
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const tempDir = path.join(process.cwd(), "public", "uploads", "temp-mdb");
    await mkdir(tempDir, { recursive: true });

    // Clean up any stale temp files older than 2 hours in the background
    cleanupStaleTempFiles(tempDir, 2).catch((err) => {
      console.warn("Error cleaning stale temp MDB files:", err);
    });

    const uniqueId = `mdb-${Date.now()}-${crypto.randomBytes(4).toString("hex")}.mdb`;
    const tempFilePath = path.join(tempDir, uniqueId);
    await writeFile(tempFilePath, buffer);

    // Parse MDB tables
    const parseResult = await parseMdbRecruitmentFile(tempFilePath);

    // Query existing students to calculate new vs update
    await connectToDatabase();
    const parsedMilNos = parseResult.soldiers.map((s) => s.militaryNo);
    const existingStudents = await Student.find(
      { militaryNo: { $in: parsedMilNos } },
      { militaryNo: 1 }
    ).lean();

    const existingSet = new Set(existingStudents.map((s) => s.militaryNo));

    let newCount = 0;
    let updateCount = 0;
    const stagesMap = new Map<string, { mrhla: string; name: string; count: number }>();
    const previewRows: IStudentPreviewRow[] = [];

    for (let i = 0; i < parseResult.soldiers.length; i++) {
      const s = parseResult.soldiers[i];
      const isNew = !existingSet.has(s.militaryNo);
      if (isNew) {
        newCount++;
      } else {
        updateCount++;
      }

      // Stage aggregation
      const existingStage = stagesMap.get(s.mrhla);
      if (existingStage) {
        existingStage.count++;
      } else {
        stagesMap.set(s.mrhla, {
          mrhla: s.mrhla,
          name: s.mrhlaName,
          count: 1,
        });
      }

      // Collect first 25 preview rows
      if (previewRows.length < 25) {
        previewRows.push({
          militaryNo: s.militaryNo,
          fullName: s.fullName,
          mrhla: s.mrhla,
          qualification: s.qualification,
          qualificationName: s.qualificationName,
          governorate: s.governorate,
          governorateCode: s.governorateCode,
          recruitmentArea: s.recruitmentArea,
          bloodType: s.bloodType,
          bloodTypeCode: s.bloodTypeCode,
          isNew,
        });
      }
    }

    const responseData: IMdbPreviewData = {
      fileId: uniqueId,
      fileName,
      totalRecords: parseResult.soldiers.length,
      stages: Array.from(stagesMap.values()),
      newCount,
      updateCount,
      excludedCount: parseResult.duplicateCount,
      warningsCount: parseResult.warnings.length,
      disciplinaryCount: parseResult.disciplinary.length,
      previewRows,
    };

    return NextResponse.json({
      success: true,
      data: responseData,
    });
  } catch (error) {
    console.error("Error parsing uploaded MDB file:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "فشل تحليل ملف قاعدة البيانات",
      },
      { status: 500 }
    );
  }
}
