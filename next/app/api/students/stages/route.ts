import { NextResponse } from "next/server";
import { authenticate } from "@/lib/auth/middleware";
import { hasModuleAccess } from "@/lib/auth/rbac";
import { errors } from "@/lib/auth/errors";
import { connectToDatabase } from "@/lib/db/connect";
import { Student } from "@/lib/db/models/Student";
import { StudentBatch, DEFAULT_BATCH_CLASSIFICATIONS } from "@/lib/db/models/StudentBatch";
import { getActiveStudentStage, formatMrhlaName } from "@/lib/students/settings";

export async function GET() {
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

    const [activeStage, stagesAggregate, allBatches] = await Promise.all([
      getActiveStudentStage(),
      Student.aggregate([
        {
          $match: {
            mrhla: { $exists: true, $ne: "" },
          },
        },
        {
          $group: {
            _id: "$mrhla",
            count: { $sum: 1 },
            activeCount: {
              $sum: {
                $cond: [
                  {
                    $and: [
                      { $eq: ["$status", "active"] },
                      { $ne: ["$isStriken", true] },
                    ],
                  },
                  1,
                  0,
                ],
              },
            },
            inUnitCount: {
              $sum: {
                $cond: [
                  {
                    $and: [
                      { $eq: ["$status", "active"] },
                      {
                        $or: [
                          { $eq: ["$locationStatus", "in_unit"] },
                          { $not: ["$locationStatus"] },
                        ],
                      },
                    ],
                  },
                  1,
                  0,
                ],
              },
            },
            relocatedCount: {
              $sum: {
                $cond: [{ $eq: ["$locationStatus", "relocated"] }, 1, 0],
              },
            },
            transferredPersonnelCount: {
              $sum: {
                $cond: [{ $eq: ["$locationStatus", "transferred_to_unit_personnel"] }, 1, 0],
              },
            },
          },
        },
        {
          $sort: { _id: -1 },
        },
      ]),
      StudentBatch.find().lean(),
    ]);

    const batchMap = new Map<string, typeof allBatches[0]>();
    for (const b of allBatches) {
      batchMap.set(b.mrhla, b);
    }

    const stages = stagesAggregate.map((item) => {
      const mrhla = String(item._id);
      const batch = batchMap.get(mrhla);
      const count = Number(item.count) || 0;
      const targetCount = batch?.targetCount && batch.targetCount > 0 ? batch.targetCount : count;
      const arrivedCount = count;
      const remainingCount = Math.max(0, targetCount - arrivedCount);
      const classifications =
        batch?.classifications && batch.classifications.length > 0
          ? batch.classifications
          : DEFAULT_BATCH_CLASSIFICATIONS;

      return {
        mrhla,
        name: formatMrhlaName(mrhla),
        count,
        activeCount: item.activeCount,
        targetCount,
        arrivedCount,
        remainingCount,
        inUnitCount: item.inUnitCount,
        relocatedCount: item.relocatedCount,
        transferredPersonnelCount: item.transferredPersonnelCount,
        classifications,
      };
    });

    return NextResponse.json({
      success: true,
      data: {
        activeStage,
        stages,
      },
    });
  } catch (error) {
    console.error("Error fetching student stages:", error);
    return NextResponse.json(
      { success: false, error: "فشل استرجاع المراحل التجنيدية" },
      { status: 500 }
    );
  }
}
