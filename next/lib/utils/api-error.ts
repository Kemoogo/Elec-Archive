import { NextResponse } from "next/server";
import { DatabaseConnectionError } from "@/lib/db/connect";
import { errors } from "@/lib/auth/errors";

/**
 * Handle API route errors consistently.
 *
 * - If the error is a `DatabaseConnectionError`, the client receives
 *   `errors.dbConnectionError` ("انقطع الاتصال بقاعدة البيانات...").
 * - Otherwise the provided `customMessage` or `errors.internalError` is returned.
 *
 * Always logs the error via `console.error` before responding.
 *
 * @example
 *   catch (error) {
 *     return handleApiError(error, "حدث خطأ أثناء تحميل البيانات");
 *   }
 */
export function handleApiError(
  error: unknown,
  customMessage?: string,
): NextResponse {
  console.error("API Error:", error);

  if (error instanceof DatabaseConnectionError) {
    return NextResponse.json(
      { success: false, error: errors.dbConnectionError },
      { status: 503 },
    );
  }

  return NextResponse.json(
    { success: false, error: customMessage ?? errors.internalError },
    { status: 500 },
  );
}
