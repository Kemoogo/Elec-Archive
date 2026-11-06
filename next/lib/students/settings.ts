import { connectToDatabase } from "@/lib/db/connect";
import { SystemSetting } from "@/lib/db/models/SystemSetting";
import { Student } from "@/lib/db/models/Student";
import { formatMrhlaName } from "./format";
import type { Types } from "mongoose";

export { formatMrhlaName } from "./format";

export const STUDENTS_ACTIVE_STAGE_KEY = "STUDENTS_ACTIVE_STAGE";

/**
 * Get system-wide active recruitment stage.
 * If not explicitly configured, falls back to the latest mrhla in the students collection.
 */
export async function getActiveStudentStage(): Promise<{ mrhla: string; name: string }> {
  await connectToDatabase();
  
  const setting = await SystemSetting.findOne({ key: STUDENTS_ACTIVE_STAGE_KEY }).lean();
  if (setting && setting.value) {
    return {
      mrhla: setting.value,
      name: formatMrhlaName(setting.value),
    };
  }

  // Fallback to highest mrhla
  const latestStudent = await Student.findOne({}, { mrhla: 1 })
    .sort({ mrhla: -1 })
    .lean();

  if (latestStudent && latestStudent.mrhla) {
    return {
      mrhla: latestStudent.mrhla,
      name: formatMrhlaName(latestStudent.mrhla),
    };
  }

  return {
    mrhla: "",
    name: "لا توجد مرحلة مسجلة",
  };
}

/**
 * Set the system-wide active stage.
 */
export async function setActiveStudentStage(
  mrhla: string,
  userId?: Types.ObjectId | string
): Promise<void> {
  await connectToDatabase();
  await SystemSetting.findOneAndUpdate(
    { key: STUDENTS_ACTIVE_STAGE_KEY },
    {
      value: mrhla,
      description: "المرحلة التجنيدية الأساسية الحالية لشئون الطلاب",
      updatedBy: userId,
    },
    { upsert: true, returnDocument: "after" }
  );
}
