import { redirect } from "next/navigation";
import { authenticate } from "@/lib/auth/middleware";
import { connectToDatabase } from "@/lib/db/connect";
import { Student } from "@/lib/db/models/Student";
import { StudentBatch, DEFAULT_BATCH_CLASSIFICATIONS } from "@/lib/db/models/StudentBatch";
import { getActiveStudentStage, formatMrhlaName } from "@/lib/students/settings";
import { getStudentsAnalytics } from "@/lib/students/analytics";
import { StudentsPageClient } from "@/components/students/StudentsPageClient";
import type { Types } from "mongoose";
import type { IStudentListItem, IStageInfo } from "@/types/student";

export default async function StudentsPage() {
  const auth = await authenticate();
  if (!auth.success) {
    redirect("/login");
  }

  const user = auth.user!;
  if (user.role !== "admin" && user.permissions.students === "none") {
    redirect("/");
  }

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

  const batchMap = new Map<string, (typeof allBatches)[0]>();
  for (const b of allBatches) {
    batchMap.set(b.mrhla, b);
  }

  const stages: IStageInfo[] = stagesAggregate.map((item) => {
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

  const [analytics, currentStageStudentsRaw, totalCurrentStudents] = await Promise.all([
    getStudentsAnalytics(activeStage.mrhla),
    activeStage.mrhla
      ? Student.find({ mrhla: activeStage.mrhla })
          .sort({ militaryNo: 1, createdAt: -1 })
          .limit(100)
          .lean()
      : [],
    activeStage.mrhla
      ? Student.countDocuments({ mrhla: activeStage.mrhla })
      : 0,
  ]);

  const serializedStudents: IStudentListItem[] = currentStageStudentsRaw.map((s) => ({
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
          relocatedAt: s.relocationDetails.relocatedAt ? (s.relocationDetails.relocatedAt as Date).toISOString() : undefined,
        }
      : undefined,
    unitPersonnelDetails: s.unitPersonnelDetails
      ? {
          transferDate: s.unitPersonnelDetails.transferDate ? (s.unitPersonnelDetails.transferDate as Date).toISOString() : "",
          orderNo: s.unitPersonnelDetails.orderNo,
          assignedRole: s.unitPersonnelDetails.assignedRole,
          transferredAt: s.unitPersonnelDetails.transferredAt ? (s.unitPersonnelDetails.transferredAt as Date).toISOString() : undefined,
        }
      : undefined,
    governorate: s.governorate,
    address: s.address,
    bloodType: s.bloodType,
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

  const canEdit = user.role === "admin" || user.permissions.students === "edit";
  const isAdmin = user.role === "admin";

  return (
    <StudentsPageClient
      initialStudents={serializedStudents}
      initialTotal={totalCurrentStudents}
      initialActiveStage={activeStage}
      initialStages={stages}
      initialAnalytics={analytics}
      canEdit={canEdit}
      isAdmin={isAdmin}
    />
  );
}
