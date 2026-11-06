import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { DatabaseConnectionError } from "@/lib/db/connect";
import { errors } from "@/lib/auth/errors";

/**
 * Handle API route errors consistently.
 *
 * - If the error is a `DatabaseConnectionError`, the client receives
 *   `errors.dbConnectionError` ("انقطع الاتصال بقاعدة البيانات...").
 * - If the error is a Mongoose `CastError`, returns HTTP 400 with "معرف غير صالح".
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

  if (
    (error !== null &&
      typeof error === "object" &&
      "name" in error &&
      (error as { name: string }).name === "CastError") ||
    (error instanceof Error && error.name === "CastError") ||
    error instanceof mongoose.Error.CastError
  ) {
    return NextResponse.json(
      { success: false, error: "معرف غير صالح" },
      { status: 400 },
    );
  }

  return NextResponse.json(
    { success: false, error: customMessage ?? errors.internalError },
    { status: 500 },
  );
}
