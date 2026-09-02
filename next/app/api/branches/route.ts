import { NextResponse } from "next/server";
import { authenticate } from "@/lib/auth/middleware";
import { connectToDatabase } from "@/lib/db/connect";
import { Branch } from "@/lib/db/models/Branch";
import { createBranchSchema } from "@/validations/department";
import { logAuditEvent } from "@/lib/auth/audit";
import { canEditModule } from "@/lib/auth/authorization";

export async function GET() {
  const auth = await authenticate();
  if (!auth.success) {
    return NextResponse.json({ success: false, error: "غير مصرح" }, { status: 401 });
  }

  try {
    await connectToDatabase();
    const branches = await Branch.find().sort({ order: 1, name: 1 }).lean();
    return NextResponse.json({ success: true, branches });
  } catch {
    return NextResponse.json({ success: false, error: "حدث خطأ أثناء جلب الفروع" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const auth = await authenticate();
  if (!auth.success) {
    return NextResponse.json({ success: false, error: "غير مصرح" }, { status: 401 });
  }

  const user = auth.user!;
  const isAllowed = user.role === "admin" || user.role === "commander" || canEditModule(user, "arkan_harb");
  if (!isAllowed) {
    return NextResponse.json({ success: false, error: "غير مصرح لك بإضافة فرع جديد" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const parsed = createBranchSchema.parse(body);

    await connectToDatabase();

    const existing = await Branch.findOne({ name: parsed.name });
    if (existing) {
      return NextResponse.json({ success: false, error: "يوجد فرع بهذا الاسم بالفعل" }, { status: 400 });
    }

    const branch = await Branch.create(parsed);

    await logAuditEvent({
      userId: user.id,
      userName: user.fullName || user.username,
      action: "CREATE",
      module: "users",
      targetId: branch._id.toString(),
      description: `إضافة فرع جديد: ${branch.name}`,
    });

    return NextResponse.json({ success: true, branch }, { status: 201 });
  } catch (error: unknown) {
    if (error && typeof error === "object" && "name" in error && error.name === "ZodError") {
      return NextResponse.json({ success: false, error: "البيانات المدخلة غير صحيحة", details: error }, { status: 400 });
    }
    return NextResponse.json({ success: false, error: "فشل في إضافة الفرع" }, { status: 500 });
  }
}
