import { NextResponse } from "next/server";
import { Types } from "mongoose";
import { authenticate } from "@/lib/auth/middleware";
import type { AuthUser } from "@/lib/auth/types";
import { errors } from "@/lib/auth/errors";
import { connectToDatabase } from "@/lib/db/connect";
import { apiError } from "@/lib/api-response";
import {
  checkApiRateLimit,
  rateLimitErrorResponse,
  type RateLimitCategory,
} from "@/lib/security/rate-limit";
import {
  canAddHistoricalRecord,
  canMutateOrDeleteHistoricalRecord,
  canViewHistoricalRecord,
} from "./access";

import {
  saveHistoricalImagesBatch,
  type HistoricalUploadFolder,
} from "./uploads";

export type HistoricalAccessLevel = "view" | "add" | "admin";

export type HistoricalGuardResult =
  | { ok: true; user: AuthUser; ip: string }
  | { ok: false; response: NextResponse };

/**
 * Unified server API route guard for `/api/historical-record/*`.
 * Enforces authenticate() -> RBAC -> checkApiRateLimit() -> connectToDatabase().
 */
export async function requireHistoricalAccess(
  request: Request,
  accessLevel: HistoricalAccessLevel,
  rateCategory: RateLimitCategory,
): Promise<HistoricalGuardResult> {
  const auth = await authenticate();
  if (!auth.success || !auth.user) {
    return {
      ok: false,
      response: apiError(
        auth.error ?? errors.notAuthenticated,
        auth.status ?? 401,
      ),
    };
  }

  const user = auth.user;
  const allowed =
    accessLevel === "view"
      ? canViewHistoricalRecord(user)
      : accessLevel === "add"
        ? canAddHistoricalRecord(user)
        : canMutateOrDeleteHistoricalRecord(user);

  if (!allowed) {
    return {
      ok: false,
      response: apiError(errors.insufficientPermissions, 403),
    };
  }

  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "127.0.0.1";

  const rl = checkApiRateLimit(user.id, ip, rateCategory);
  if (!rl.allowed) {
    return {
      ok: false,
      response: NextResponse.json(rateLimitErrorResponse(rl.resetAt), {
        status: 429,
      }),
    };
  }

  await connectToDatabase();

  return { ok: true, user, ip };
}

/**
 * Extracts non-empty uploaded File entries from FormData.
 */
export function extractFormFiles(formData: FormData, fieldName: string): File[] {
  const entries = formData.getAll(fieldName);
  const files: File[] = [];
  for (const entry of entries) {
    if (entry instanceof File && entry.size > 0) {
      files.push(entry);
    }
  }
  return files;
}

/**
 * Safely reads a string field from FormData (trimmed).
 */
export function getFormString(
  formData: FormData,
  key: string,
): string | undefined {
  const val = formData.get(key);
  return typeof val === "string" ? val : undefined;
}

/**
 * Validates that an identifier is a canonical MongoDB ObjectId string.
 */
export function isValidObjectId(id: string): boolean {
  return Types.ObjectId.isValid(id);
}

/**
 * Safely parses a JSON request body as a plain object record,
 * returning HTTP 400 on malformed or non-object JSON payloads.
 */
export async function parseJsonRecord(
  request: Request,
): Promise<
  | { ok: true; data: Record<string, unknown> }
  | { ok: false; response: NextResponse }
> {
  try {
    const parsed: unknown = await request.json();
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return {
        ok: false,
        response: apiError("صيغة بيانات JSON غير صالحة", 400),
      };
    }
    return { ok: true, data: parsed as Record<string, unknown> };
  } catch {
    return {
      ok: false,
      response: apiError("تعذر قراءة بيانات JSON المرسلة", 400),
    };
  }
}

/**
 * Parses a PATCH request supporting either `multipart/form-data` (with optional JSON `keepPhotos`
 * and `newPhotos` files) or `application/json`, normalizing governance confirmation fields.
 */
export async function parseMultiPhotoPatchRequest(
  request: Request,
  extractMultipartFields: (formData: FormData) => Record<string, unknown>,
): Promise<
  | { ok: true; rawPayload: Record<string, unknown>; newPhotoFiles: File[] }
  | { ok: false; response: NextResponse }
> {
  const contentType = request.headers.get("content-type") ?? "";
  if (contentType.includes("multipart/form-data")) {
    const formData = await request.formData();
    const keepPhotosRaw = getFormString(formData, "keepPhotos");
    let parsedKeepPhotos: unknown;
    if (keepPhotosRaw !== undefined) {
      try {
        parsedKeepPhotos = JSON.parse(keepPhotosRaw);
      } catch {
        return {
          ok: false,
          response: apiError("صيغة قائمة الصور المحتفظ بها غير صالحة", 400),
        };
      }
    }

    return {
      ok: true,
      rawPayload: {
        ...extractMultipartFields(formData),
        keepPhotos: parsedKeepPhotos,
        reason: getFormString(formData, "reason") ?? "",
        confirmed: getFormString(formData, "confirmed") === "true",
      },
      newPhotoFiles: extractFormFiles(formData, "newPhotos"),
    };
  }

  const jsonBody = await parseJsonRecord(request);
  if (!jsonBody.ok) return jsonBody;

  return {
    ok: true,
    rawPayload: jsonBody.data,
    newPhotoFiles: [],
  };
}

/**
 * Computes retained photos and uploads newly attached photos in a batch, returning final
 * and removed photo lists for post-save cleanup.
 */
export async function resolveUpdatedPhotoSet(params: {
  existingPhotos: unknown;
  requestedKeepPhotos?: string[];
  newPhotoFiles: File[];
  folder: Extract<HistoricalUploadFolder, "visits" | "milestones">;
}): Promise<
  | {
      ok: true;
      newlyUploadedPhotos: string[];
      finalPhotos: string[];
      removedPhotos: string[];
    }
  | { ok: false; response: NextResponse }
> {
  const currentPhotos: string[] = Array.isArray(params.existingPhotos)
    ? params.existingPhotos
    : [];

  const keptPhotos =
    params.requestedKeepPhotos !== undefined
      ? params.requestedKeepPhotos.filter((p) => currentPhotos.includes(p))
      : currentPhotos;

  let newlyUploadedPhotos: string[] = [];
  if (params.newPhotoFiles.length > 0) {
    const uploadRes = await saveHistoricalImagesBatch(
      params.newPhotoFiles,
      params.folder,
      keptPhotos.length,
    );
    if (!uploadRes.success) {
      return {
        ok: false,
        response: apiError(uploadRes.error ?? "فشل رفع الصور الجديدة", 400),
      };
    }
    newlyUploadedPhotos = uploadRes.filePaths;
  }

  const finalPhotos = [...keptPhotos, ...newlyUploadedPhotos];
  const removedPhotos = currentPhotos.filter((p) => !finalPhotos.includes(p));

  return {
    ok: true,
    newlyUploadedPhotos,
    finalPhotos,
    removedPhotos,
  };
}
