import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { DatabaseConnectionError } from "@/lib/db/connect";
import { errors } from "@/lib/auth/errors";

export function apiSuccess<T>(data: T, status = 200): NextResponse {
  return NextResponse.json({ success: true, data }, { status });
}

export function apiError(
  message: string,
  status = 500,
  details?: unknown
): NextResponse {
  return NextResponse.json(
    {
      success: false,
      error: message,
      ...(details !== undefined ? { details } : {}),
    },
    { status }
  );
}

/**
 * Handle API route errors consistently.
 *
 * - If the error is a `DatabaseConnectionError`, the client receives HTTP 503
 *   with `errors.dbConnectionError`.
 * - If the error is a Mongoose `CastError` (e.g. invalid ObjectId format),
 *   returns HTTP 400 with "معرف غير صالح".
 * - Otherwise returns HTTP 500 with the provided `customMessage` or `errors.internalError`.
 *
 * Always logs the error via `console.error` before responding.
 */
export function handleApiError(
  error: unknown,
  customMessage?: string
): NextResponse {
  console.error("API Error:", error);

  if (error instanceof DatabaseConnectionError) {
    return apiError(errors.dbConnectionError, 503);
  }

  if (
    (error !== null &&
      typeof error === "object" &&
      "name" in error &&
      (error as { name: string }).name === "CastError") ||
    error instanceof mongoose.Error.CastError
  ) {
    return apiError("معرف غير صالح", 400);
  }

  return apiError(customMessage ?? errors.internalError, 500);
}
