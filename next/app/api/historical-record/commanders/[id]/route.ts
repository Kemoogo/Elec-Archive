import { logAuditEvent } from "@/lib/auth/audit";
import { errors } from "@/lib/auth/errors";
import { apiError, apiSuccess, handleApiError } from "@/lib/api-response";
import { HistoricalCommander } from "@/lib/db/models/HistoricalCommander";
import {
  extractFormFiles,
  getFormString,
  isValidObjectId,
  parseJsonRecord,
  requireHistoricalAccess,
} from "@/lib/historical-record/route-guard";
import {
  findOverlappingCommander,
  serializeHistoricalCommander,
  toIsoDateOnly,
  toUtcMiddayDate,
} from "@/lib/historical-record/queries";
import {
  saveHistoricalImage,
  unlinkHistoricalFiles,
} from "@/lib/historical-record/uploads";
import {
  governanceConfirmationSchema,
  historicalCommanderUpdateSchema,
} from "@/lib/validations/historical-record";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function PATCH(request: Request, context: RouteContext) {
  let newlyUploadedPhoto: string | undefined;
  let closedOtherCurrentId: string | undefined;

  try {
    const guard = await requireHistoricalAccess(request, "admin", "upload");
    if (!guard.ok) return guard.response;

    const { id } = await context.params;
    if (!isValidObjectId(id)) {
      return apiError("معرف سجل القائد غير صالح", 400);
    }

    const existing = await HistoricalCommander.findById(id);
    if (!existing) {
      return apiError("سجل القائد التاريخي غير موجود", 404);
    }

    const contentType = request.headers.get("content-type") ?? "";
    let rawBody: Record<string, unknown> = {};
    let newPhotoFiles: File[] = [];

    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData();
      const snapshotRaw = getFormString(formData, "officerSnapshot");
      let parsedSnapshot: unknown;
      if (snapshotRaw !== undefined) {
        try {
          parsedSnapshot = JSON.parse(snapshotRaw);
        } catch {
          return apiError("صيغة بيانات لقطة القائد غير صالحة", 400);
        }
      }

      const isCurrentStr = getFormString(formData, "isCurrent");
      const removePhotoStr = getFormString(formData, "removePhoto");

      rawBody = {
        startDate: getFormString(formData, "startDate"),
        endDate: getFormString(formData, "endDate"),
        isCurrent:
          isCurrentStr !== undefined ? isCurrentStr === "true" : undefined,
        previousCommanderEndDate: getFormString(
          formData,
          "previousCommanderEndDate",
        ),
        notes: getFormString(formData, "notes"),
        officerSnapshot: parsedSnapshot,
        removePhoto:
          removePhotoStr !== undefined ? removePhotoStr === "true" : undefined,
        reason: getFormString(formData, "reason") ?? "",
        confirmed: getFormString(formData, "confirmed") === "true",
      };
      newPhotoFiles = extractFormFiles(formData, "photo");
    } else {
      const jsonBody = await parseJsonRecord(request);
      if (!jsonBody.ok) return jsonBody.response;
      rawBody = jsonBody.data;
    }

    const nextIsCurrent =
      typeof rawBody.isCurrent === "boolean"
        ? rawBody.isCurrent
        : existing.isCurrent;
    const nextStartDate =
      typeof rawBody.startDate === "string" && rawBody.startDate
        ? rawBody.startDate
        : toIsoDateOnly(existing.startDate) ?? "";
    const hasExplicitEndDate =
      typeof rawBody.endDate === "string" && rawBody.endDate.trim() !== "";
    const nextEndDate = hasExplicitEndDate
      ? (rawBody.endDate as string)
      : nextIsCurrent
        ? undefined
        : toIsoDateOnly(existing.endDate);

    const parsed = historicalCommanderUpdateSchema.safeParse({
      ...rawBody,
      startDate: nextStartDate,
      endDate: nextEndDate,
      isCurrent: nextIsCurrent,
    });

    if (!parsed.success) {
      return apiError(errors.validationFailed, 400, parsed.error.issues);
    }

    const otherCurrent = nextIsCurrent
      ? await HistoricalCommander.findOne({
          _id: { $ne: existing._id },
          isCurrent: true,
        })
      : null;

    let previousEndDateIso: string | undefined;
    if (otherCurrent) {
      previousEndDateIso = parsed.data.previousCommanderEndDate;
      if (!previousEndDateIso) {
        return apiError(
          `يوجد قائد حالي نشط آخر (${otherCurrent.officerSnapshot.fullName})؛ يرجى تحديد تاريخ انتهاء قيادته أولاً`,
          409,
        );
      }
      const otherStartIso = toIsoDateOnly(otherCurrent.startDate) ?? "";
      if (previousEndDateIso < otherStartIso) {
        return apiError(
          "تاريخ انتهاء القائد الحالي الآخر لا يمكن أن يسبق تاريخ بداية قيادته",
          400,
        );
      }
      if (previousEndDateIso > nextStartDate) {
        return apiError(
          "تاريخ انتهاء القائد الحالي الآخر يجب ألا يتجاوز تاريخ بداية هذا القائد",
          400,
        );
      }
    }

    const overlap = await findOverlappingCommander({
      startDate: nextStartDate,
      endDate: nextEndDate,
      isCurrent: nextIsCurrent,
      excludeCommanderId: existing._id.toString(),
      closedCurrentCommanderId: otherCurrent
        ? otherCurrent._id.toString()
        : undefined,
      closedCurrentEndDate: previousEndDateIso,
    });

    if (overlap) {
      return apiError(
        `تتعارض الفترة المعدلة مع فترة القائد (${overlap.officerSnapshot.fullName}) من ${overlap.startDate}${overlap.endDate ? ` إلى ${overlap.endDate}` : " حتى الآن"}`,
        409,
      );
    }

    const oldPhotoUrl = existing.photoUrl;
    if (newPhotoFiles.length > 0) {
      const uploadRes = await saveHistoricalImage(
        newPhotoFiles[0],
        "commanders",
      );
      if (!uploadRes.success || !uploadRes.filePath) {
        return apiError(uploadRes.error ?? "فشل رفع صورة القائد الجديدة", 400);
      }
      newlyUploadedPhoto = uploadRes.filePath;
    }

    if (otherCurrent && previousEndDateIso) {
      closedOtherCurrentId = otherCurrent._id.toString();
      otherCurrent.isCurrent = false;
      otherCurrent.endDate = toUtcMiddayDate(previousEndDateIso);
      await otherCurrent.save();
    }

    existing.startDate = toUtcMiddayDate(nextStartDate);
    existing.isCurrent = nextIsCurrent;
    existing.endDate = nextIsCurrent
      ? undefined
      : nextEndDate
        ? toUtcMiddayDate(nextEndDate)
        : undefined;

    if (parsed.data.notes !== undefined) {
      existing.notes = parsed.data.notes;
    }

    if (parsed.data.officerSnapshot) {
      const snap = parsed.data.officerSnapshot;
      if (snap.militaryId !== undefined) {
        existing.officerSnapshot.militaryId = snap.militaryId;
      }
      if (snap.fullName !== undefined) {
        existing.officerSnapshot.fullName = snap.fullName;
      }
      if (snap.rank !== undefined) {
        existing.officerSnapshot.rank = snap.rank;
      }
      if (snap.seniorityNumber !== undefined) {
        existing.officerSnapshot.seniorityNumber = snap.seniorityNumber;
      }
    }

    if (newlyUploadedPhoto) {
      existing.photoUrl = newlyUploadedPhoto;
    } else if (parsed.data.removePhoto) {
      existing.photoUrl = undefined;
    }

    await existing.save();

    if (
      oldPhotoUrl &&
      ((newlyUploadedPhoto && newlyUploadedPhoto !== oldPhotoUrl) ||
        parsed.data.removePhoto)
    ) {
      await unlinkHistoricalFiles([oldPhotoUrl]);
    }

    await existing.populate("createdBy", "fullName");

    if (closedOtherCurrentId && otherCurrent && previousEndDateIso) {
      await logAuditEvent({
        userId: guard.user.id,
        userName: guard.user.fullName,
        action: "UPDATE",
        module: "historical_record",
        targetId: closedOtherCurrentId,
        description: `إغلاق فترة قيادة القائد السابق (${otherCurrent.officerSnapshot.fullName}) بتاريخ ${previousEndDateIso} تلقائياً أثناء تعديل قائد آخر ليصبح حالياً — السبب: ${parsed.data.reason}`,
        ipAddress: guard.ip,
      });
    }

    await logAuditEvent({
      userId: guard.user.id,
      userName: guard.user.fullName,
      action: "UPDATE",
      module: "historical_record",
      targetId: existing._id.toString(),
      description: `تعديل سجل القائد التاريخي (${existing.officerSnapshot.fullName}) بواسطة مدير النظام — السبب: ${parsed.data.reason}`,
      ipAddress: guard.ip,
    });

    return apiSuccess(serializeHistoricalCommander(existing));
  } catch (error) {
    if (closedOtherCurrentId) {
      await HistoricalCommander.updateOne(
        { _id: closedOtherCurrentId },
        { $set: { isCurrent: true }, $unset: { endDate: 1 } },
      ).catch((rollbackErr) => {
        console.error("Rollback failed:", rollbackErr);
      });
    }
    if (newlyUploadedPhoto) {
      await unlinkHistoricalFiles([newlyUploadedPhoto]);
    }
    return handleApiError(error, "فشل تعديل سجل القائد التاريخي");
  }
}

