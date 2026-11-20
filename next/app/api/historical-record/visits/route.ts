import { logAuditEvent } from "@/lib/auth/audit";
import { errors } from "@/lib/auth/errors";
import { apiError, apiSuccess, handleApiError } from "@/lib/api-response";
import { HistoricalVisit } from "@/lib/db/models/HistoricalVisit";
import {
  extractFormFiles,
  getFormString,
  requireHistoricalAccess,
} from "@/lib/historical-record/route-guard";
import {
  queryHistoricalVisits,
  serializeHistoricalVisit,
  toUtcMiddayDate,
} from "@/lib/historical-record/queries";
import {
  saveHistoricalImagesBatch,
  unlinkHistoricalFiles,
} from "@/lib/historical-record/uploads";
import {
  historicalQuerySchema,
  historicalVisitCreateSchema,
} from "@/lib/validations/historical-record";

export async function GET(request: Request) {
  try {
    const guard = await requireHistoricalAccess(request, "view", "read");
    if (!guard.ok) return guard.response;

    const { searchParams } = new URL(request.url);
    const parsed = historicalQuerySchema.safeParse(
      Object.fromEntries(searchParams.entries()),
    );

    if (!parsed.success) {
      return apiError(errors.validationFailed, 400, parsed.error.issues);
    }

    const result = await queryHistoricalVisits({
      search: parsed.data.search,
      year: parsed.data.year,
      sortOrder: parsed.data.sortOrder,
    });

    return apiSuccess(result);
  } catch (error) {
    return handleApiError(error, "فشل تحميل سجل الزيارات التاريخية");
  }
}

export async function POST(request: Request) {
  let savedPhotos: string[] = [];
  try {
    const guard = await requireHistoricalAccess(request, "add", "upload");
    if (!guard.ok) return guard.response;

    const formData = await request.formData();
    const parsed = historicalVisitCreateSchema.safeParse({
      title: getFormString(formData, "title") ?? "",
      visitorName: getFormString(formData, "visitorName") ?? "",
      visitDate: getFormString(formData, "visitDate") ?? "",
      description: getFormString(formData, "description") ?? "",
    });

    if (!parsed.success) {
      return apiError(errors.validationFailed, 400, parsed.error.issues);
    }

    const photoFiles = extractFormFiles(formData, "photos");
    if (photoFiles.length > 0) {
      const uploadResult = await saveHistoricalImagesBatch(photoFiles, "visits");
      if (!uploadResult.success) {
        return apiError(
          uploadResult.error ?? "فشل رفع صور الزيارة",
          400,
        );
      }
      savedPhotos = uploadResult.filePaths;
    }

    const created = await HistoricalVisit.create({
      title: parsed.data.title,
      visitorName: parsed.data.visitorName,
      visitDate: toUtcMiddayDate(parsed.data.visitDate),
      description: parsed.data.description,
      photos: savedPhotos,
      createdBy: guard.user.id,
    });

    await logAuditEvent({
      userId: guard.user.id,
      userName: guard.user.fullName,
      action: "CREATE",
      module: "historical_record",
      targetId: created._id.toString(),
      description: `إضافة زيارة هامة للسجل التاريخي: ${created.title} (${parsed.data.visitDate})`,
      ipAddress: guard.ip,
    });

    const dto = serializeHistoricalVisit({
      _id: created._id,
      title: created.title,
      visitorName: created.visitorName,
      visitDate: created.visitDate,
      description: created.description,
      photos: created.photos,
      createdBy: { _id: guard.user.id, fullName: guard.user.fullName },
      createdAt: created.createdAt,
      updatedAt: created.updatedAt,
    });

    return apiSuccess(dto, 201);
  } catch (error) {
    if (savedPhotos.length > 0) {
      await unlinkHistoricalFiles(savedPhotos);
    }
    return handleApiError(error, "فشل تسجيل الزيارة التاريخية");
  }
}
