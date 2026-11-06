import { connectToDatabase } from "@/lib/db/connect";
import { Student } from "@/lib/db/models/Student";
import { StudentRollcall } from "@/lib/db/models/StudentRollcall";
import { StudentBatch, DEFAULT_BATCH_CLASSIFICATIONS } from "@/lib/db/models/StudentBatch";
import { getActiveStudentStage, formatMrhlaName } from "./settings";
import { mapGovernorate, mapBloodType } from "./mappings";
import type { IStudentsAnalyticsData } from "@/types/student";
import { formatQualificationLabel } from "@/types/student";

export async function getStudentsAnalytics(mrhlaInput?: string): Promise<IStudentsAnalyticsData> {
  await connectToDatabase();

  let mrhla = mrhlaInput;
  let mrhlaName = "";

  if (!mrhla) {
    const activeStage = await getActiveStudentStage();
    mrhla = activeStage.mrhla;
    mrhlaName = activeStage.name;
  } else {
    mrhlaName = formatMrhlaName(mrhla);
  }

  if (!mrhla) {
    return {
      mrhla: "",
      mrhlaName: "لا توجد مرحلة مسجلة",
      totalStrength: 0,
      targetCount: 0,
      arrivedCount: 0,
      remainingCount: 0,
      inUnitCount: 0,
      relocatedCount: 0,
      transferredPersonnelCount: 0,
      presentCount: 0,
      outOfficialCount: 0,
      outDisciplinaryCount: 0,
      attendanceRate: 0,
      strikenCount: 0,
      classificationsMatrix: [],
      qualifications: [],
      governorates: [],
      bloodTypes: [],
    };
  }

  // Find batch settings if any
  const batchDoc = await StudentBatch.findOne({ mrhla }).lean();
  const configuredClassifications =
    batchDoc?.classifications && batchDoc.classifications.length > 0
      ? batchDoc.classifications
      : DEFAULT_BATCH_CLASSIFICATIONS;

  // In-unit students query (actual training strength)
  const matchInUnit = {
    mrhla,
    status: "active",
    locationStatus: "in_unit",
  };

  const [
    arrivedCount,
    inUnitCount,
    relocatedCount,
    transferredPersonnelCount,
    strikenCount,
    latestRollcall,
    classificationAgg,
    qualificationAgg,
    governorateAgg,
    bloodTypeAgg,
  ] = await Promise.all([
    Student.countDocuments({ mrhla }),
    Student.countDocuments(matchInUnit),
    Student.countDocuments({ mrhla, locationStatus: "relocated" }),
    Student.countDocuments({ mrhla, locationStatus: "transferred_to_unit_personnel" }),
    Student.countDocuments({ mrhla, isStriken: true }),
    StudentRollcall.findOne({ mrhla }).sort({ date: -1 }).lean(),
    Student.aggregate([
      { $match: { mrhla } },
      {
        $group: {
          _id: {
            classificationId: { $ifNull: ["$classificationId", "unclassified"] },
            classificationName: { $ifNull: ["$classificationName", "غير مصنف"] },
            qualification: { $ifNull: ["$qualification", "normal"] },
          },
          count: { $sum: 1 },
        },
      },
    ]),
    Student.aggregate([
      { $match: matchInUnit },
      {
        $group: {
          _id: { $ifNull: ["$qualification", "unspecified"] },
          count: { $sum: 1 },
        },
      },
      { $sort: { count: -1 } },
    ]),
    Student.aggregate([
      { $match: matchInUnit },
      {
        $group: {
          _id: { $ifNull: ["$governorate", "غير محدد"] },
          count: { $sum: 1 },
        },
      },
      { $sort: { count: -1 } },
      { $limit: 10 },
    ]),
    Student.aggregate([
      { $match: matchInUnit },
      {
        $group: {
          _id: { $ifNull: ["$bloodType", "غير محدد"] },
          count: { $sum: 1 },
        },
      },
      { $sort: { count: -1 } },
    ]),
  ]);

  const targetCount = batchDoc?.targetCount && batchDoc.targetCount > 0 ? batchDoc.targetCount : arrivedCount;
  const remainingCount = Math.max(0, targetCount - arrivedCount);
  const totalStrength = inUnitCount;

  let presentCount = inUnitCount;
  let outOfficialCount = 0;
  let outDisciplinaryCount = 0;

  if (latestRollcall) {
    presentCount = latestRollcall.presentCount;
    outOfficialCount = latestRollcall.outOfficialCount;
    outDisciplinaryCount = latestRollcall.outDisciplinaryCount;
  }

  const attendanceRate =
    inUnitCount > 0 ? Math.round((presentCount / inUnitCount) * 100) : 0;

  // Build Classification Matrix
  const matrixMap = new Map<
    string,
    { id: string; name: string; total: number; high: number; aboveAvg: number; average: number; normal: number }
  >();

  // Initialize with configured classifications
  for (const c of configuredClassifications) {
    matrixMap.set(c.id, {
      id: c.id,
      name: c.name,
      total: 0,
      high: 0,
      aboveAvg: 0,
      average: 0,
      normal: 0,
    });
  }

  for (const item of classificationAgg) {
    const cid = String(item._id.classificationId || "unclassified");
    const cname = String(item._id.classificationName || "غير مصنف");
    const qual = String(item._id.qualification || "normal");
    const cnt = Number(item.count) || 0;

    let row = matrixMap.get(cid);
    if (!row) {
      row = { id: cid, name: cname, total: 0, high: 0, aboveAvg: 0, average: 0, normal: 0 };
      matrixMap.set(cid, row);
    }
    row.total += cnt;
    if (qual === "high") row.high += cnt;
    else if (qual === "above_avg") row.aboveAvg += cnt;
    else if (qual === "average") row.average += cnt;
    else row.normal += cnt;
  }

  const classificationsMatrix = Array.from(matrixMap.values());

  const qualifications = qualificationAgg.map((q) => {
    const typeStr = String(q._id);
    const count = Number(q.count);
    return {
      type: typeStr,
      label: formatQualificationLabel(typeStr, typeStr === "unspecified" ? "غير محدد" : typeStr),
      count,
      percentage: inUnitCount > 0 ? Math.round((count / inUnitCount) * 100) : 0,
    };
  });

  const govMap = new Map<string, number>();
  for (const g of governorateAgg) {
    const rawName = String(g._id);
    const mapped = mapGovernorate(rawName);
    const finalName = mapped.name || (rawName === "غير محدد" ? "غير محدد" : rawName);
    const current = govMap.get(finalName) ?? 0;
    govMap.set(finalName, current + Number(g.count));
  }

  const governorates = Array.from(govMap.entries())
    .map(([name, count]) => ({
      name,
      count,
      percentage: inUnitCount > 0 ? Math.round((count / inUnitCount) * 100) : 0,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  const bloodMap = new Map<string, number>();
  for (const b of bloodTypeAgg) {
    const rawType = String(b._id);
    const mapped = mapBloodType(rawType);
    const finalType = mapped.bloodType || (rawType === "غير محدد" ? "غير محدد" : rawType);
    const current = bloodMap.get(finalType) ?? 0;
    bloodMap.set(finalType, current + Number(b.count));
  }

  const bloodTypes = Array.from(bloodMap.entries())
    .map(([type, count]) => ({
      type,
      count,
      percentage: inUnitCount > 0 ? Math.round((count / inUnitCount) * 100) : 0,
    }))
    .sort((a, b) => b.count - a.count);

  return {
    mrhla,
    mrhlaName,
    totalStrength,
    targetCount,
    arrivedCount,
    remainingCount,
    inUnitCount,
    relocatedCount,
    transferredPersonnelCount,
    presentCount,
    outOfficialCount,
    outDisciplinaryCount,
    attendanceRate,
    strikenCount,
    classificationsMatrix,
    qualifications,
    governorates,
    bloodTypes,
  };
}
