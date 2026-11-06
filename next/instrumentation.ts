/**
 * Server Lifecycle Instrumentation
 * Runs once at Next.js server startup in the Node.js runtime.
 */
export async function register(): Promise<void> {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { initQuarterlyBackupChecker } = await import("@/lib/backup/quarterly-checker");
    initQuarterlyBackupChecker();
  }
}
