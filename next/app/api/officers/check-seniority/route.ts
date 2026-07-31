import { NextResponse } from "next/server";
import { authenticate } from "@/lib/auth/middleware";
import { connectToDatabase } from "@/lib/db/connect";
import { Officer } from "@/lib/db/models/Officer";
import { handleApiError } from "@/lib/utils/api-error";
import { canEditOfficers } from "@/lib/officers/access";

export async function POST(request: Request) {
  try {
    const auth = await authenticate();
    if (!auth.success || !canEditOfficers(auth.user!)) {
      return NextResponse.json({ success: false, error: "غير مصرح لك بإجراء هذه العملية" }, { status: 403 });
    }

    const { seniorityNumber } = await request.json();

    if (!seniorityNumber) {
      return NextResponse.json({ success: false, error: "رقم الأقدمية مطلوب" }, { status: 400 });
    }

    await connectToDatabase();

    const existing = await Officer.findOne({ seniorityNumber }).lean();

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
