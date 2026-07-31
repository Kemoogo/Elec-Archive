import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db/connect";
import { authenticate } from "@/lib/auth/middleware";
import { errors } from "@/lib/auth/errors";
import { Officer, RANK_LABELS } from "@/lib/db/models/Officer";
import { patientSearchQuerySchema } from "@/lib/validations/medical-record";
import { checkApiRateLimit } from "@/lib/security/rate-limit";
import { escapeRegex } from "@/lib/utils";
import { logAuditEvent } from "@/lib/auth/audit";
import { handleApiError } from "@/lib/utils/api-error";

export async function GET(request: Request) {
  const auth = await authenticate();
  if (!auth.success) {
    return NextResponse.json(
      { success: false, error: auth.error },
      { status: auth.status }
    );
  }

  const medicalPermission = auth.user!.permissions.medical;
  if (medicalPermission === "none") {
    return NextResponse.json(
      { success: false, error: errors.insufficientPermissions },
      { status: 403 }
    );
  }

  const ip = request.headers.get("x-forwarded-for") ?? "";
  const rl = checkApiRateLimit(auth.user!.id, ip, "read");
  if (!rl.allowed) {
    return NextResponse.json(
      { success: false, error: "تم تجاوز الحد المسموح، يرجى المحاولة لاحقاً" },
      { status: 429, headers: { "Retry-After": Math.ceil((rl.resetAt - Date.now()) / 1000).toString() } }
    );
  }

  try {
    await connectToDatabase();

    const { searchParams } = new URL(request.url);
    const params = Object.fromEntries(searchParams.entries());

    const parsed = patientSearchQuerySchema.safeParse(params);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: "بيانات غير صالحة", details: parsed.error.issues },
        { status: 400 }
      );
    }

    const { q, limit } = parsed.data;

    const escapedSearch = escapeRegex(q);
    const searchRegex = { $regex: escapedSearch, $options: "i" };

    // Find any rank enum values whose Arabic labels match the search query
    const matchedRanks = Object.entries(RANK_LABELS)
      .filter(([_, label]) => label.includes(q.trim()))
      .map(([rank]) => rank);

    const searchConditions: Record<string, unknown>[] = [
      { militaryId: searchRegex },
      { fullName: searchRegex }
    ];

    if (matchedRanks.length > 0) {
      searchConditions.push({ rank: { $in: matchedRanks } });
    }

    const officers = await Officer.find({
      isInUnit: true,
      employmentStatus: "active",
      $or: searchConditions
    })
      .select("militaryId fullName rank")
      .limit(limit)
      .lean();

    await logAuditEvent({
      userId: auth.user!.id,
      userName: auth.user!.fullName,
      action: "VIEW",
      module: "medical",
      description: `بحث طبي عن ضباط: "${q}"`,
      ipAddress: ip,
    });

    return NextResponse.json({
      success: true,
      data: {
        officers: officers.map((o) => {
          const rankLabel = RANK_LABELS[o.rank as keyof typeof RANK_LABELS] || "";
          return {
            militaryId: o.militaryId,
            fullName: o.fullName,
            rank: o.rank,
            rankLabel,
            formattedName: rankLabel ? `${rankLabel} / ${o.fullName}` : o.fullName,
          };
        }),
      },
    });
  } catch (error) {
    return handleApiError(error, "حدث خطأ أثناء البحث عن ضباط");
  }
}
