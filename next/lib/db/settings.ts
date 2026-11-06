import { connectToDatabase } from "@/lib/db/connect";
import { SystemSetting, DEFAULT_UNIT_NAME } from "@/lib/db/models";

export async function getUnitName(): Promise<string> {
  try {
    await connectToDatabase();
    const setting = await SystemSetting.findOne({ key: "unit_name" }).lean();
    if (setting?.value && setting.value.trim()) {
      return setting.value.trim();
    }
  } catch (error) {
    console.error("Failed to fetch unit name setting:", error);
  }
  return DEFAULT_UNIT_NAME;
}
