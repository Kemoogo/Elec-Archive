import { NextResponse } from "next/server";
import { z } from "zod";
import { connectToDatabase } from "@/lib/db/connect";
import { authenticate } from "@/lib/auth/middleware";
import { logAuditEvent } from "@/lib/auth/audit";
import { errors } from "@/lib/auth/errors";
import { SystemSetting, DEFAULT_UNIT_NAME } from "@/lib/db/models";

const updateUnitNameSchema = z.object({
  unitName: z.string().trim().min(2, "اسم الوحدة يجب أن يتكون من حرفين على الأقل").max(120, "اسم الوحدة طويل جداً"),
});

export async function GET() {
  const auth = await authenticate();
  if (!auth.success) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
  }

  try {
    await connectToDatabase();
    const setting = await SystemSetting.findOne({ key: "unit_name" }).lean();
    const unitName = setting?.value?.trim() || DEFAULT_UNIT_NAME;

    return NextResponse.json({
      success: true,
      data: { unitName },
    });
  } catch (error) {
    console.error("GET /api/settings/unit-name error:", error);
    return NextResponse.json({ success: false, error: "فشل في جلب اسم الوحدة" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const auth = await authenticate();
  if (!auth.success) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
  }

  // Strictly Admin only
  if (auth.user?.role !== "admin") {
    return NextResponse.json(
      { success: false, error: errors.insufficientPermissions },
      { status: 403 }
    );
  }

  try {
    const body = await request.json();
    const parsed = updateUnitNameSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0]?.message || errors.validationFailed },
        { status: 400 }
      );
    }

    await connectToDatabase();
    const { unitName } = parsed.data;

    const setting = await SystemSetting.findOneAndUpdate(
      { key: "unit_name" },
      {
        $set: {
          value: unitName,
          updatedBy: auth.user.id,
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    // Audit log
    await logAuditEvent({
      userId: auth.user.id,
      userName: auth.user.fullName,
      action: "UPDATE",
      module: "users",
      description: `تعديل وتخصيص اسم الوحدة العسكرية إلى: "${unitName}"`,
      targetId: setting._id.toString(),
      ipAddress: request.headers.get("x-forwarded-for") ?? "",
    });

    return NextResponse.json({
      success: true,
      data: { unitName: setting.value },
    });
  } catch (error) {
    console.error("POST /api/settings/unit-name error:", error);
    return NextResponse.json({ success: false, error: "فشل في حفظ اسم الوحدة" }, { status: 500 });
  }
}
