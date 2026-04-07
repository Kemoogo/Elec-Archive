
import { NextResponse } from "next/server";
import { authenticate } from "@/lib/auth/middleware";
import { connectToDatabase } from "@/lib/db/connect";
import { Officer } from "@/lib/db/models/Officer";
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

    // البحث عن ضابط موجود بنفس رقم الأقدمية
    const existing = await Officer.findOne({ seniorityNumber }).lean();

    if (existing) {
      return NextResponse.json({
        success: false,
        data: {
          existingId: existing._id.toString(),
          fullName: existing.fullName,
          rank: existing.rank,
          employmentStatus: existing.employmentStatus,
        },
        error: "رقم الأقدمية هذا مسجل مسبقاً لضابط آخر."
      });
    }

    // إذا لم يكن موجوداً، فالعملية ناجحة ويمكن المتابعة
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DEBUG: Seniority Check Error", error);
    return NextResponse.json({ success: false, error: "حدث خطأ أثناء فحص البيانات" }, { status: 500 });
  }
}
