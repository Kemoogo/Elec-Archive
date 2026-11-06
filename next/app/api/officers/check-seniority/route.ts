import { NextResponse } from "next/server";
import { authenticate } from "@/lib/auth/middleware";
import { connectToDatabase } from "@/lib/db/connect";
import { Officer } from "@/lib/db/models/Officer";
import { handleApiError } from "@/lib/utils/api-error";
import { canEditOfficers } from "@/lib/officers/access";
import { checkApiRateLimit, rateLimitErrorResponse } from "@/lib/security/rate-limit";
import { z } from "zod";
import { Types } from "mongoose";

const checkSenioritySchema = z.object({
  seniorityNumber: z.preprocess(
    (val) => (typeof val === "number" ? String(val) : typeof val === "string" ? val.trim() : val),
    z.string().min(1, "رقم الأقدمية مطلوب").regex(/^\d{5,}(?:[A-Za-z\u0600-\u06FF]+\d*)?$/, "رقم الأقدمية غير صالح")
  ),
  excludeOfficerId: z.string().optional(),
});

export async function POST(request: Request) {
  try {
    const auth = await authenticate();
    if (!auth.success || !canEditOfficers(auth.user!)) {
      return NextResponse.json({ success: false, error: "غير مصرح لك بإجراء هذه العملية" }, { status: 403 });
    }

    const ip = request.headers.get("x-forwarded-for") ?? "";
    const rl = checkApiRateLimit(auth.user!.id, ip, "read");
    if (!rl.allowed) {
      return NextResponse.json(rateLimitErrorResponse(rl.resetAt), { status: 429 });
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ success: false, error: "بيانات الطلب غير صالحة" }, { status: 400 });
    }

    const parsed = checkSenioritySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0]?.message || "رقم الأقدمية غير صالح" },
        { status: 400 }
      );
    }

    const { seniorityNumber, excludeOfficerId } = parsed.data;

    if (excludeOfficerId && !Types.ObjectId.isValid(excludeOfficerId)) {
      return NextResponse.json(
        { success: false, error: "معرف الضابط المستثنى غير صالح" },
        { status: 400 }
      );
    }

    await connectToDatabase();

    const query: Record<string, unknown> = { seniorityNumber };
    if (excludeOfficerId) {
      query._id = { $ne: new Types.ObjectId(excludeOfficerId) };
    }

    const existing = await Officer.findOne(query).lean();

    if (existing) {
      // ضابط لا يزال نشطاً وفي الوحدة — منع الإضافة
      if (existing.isInUnit && existing.employmentStatus === "active") {
        return NextResponse.json({
          success: false,
          error: `رقم الأقدمية مسجل لضابط نشط بالوحدة: ${existing.fullName}`,
        }, { status: 409 });
      }

      // ضابط متقاعد — منع العودة عبر هذا التدفق
      if (existing.employmentStatus === "retired") {
        return NextResponse.json({
          success: false,
          error: `رقم الأقدمية هذا لضابط متقاعد (${existing.fullName}) ولا يمكن إعادة تسجيله.`,
        }, { status: 409 });
      }

      // ضابط سابق (خارج الوحدة) — تدفق العودة
      return NextResponse.json({
        success: false,
        data: {
          existingId: existing._id.toString(),
          fullName: existing.fullName,
          rank: existing.rank,
          militaryId: existing.militaryId,
          isInUnit: existing.isInUnit,
          employmentStatus: existing.employmentStatus,
        },
        error: "رقم الأقدمية هذا مسجل مسبقاً لضابط سابق."
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return handleApiError(error, "حدث خطأ أثناء فحص البيانات");
  }
}
