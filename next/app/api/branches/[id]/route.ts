import { NextResponse } from "next/server";
import { authenticate } from "@/lib/auth/middleware";
import { connectToDatabase } from "@/lib/db/connect";
import { Branch } from "@/lib/db/models/Branch";
import { Department } from "@/lib/db/models/Department";
import { updateBranchSchema } from "@/validations/department";
import { logAuditEvent } from "@/lib/auth/audit";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await authenticate();
  if (!auth.success) {
    return NextResponse.json({ success: false, error: "غير مصرح" }, { status: 401 });
  }

  const user = auth.user!;
  const isAllowed = user.role === "admin";
  if (!isAllowed) {
    return NextResponse.json({ success: false, error: "غير مصرح لك بتعديل هذا الفرع" }, { status: 403 });
  }

  try {
    const { id } = await params;
    const body = await req.json();
    const parsed = updateBranchSchema.parse(body);

    await connectToDatabase();

    const branch = await Branch.findById(id);
    if (!branch) {
      return NextResponse.json({ success: false, error: "الفرع غير موجود" }, { status: 404 });
    }

    if (parsed.name && parsed.name !== branch.name) {
      const existing = await Branch.findOne({ name: parsed.name, _id: { $ne: id } });
      if (existing) {
        return NextResponse.json({ success: false, error: "يوجد فرع آخر بهذا الاسم" }, { status: 400 });
      }
    }

    Object.assign(branch, parsed);
    await branch.save();

    await logAuditEvent({
      userId: user.id,
      userName: user.fullName || user.username,
      action: "UPDATE",
      module: "users",
      targetId: branch._id.toString(),
      description: `تعديل بيانات الفرع: ${branch.name}`,
    });

    return NextResponse.json({ success: true, branch });
  } catch (error: unknown) {
    if (error && typeof error === "object" && "name" in error && error.name === "ZodError") {
      return NextResponse.json({ success: false, error: "البيانات المدخلة غير صحيحة", details: error }, { status: 400 });
    }
    return NextResponse.json({ success: false, error: "فشل في تحديث الفرع" }, { status: 500 });
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await authenticate();
  if (!auth.success) {
    return NextResponse.json({ success: false, error: "غير مصرح" }, { status: 401 });
  }

  const user = auth.user!;
  const isAllowed = user.role === "admin";
  if (!isAllowed) {
    return NextResponse.json({ success: false, error: "غير مصرح لك بحذف هذا الفرع" }, { status: 403 });
  }

  try {
    const { id } = await params;
    await connectToDatabase();

    const branch = await Branch.findById(id);
    if (!branch) {
      return NextResponse.json({ success: false, error: "الفرع غير موجود" }, { status: 404 });
    }

    const depCount = await Department.countDocuments({ branchId: id });
    if (depCount > 0) {
      return NextResponse.json({ success: false, error: `لا يمكن حذف الفرع لأنه يحتوي على ${depCount} قسم تكتيكي. يرجى حذف الأقسام أو نقلها أولاً.` }, { status: 400 });
    }

    await Branch.findByIdAndDelete(id);

    await logAuditEvent({
      userId: user.id,
      userName: user.fullName || user.username,
      action: "DELETE",
      module: "users",
      targetId: id,
      description: `حذف الفرع: ${branch.name}`,
    });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ success: false, error: "فشل في حذف الفرع" }, { status: 500 });
  }
}
