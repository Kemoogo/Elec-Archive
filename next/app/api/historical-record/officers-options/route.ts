import { apiSuccess, handleApiError } from "@/lib/api-response";
import { queryHistoricalOfficerOptions } from "@/lib/historical-record/queries";
import { requireHistoricalAccess } from "@/lib/historical-record/route-guard";

/**
 * Returns ALL officers across the unit (isInUnit: true | false)
 * exclusively for selecting Unit Commanders in the Historical Record module.
 */
export async function GET(request: Request) {
  try {
    const guard = await requireHistoricalAccess(request, "view", "read");
    if (!guard.ok) return guard.response;

    const options = await queryHistoricalOfficerOptions();
    return apiSuccess(options);
  } catch (error) {
    return handleApiError(error, "فشل تحميل قائمة الضباط للسجل التاريخي");
  }
}
