import { sendRollcallReminder } from "../lib/officers/reminders";

async function main() {
  console.log("[OfficersRollcallReminder] Starting reminder job...");
  try {
    await sendRollcallReminder();
    console.log("[OfficersRollcallReminder] Reminder sent successfully.");
  } catch (error) {
    console.error("[OfficersRollcallReminder] Failed to send reminder:", error);
    process.exit(1);
  }
  process.exit(0);
}

main();
