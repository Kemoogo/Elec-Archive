import { logAuditEvent } from "@/lib/auth/audit";
import { errors } from "@/lib/auth/errors";
import { apiError, apiSuccess, handleApiError } from "@/lib/api-response";
import { HistoricalCommander } from "@/lib/db/models/HistoricalCommander";
import { Officer } from "@/lib/db/models/Officer";
import { formatOfficerRank } from "@/lib/db/models/Officer.shared";
import {
  extractFormFiles,
  getFormString,
  requireHistoricalAccess,
} from "@/lib/historical-record/route-guard";
import {
  findOverlappingCommander,
  queryHistoricalCommanders,
  serializeHistoricalCommander,
  toIsoDateOnly,
  toUtcMiddayDate,
} from "@/lib/historical-record/queries";
import {
  copyOfficerPhotoToHistorical,
  saveHistoricalImage,
  unlinkHistoricalFiles,
} from "@/lib/historical-record/uploads";
import {
  historicalCommanderCreateSchema,
  historicalQuerySchema,
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

    const result = await queryHistoricalCommanders({
      search: parsed.data.search,
      year: parsed.data.year,
      status: parsed.data.status,
      sortOrder: parsed.data.sortOrder,
    });

    return apiSuccess(result);
  } catch (error) {
    return handleApiError(error, "فشل تحميل سجل قادة المركز والوحدة");
  }
}

