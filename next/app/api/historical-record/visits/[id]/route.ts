import { logAuditEvent } from "@/lib/auth/audit";
import { errors } from "@/lib/auth/errors";
import { apiError, apiSuccess, handleApiError } from "@/lib/api-response";
import { HistoricalVisit } from "@/lib/db/models/HistoricalVisit";
import {
  getFormString,
  isValidObjectId,
  parseJsonRecord,
  parseMultiPhotoPatchRequest,
  requireHistoricalAccess,
  resolveUpdatedPhotoSet,
} from "@/lib/historical-record/route-guard";
import {
  serializeHistoricalVisit,
  toUtcMiddayDate,
} from "@/lib/historical-record/queries";
import { unlinkHistoricalFiles } from "@/lib/historical-record/uploads";
import {
  governanceConfirmationSchema,
  historicalVisitUpdateSchema,
} from "@/lib/validations/historical-record";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function PATCH(request: Request, context: RouteContext) {
  let newlyUploadedPhotos: string[] = [];
  try {
    const guard = await requireHistoricalAccess(request, "admin", "upload");
    if (!guard.ok) return guard.response;

    const { id } = await context.params;
    if (!isValidObjectId(id)) {
      return apiError("معرف الزيارة غير صالح", 400);
    }

    const parsedReq = await parseMultiPhotoPatchRequest(request, (formData) => ({
      title: getFormString(formData, "title"),
      visitorName: getFormString(formData, "visitorName"),
      visitDate: getFormString(formData, "visitDate"),
      description: getFormString(formData, "description"),
    }));
    if (!parsedReq.ok) return parsedReq.response;

    const parsed = historicalVisitUpdateSchema.safeParse(parsedReq.rawPayload);
    if (!parsed.success) {
      return apiError(errors.validationFailed, 400, parsed.error.issues);
    }

    const existing = await HistoricalVisit.findById(id);
    if (!existing) {
      return apiError("سجل الزيارة التاريخية غير موجود", 404);
    }

    const photoResolution = await resolveUpdatedPhotoSet({
      existingPhotos: existing.photos,
      requestedKeepPhotos: parsed.data.keepPhotos,
      newPhotoFiles: parsedReq.newPhotoFiles,
      folder: "visits",
    });
    if (!photoResolution.ok) return photoResolution.response;

    newlyUploadedPhotos = photoResolution.newlyUploadedPhotos;

    if (parsed.data.title !== undefined) existing.title = parsed.data.title;
    if (parsed.data.visitorName !== undefined) {
      existing.visitorName = parsed.data.visitorName;
    }
    if (parsed.data.visitDate !== undefined) {
      existing.visitDate = toUtcMiddayDate(parsed.data.visitDate);
    }
    if (parsed.data.description !== undefined) {
      existing.description = parsed.data.description;
    }
    existing.photos = photoResolution.finalPhotos;

    await existing.save();

    if (photoResolution.removedPhotos.length > 0) {
      await unlinkHistoricalFiles(photoResolution.removedPhotos);
    }

    await existing.populate("createdBy", "fullName");

    await logAuditEvent({
      userId: guard.user.id,
      userName: guard.user.fullName,
      action: "UPDATE",
      module: "historical_record",
      targetId: existing._id.toString(),
      description: `تعديل زيارة تاريخية (${existing.title}) بواسطة مدير النظام — السبب: ${parsed.data.reason}`,
      ipAddress: guard.ip,
    });

    return apiSuccess(serializeHistoricalVisit(existing));
  } catch (error) {
    if (newlyUploadedPhotos.length > 0) {
      await unlinkHistoricalFiles(newlyUploadedPhotos);
    }
    return handleApiError(error, "فشل تعديل الزيارة التاريخية");
  }
}

export async function DELETE(request: Request, context: RouteContext) {
  try {
    const guard = await requireHistoricalAccess(request, "admin", "write");
    if (!guard.ok) return guard.response;

    const { id } = await context.params;
    if (!isValidObjectId(id)) {
      return apiError("معرف الزيارة غير صالح", 400);
    }

    const jsonBody = await parseJsonRecord(request);
    if (!jsonBody.ok) return jsonBody.response;

    const parsed = governanceConfirmationSchema.safeParse(jsonBody.data);
    if (!parsed.success) {
      return apiError(errors.validationFailed, 400, parsed.error.issues);
    }

    const deleted = await HistoricalVisit.findByIdAndDelete(id);
    if (!deleted) {
      return apiError("سجل الزيارة التاريخية غير موجود", 404);
    }

    const photosToClean = Array.isArray(deleted.photos) ? deleted.photos : [];
    if (photosToClean.length > 0) {
      await unlinkHistoricalFiles(photosToClean);
    }

    await logAuditEvent({
      userId: guard.user.id,
      userName: guard.user.fullName,
      action: "DELETE",
      module: "historical_record",
      targetId: deleted._id.toString(),
      description: `حذف زيارة تاريخية (${deleted.title}) بواسطة مدير النظام — السبب: ${parsed.data.reason}`,
      ipAddress: guard.ip,
    });

    return apiSuccess({ id: deleted._id.toString() });
  } catch (error) {
    return handleApiError(error, "فشل حذف الزيارة التاريخية");
  }
}
