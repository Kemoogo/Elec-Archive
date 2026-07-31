import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db/connect";
import { authenticate } from "@/lib/auth/middleware";
import { errors } from "@/lib/auth/errors";
import { MedicalPatient } from "@/lib/db/models/MedicalPatient";
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

    const patients = await MedicalPatient.find({
      $or: [{ patientId: searchRegex }, { patientName: searchRegex }],
    })
      .select("patientId patientName")
      .limit(limit)
      .lean();

    await logAuditEvent({
      userId: auth.user!.id,
      userName: auth.user!.fullName,
      action: "VIEW",
      module: "medical",
      description: `بحث عن مرضى: "${q}"`,
      ipAddress: ip,
    });

    return NextResponse.json({
      success: true,
      data: {
        patients: patients.map((p) => ({
          patientId: p.patientId,
          patientName: p.patientName,
        })),
      },
    });
  } catch (error) {
    return handleApiError(error, "حدث خطأ أثناء البحث عن مرضى");
  }
}