export async function POST(request: Request) {
  let savedPhotoPath: string | undefined;
  let closedPreviousId: string | undefined;
  let closedPreviousOldStartDate: Date | undefined;

  try {
    const guard = await requireHistoricalAccess(request, "add", "upload");
    if (!guard.ok) return guard.response;

    const formData = await request.formData();
    const isCurrentRaw = getFormString(formData, "isCurrent") === "true";

    const parsed = historicalCommanderCreateSchema.safeParse({
      officerId: getFormString(formData, "officerId") ?? "",
      startDate: getFormString(formData, "startDate") ?? "",
      isCurrent: isCurrentRaw,
      endDate: isCurrentRaw
        ? ""
        : (getFormString(formData, "endDate") ?? ""),
      previousCommanderEndDate:
        getFormString(formData, "previousCommanderEndDate") ?? "",
      notes: getFormString(formData, "notes") ?? "",
    });

    if (!parsed.success) {
      return apiError(errors.validationFailed, 400, parsed.error.issues);
    }

    const officer = await Officer.findById(parsed.data.officerId).lean<{
      _id: unknown;
      militaryId: string;
      fullName: string;
      rank: string;
      isArkanHarb?: boolean;
      seniorityNumber?: string;
      photoUrl?: string;
    } | null>();

    if (!officer) {
      return apiError("الضابط المختار غير موجود في سجل الضباط", 404);
    }

    const activeCurrentCommander = await HistoricalCommander.findOne({
      isCurrent: true,
    });

    let previousEndDateIso: string | undefined;

    if (parsed.data.isCurrent && activeCurrentCommander) {
      previousEndDateIso = parsed.data.previousCommanderEndDate;
      if (!previousEndDateIso) {
        return apiError(
          "يوجد قائد حالي نشط؛ يرجى تحديد تاريخ انتهاء قيادته لإغلاق سجله ذرياً",
          400,
        );
      }

      const prevStartIso =
        toIsoDateOnly(activeCurrentCommander.startDate) ?? "";
      if (previousEndDateIso < prevStartIso) {
        return apiError(
          "تاريخ انتهاء القائد الحالي السابق لا يمكن أن يسبق تاريخ بداية قيادته",
          400,
        );
      }
      if (previousEndDateIso > parsed.data.startDate) {
        return apiError(
          "تاريخ انتهاء القائد الحالي السابق يجب ألا يتجاوز تاريخ تولي القائد الجديد",
          400,
        );
      }
    }

    const overlap = await findOverlappingCommander({
      startDate: parsed.data.startDate,
      endDate: parsed.data.endDate,
      isCurrent: parsed.data.isCurrent,
      closedCurrentCommanderId:
        parsed.data.isCurrent && activeCurrentCommander
          ? activeCurrentCommander._id.toString()
          : undefined,
      closedCurrentEndDate: previousEndDateIso,
    });

    if (overlap) {
      return apiError(
        `تتعارض فترة القيادة المدخلة مع فترة القائد (${overlap.officerSnapshot.fullName}) من ${overlap.startDate}${overlap.endDate ? ` إلى ${overlap.endDate}` : " حتى الآن"}`,
        409,
      );
    }

    const uploadedPhotos = extractFormFiles(formData, "photo");
    if (uploadedPhotos.length > 0) {
      const uploadRes = await saveHistoricalImage(
        uploadedPhotos[0],
        "commanders",
      );
      if (!uploadRes.success) {
        return apiError(uploadRes.error ?? "فشل رفع صورة القائد", 400);
      }
      savedPhotoPath = uploadRes.filePath;
    } else if (officer.photoUrl) {
      savedPhotoPath = await copyOfficerPhotoToHistorical(
        officer.photoUrl,
        officer.militaryId,
      );
    }

    if (parsed.data.isCurrent && activeCurrentCommander && previousEndDateIso) {
      closedPreviousId = activeCurrentCommander._id.toString();
      closedPreviousOldStartDate = activeCurrentCommander.startDate;
      activeCurrentCommander.isCurrent = false;
      activeCurrentCommander.endDate = toUtcMiddayDate(previousEndDateIso);
      await activeCurrentCommander.save();
    }

    const formattedRank =
      formatOfficerRank(officer.rank, officer.isArkanHarb) || officer.rank;

    const created = await HistoricalCommander.create({
      officerId: officer._id,
      officerSnapshot: {
        militaryId: officer.militaryId,
        fullName: officer.fullName,
        rank: formattedRank,
        seniorityNumber: officer.seniorityNumber ?? "",
      },
      photoUrl: savedPhotoPath,
      startDate: toUtcMiddayDate(parsed.data.startDate),
      endDate:
        !parsed.data.isCurrent && parsed.data.endDate
          ? toUtcMiddayDate(parsed.data.endDate)
          : undefined,
      isCurrent: parsed.data.isCurrent,
      notes: parsed.data.notes,
      createdBy: guard.user.id,
    });

    if (closedPreviousId && activeCurrentCommander && previousEndDateIso) {
      await logAuditEvent({
        userId: guard.user.id,
        userName: guard.user.fullName,
        action: "UPDATE",
        module: "historical_record",
        targetId: closedPreviousId,
        description: `إغلاق فترة قيادة القائد السابق (${activeCurrentCommander.officerSnapshot.fullName}) بتاريخ ${previousEndDateIso} تلقائياً عند تعيين قائد حالي جديد`,
        ipAddress: guard.ip,
      });
    }

    await logAuditEvent({
      userId: guard.user.id,
      userName: guard.user.fullName,
      action: "CREATE",
      module: "historical_record",
      targetId: created._id.toString(),
      description: `تسجيل قائد وحدة في السجل التاريخي: ${created.officerSnapshot.rank} / ${created.officerSnapshot.fullName} (بداية: ${parsed.data.startDate})`,
      ipAddress: guard.ip,
    });

    const dto = serializeHistoricalCommander({
      _id: created._id,
      officerId: created.officerId,
      officerSnapshot: created.officerSnapshot,
      photoUrl: created.photoUrl,
      startDate: created.startDate,
      endDate: created.endDate,
      isCurrent: created.isCurrent,
      notes: created.notes,
      createdBy: { _id: guard.user.id, fullName: guard.user.fullName },
      createdAt: created.createdAt,
      updatedAt: created.updatedAt,
    });

    return apiSuccess(dto, 201);
  } catch (error) {
    if (closedPreviousId && closedPreviousOldStartDate !== undefined) {
      await HistoricalCommander.updateOne(
        { _id: closedPreviousId },
        { $set: { isCurrent: true }, $unset: { endDate: 1 } },
      ).catch((rollbackErr) => {
        console.error("Failed to rollback previous current commander:", rollbackErr);
      });
    }
    if (savedPhotoPath) {
      await unlinkHistoricalFiles([savedPhotoPath]);
    }
    return handleApiError(error, "فشل تسجيل القائد في السجل التاريخي");
  }
}