export async function DELETE(request: Request, context: RouteContext) {
  try {
    const guard = await requireHistoricalAccess(request, "admin", "write");
    if (!guard.ok) return guard.response;

    const { id } = await context.params;
    if (!isValidObjectId(id)) {
      return apiError("معرف سجل القائد غير صالح", 400);
    }

    const jsonBody = await parseJsonRecord(request);
    if (!jsonBody.ok) return jsonBody.response;

    const parsed = governanceConfirmationSchema.safeParse(jsonBody.data);
    if (!parsed.success) {
      return apiError(errors.validationFailed, 400, parsed.error.issues);
    }

    const deleted = await HistoricalCommander.findByIdAndDelete(id);
    if (!deleted) {
      return apiError("سجل القائد التاريخي غير موجود", 404);
    }

    if (deleted.photoUrl) {
      await unlinkHistoricalFiles([deleted.photoUrl]);
    }

    await logAuditEvent({
      userId: guard.user.id,
      userName: guard.user.fullName,
      action: "DELETE",
      module: "historical_record",
      targetId: deleted._id.toString(),
      description: `حذف سجل القائد التاريخي (${deleted.officerSnapshot.fullName}) بواسطة مدير النظام — السبب: ${parsed.data.reason}`,
      ipAddress: guard.ip,
    });

    return apiSuccess({ id: deleted._id.toString() });
  } catch (error) {
    return handleApiError(error, "فشل حذف سجل القائد التاريخي");
  }
}
