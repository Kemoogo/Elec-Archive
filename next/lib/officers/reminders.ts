import { connectToDatabase } from "@/lib/db/connect";
import { Officer } from "@/lib/db/models/Officer";
import { DailyRollcall } from "@/lib/db/models/DailyRollcall";
import { createNotificationForOfficersEditors } from "@/lib/notifications/createNotification";

function getTodayDate(): Date {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return now;
}

function isWorkday(): boolean {
  const day = new Date().getDay();
  // Sunday=0, Monday=1, ..., Thursday=4
  return day >= 0 && day <= 4;
}

export async function sendRollcallReminder(): Promise<void> {
  if (!isWorkday()) {
    console.log("[OfficersReminder] Today is not a workday (Fri/Sat). Skipping.");
    return;
  }

  await connectToDatabase();

  const today = getTodayDate();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const rollcall = await DailyRollcall.findOne({
    date: { $gte: today, $lt: tomorrow },
  });

  const alreadySubmitted = rollcall?.status === "submitted";

  if (alreadySubmitted) {
    await createNotificationForOfficersEditors({
      type: "officers_reminder",
      title: "تذكير: التمام",
      body: "تم تسليم تمام الضباط لهذا اليوم بنجاح.",
    });
  } else {
    const activeCount = await Officer.countDocuments({ employmentStatus: "active" });
    await createNotificationForOfficersEditors({
      type: "officers_reminder",
      title: "تذكير: تسليم التمام",
      body: `لم يتم تسليم تمام الضباط بعد لهذا اليوم. عدد الضباط النشطين: ${activeCount}`,
    });
  }
}
