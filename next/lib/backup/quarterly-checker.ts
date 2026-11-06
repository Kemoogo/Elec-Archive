import { connectToDatabase } from "@/lib/db/connect";
import { BackupRecord } from "@/lib/db/models/BackupRecord";
import { User } from "@/lib/db/models/User";
import { generateBackup } from "./backup-engine";
import { enforceRetentionPolicy } from "./retention-manager";
import { logAuditEvent } from "@/lib/auth/audit";

/**
 * Returns the quarter identifier for a given date, e.g. "Q1-2026"
 */
export function getQuarterForDate(date: Date): { quarter: string; isQuarterEnd: boolean } {
  const month = date.getMonth(); // 0-indexed: 0 = Jan, 11 = Dec
  const day = date.getDate();
  const year = date.getFullYear();

  let quarterNum = 1;
  let isEnd = false;

  if (month <= 2) {
    quarterNum = 1;
    isEnd = month === 2 && day >= 30; // End of March
  } else if (month <= 5) {
    quarterNum = 2;
    isEnd = month === 5 && day >= 29; // End of June
  } else if (month <= 8) {
    quarterNum = 3;
    isEnd = month === 8 && day >= 29; // End of September
  } else {
    quarterNum = 4;
    isEnd = month === 11 && day >= 30; // End of December
  }

  return {
    quarter: `Q${quarterNum}-${year}`,
    isQuarterEnd: isEnd,
  };
}

/**
 * Checks if a quarterly backup is required for the current or recently ended quarter.
 * If missing, triggers automated backup and retention rotation.
 */
export async function checkAndTriggerQuarterlyBackupIfNeeded(): Promise<{
  triggered: boolean;
  quarter?: string;
  backupId?: string;
  reason?: string;
}> {
  try {
    await connectToDatabase();

    const now = new Date();
    const { quarter, isQuarterEnd } = getQuarterForDate(now);

    // Check if quarterly backup already exists for this quarter
    const existing = await BackupRecord.findOne({
      backupType: "quarterly_scheduled",
      quarter,
      status: "completed",
    }).exec();

    if (existing) {
      return {
        triggered: false,
        quarter,
        reason: "النسخة الربع سنوية لهذا الربع مسجلة ومكتملة بالفعل",
      };
    }

    // Only auto-trigger if we are at quarter-end window or explicitly requested
    if (!isQuarterEnd) {
      return {
        triggered: false,
        quarter,
        reason: "لم يحن موعد نهاية الربع السنوي بعد",
      };
    }

    // Get an admin user reference for system automated execution
    const systemAdmin = await User.findOne({ role: "admin" }).sort({ createdAt: 1 }).lean();
    const userId = systemAdmin ? systemAdmin._id.toString() : "000000000000000000000000";
    const userName = "النظام الآلي (الجدولة الربع سنوية)";

    const backupResult = await generateBackup({
      userId,
      userName,
      backupType: "quarterly_scheduled",
      quarter,
    });

    await enforceRetentionPolicy({
      userId,
      userName,
    });

    await logAuditEvent({
      userId,
      userName,
      action: "CREATE",
      module: "backup",
      targetId: backupResult.backupId,
      description: `توليد النسخة الربع سنوية المجدولة تلقائياً (${backupResult.filename}) بنهاية الربع ${quarter}`,
    });

    return {
      triggered: true,
      quarter,
      backupId: backupResult.backupId,
    };
  } catch (error) {
    console.error("[QuarterlyChecker] Failed to check/trigger quarterly backup:", error);
    return {
      triggered: false,
      reason: error instanceof Error ? error.message : "حدث خطأ غير متوقع",
    };
  }
}

// Global guard for periodic timer in Node.js runtime
declare global {
  var __quarterlyBackupCheckerStarted: boolean | undefined;
}

/**
 * Initializes in-process background checker every 12 hours
 */
export function initQuarterlyBackupChecker(): void {
  if (global.__quarterlyBackupCheckerStarted) {
    return;
  }
  global.__quarterlyBackupCheckerStarted = true;

  // Run initial check after 30 seconds of server startup
  setTimeout(() => {
    checkAndTriggerQuarterlyBackupIfNeeded().catch((err) =>
      console.error("[QuarterlyChecker] Initial run failed:", err)
    );
  }, 30000);

  // Check every 12 hours
  const TWELVE_HOURS_MS = 12 * 60 * 60 * 1000;
  setInterval(() => {
    checkAndTriggerQuarterlyBackupIfNeeded().catch((err) =>
      console.error("[QuarterlyChecker] Periodic run failed:", err)
    );
  }, TWELVE_HOURS_MS);
}
