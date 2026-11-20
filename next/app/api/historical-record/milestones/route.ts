import { logAuditEvent } from "@/lib/auth/audit";
import { errors } from "@/lib/auth/errors";
import { apiError, apiSuccess, handleApiError } from "@/lib/api-response";
import { UnitHistoricalMilestone } from "@/lib/db/models/UnitHistoricalInfo";
import {
  extractFormFiles,
  getFormString,
  requireHistoricalAccess,
} from "@/lib/historical-record/route-guard";
import {
  queryUnitMilestones,
  serializeUnitMilestone,
  toUtcMiddayDate,
} from "@/lib/historical-record/queries";
import {
  saveHistoricalImagesBatch,
  unlinkHistoricalFiles,
} from "@/lib/historical-record/uploads";
import {
  historicalQuerySchema,
  unitMilestoneCreateSchema,
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

    const result = await queryUnitMilestones({
      search: parsed.data.search,
      year: parsed.data.year,
      category: parsed.data.category,
      sortOrder: parsed.data.sortOrder,
    });

    return apiSuccess(result);
  } catch (error) {
    return handleApiError(error, "فشل تحميل المحطات التاريخية للوحدة");
  }
}

export async function POST(request: Request) {
  let savedPhotos: string[] = [];
  try {
    const guard = await requireHistoricalAccess(request, "add", "upload");
    if (!guard.ok) return guard.response;

    const formData = await request.formData();
    const parsed = unitMilestoneCreateSchema.safeParse({
      milestoneDate: getFormString(formData, "milestoneDate") ?? "",
      title: getFormString(formData, "title") ?? "",
      category: getFormString(formData, "category") ?? "",
      description: getFormString(formData, "description") ?? "",
    });

    if (!parsed.success) {
      return apiError(errors.validationFailed, 400, parsed.error.issues);
    }

    const photoFiles = extractFormFiles(formData, "photos");
    if (photoFiles.length > 0) {
      const uploadRes = await saveHistoricalImagesBatch(
        photoFiles,
        "milestones",
      );
      if (!uploadRes.success) {
        return apiError(uploadRes.error ?? "فشل رفع صور المحطة التاريخية", 400);
      }
      savedPhotos = uploadRes.filePaths;
    }

    const created = await UnitHistoricalMilestone.create({
      milestoneDate: toUtcMiddayDate(parsed.data.milestoneDate),
      title: parsed.data.title,
      category: parsed.data.category,
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
      description: `إضافة محطة تاريخية للوحدة: ${created.title} (${parsed.data.milestoneDate})`,
      ipAddress: guard.ip,
    });

    const dto = serializeUnitMilestone({
      _id: created._id,
      milestoneDate: created.milestoneDate,
      title: created.title,
      category: created.category,
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
    return handleApiError(error, "فشل تسجيل المحطة التاريخية");
  }
}
