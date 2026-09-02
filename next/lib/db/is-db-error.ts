/**
 * Lightweight client-safe helper to identify database connection errors
 * across Error Boundaries, RSCs, and Client Components.
 */
export function isDatabaseError(error: unknown): boolean {
  if (!error) return false;

  if (typeof error === "string") {
    return /database|mongo|econnrefused|connection lost|failed to connect|503/i.test(error);
  }

  if (typeof error === "object") {
    const err = error as { name?: string; message?: string; digest?: string; error?: string };
    const name = String(err.name || "");
    const message = String(err.message || "");
    const digest = String(err.digest || "");
    const errorStr = String(err.error || "");

    const combined = `${name} ${message} ${digest} ${errorStr}`.toLowerCase();

    return (
      name === "DatabaseConnectionError" ||
      combined.includes("database connection lost") ||
      combined.includes("failed to connect to database") ||
      combined.includes("قاعدة البيانات") ||
      combined.includes("econnrefused") ||
      combined.includes("mongoserverselectionerror") ||
      combined.includes("mongonetworkerror") ||
      combined.includes("mongooseerror") ||
      combined.includes("buffering timed out") ||
      combined.includes("topology was destroyed") ||
      combined.includes("database_connection_error")
    );
  }

  return false;
}
