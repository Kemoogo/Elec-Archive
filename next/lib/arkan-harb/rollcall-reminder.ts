import { connectToDatabase } from "@/lib/db/connect";
import { DailyRollcall } from "@/lib/db/models/DailyRollcall";
import { Notification } from "@/lib/db/models/Notification";
import { createNotificationForStaffOps } from "@/lib/notifications/createNotification";

export async function checkDailyRollcallReminder(): Promise<void> {
  const now = new Date();
  const day = now.getDay(); // 0 is Sunday, 1 is Monday, ..., 4 is Thursday, 5 is Friday, 6 is Saturday
  
  // Sunday (0) to Thursday (4)
  const isWorkday = day >= 0 && day <= 4;
  if (!isWorkday) return;

  const currentHour = now.getHours();
  if (currentHour < 9) return;

  await connectToDatabase();

  const startOfDay = new Date(now);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(now);
  endOfDay.setHours(23, 59, 59, 999);

  // 1. Check if rollcall exists and is submitted
  const rollcall = await DailyRollcall.findOne({
    date: { $gte: startOfDay, $lte: endOfDay },
    status: "submitted",
  });

  if (rollcall) return; // Rollcall already submitted

  // 2. Check if reminder already sent today
  const existingReminder = await Notification.findOne({
    type: "rollcall_reminder",
    createdAt: { $gte: startOfDay, $lte: endOfDay },
  });

  if (existingReminder) return; // Reminder already sent

  // 3. Create notification
  await createNotificationForStaffOps({
    type: "rollcall_reminder",
    title: "تنبيه التمام اليومي",
    body: "تنبيه: لم يتم تقديم التمام اليومي حتى الآن (الساعة 09:00).",
  });
}
