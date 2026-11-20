import { logAuditEvent } from "@/lib/auth/audit";
import { errors } from "@/lib/auth/errors";
import { apiError, apiSuccess, handleApiError } from "@/lib/api-response";
import { UnitHistoricalProfile } from "@/lib/db/models/UnitHistoricalInfo";
import {
  extractFormFiles,
  getFormString,
  parseJsonRecord,
  requireHistoricalAccess,
} from "@/lib/historical-record/route-guard";
import {
  getUnitHistoricalProfile,
  serializeUnitProfile,
  toUtcMiddayDate,
} from "@/lib/historical-record/queries";
import {
  saveHistoricalImage,
  unlinkHistoricalFiles,
} from "@/lib/historical-record/uploads";
import {
  governanceConfirmationSchema,
  unitProfileUpsertSchema,
} from "@/lib/validations/historical-record";

export async function GET(request: Request) {
  try {
    const guard = await requireHistoricalAccess(request, "view", "read");
    if (!guard.ok) return guard.response;

    const profile = await getUnitHistoricalProfile();
    return apiSuccess(profile);
  } catch (error) {
    return handleApiError(error, "فشل تحميل بطاقة معلومات الوحدة");
  }
}

export async function PUT(request: Request) {
  let newEmblemPath: string | undefined;
  try {
    const guard = await requireHistoricalAccess(request, "admin", "upload");
    if (!guard.ok) return guard.response;

    const contentType = request.headers.get("content-type") ?? "";
    let rawPayload: Record<string, unknown> = {};
    let emblemFiles: File[] = [];

    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData();
      rawPayload = {
        unitName: getFormString(formData, "unitName") ?? "",
        foundingDate: getFormString(formData, "foundingDate") ?? "",
        affiliation: getFormString(formData, "affiliation") ?? "",
        location: getFormString(formData, "location") ?? "",
        motto: getFormString(formData, "motto") ?? "",
        mission: getFormString(formData, "mission") ?? "",
        removeEmblem: getFormString(formData, "removeEmblem") === "true",
        reason: getFormString(formData, "reason"),
        confirmed: getFormString(formData, "confirmed") === "true",
      };
      emblemFiles = extractFormFiles(formData, "emblem");
    } else {
      const jsonBody = await parseJsonRecord(request);
      if (!jsonBody.ok) return jsonBody.response;
      rawPayload = jsonBody.data;
    }

    const parsed = unitProfileUpsertSchema.safeParse(rawPayload);
    if (!parsed.success) {
      return apiError(errors.validationFailed, 400, parsed.error.issues);
    }

    const existing = await UnitHistoricalProfile.findOne({
      singletonKey: "default",
    });

    if (existing) {
      const govCheck = governanceConfirmationSchema.safeParse({
        reason: parsed.data.reason ?? "",
        confirmed: parsed.data.confirmed,
      });
      if (!govCheck.success) {
        return apiError(errors.validationFailed, 400, govCheck.error.issues);
      }
    }

    if (emblemFiles.length > 0) {
      const uploadRes = await saveHistoricalImage(emblemFiles[0], "unit");
      if (!uploadRes.success || !uploadRes.filePath) {
        return apiError(uploadRes.error ?? "فشل رفع شعار الوحدة", 400);
      }
      newEmblemPath = uploadRes.filePath;
    }

    const oldEmblemUrl = existing?.emblemUrl;
    const savedDoc = existing
      ? await (async () => {
          existing.unitName = parsed.data.unitName;
          existing.foundingDate = parsed.data.foundingDate
            ? toUtcMiddayDate(parsed.data.foundingDate)
            : undefined;
          existing.affiliation = parsed.data.affiliation;
          existing.location = parsed.data.location;
          existing.motto = parsed.data.motto;
          existing.mission = parsed.data.mission;
          if (newEmblemPath) {
            existing.emblemUrl = newEmblemPath;
          } else if (parsed.data.removeEmblem) {
            existing.emblemUrl = undefined;
          }
          existing.updatedBy = guard.user.id as unknown as typeof existing.updatedBy;
          await existing.save();
          return existing;
        })()
      : await UnitHistoricalProfile.create({
          singletonKey: "default",
          unitName: parsed.data.unitName,
          foundingDate: parsed.data.foundingDate
            ? toUtcMiddayDate(parsed.data.foundingDate)
            : undefined,
          affiliation: parsed.data.affiliation,
          location: parsed.data.location,
          motto: parsed.data.motto,
          mission: parsed.data.mission,
          emblemUrl: newEmblemPath,
          updatedBy: guard.user.id,
        });

    if (
      oldEmblemUrl &&
      ((newEmblemPath && newEmblemPath !== oldEmblemUrl) ||
        parsed.data.removeEmblem)
    ) {
      await unlinkHistoricalFiles([oldEmblemUrl]);
    }

    await logAuditEvent({
      userId: guard.user.id,
      userName: guard.user.fullName,
      action: existing ? "UPDATE" : "CREATE",
      module: "historical_record",
      targetId: savedDoc._id.toString(),
      description: existing
        ? `تحديث البطاقة التعريفية للوحدة (${savedDoc.unitName}) بواسطة مدير النظام — السبب: ${parsed.data.reason?.trim()}`
        : `تأسيس البطاقة التعريفية للوحدة لأول مرة: ${savedDoc.unitName}`,
      ipAddress: guard.ip,
    });

    return apiSuccess(
      serializeUnitProfile({
        _id: savedDoc._id,
        unitName: savedDoc.unitName,
        foundingDate: savedDoc.foundingDate,
        affiliation: savedDoc.affiliation,
        location: savedDoc.location,
        motto: savedDoc.motto,
        mission: savedDoc.mission,
        emblemUrl: savedDoc.emblemUrl,
        updatedBy: { _id: guard.user.id, fullName: guard.user.fullName },
        updatedAt: savedDoc.updatedAt,
      }),
    );
  } catch (error) {
    if (newEmblemPath) {
      await unlinkHistoricalFiles([newEmblemPath]);
    }
    return handleApiError(error, "فشل حفظ بطاقة معلومات الوحدة");
  }
}
