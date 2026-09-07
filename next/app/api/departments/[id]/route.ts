import { NextResponse } from "next/server";
import { authenticate } from "@/lib/auth/middleware";
import { connectToDatabase } from "@/lib/db/connect";
import { Department } from "@/lib/db/models/Department";
import { updateDepartmentSchema } from "@/validations/department";
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
    return NextResponse.json({ success: false, error: "غير مصرح لك بتعديل هذا القسم" }, { status: 403 });
  }

  try {
    const { id } = await params;
    const body = await req.json();
    const parsed = updateDepartmentSchema.parse(body);

    await connectToDatabase();

    const department = await Department.findById(id);
    if (!department) {
      return NextResponse.json({ success: false, error: "القسم غير موجود" }, { status: 404 });
    }

    const targetBranchId = parsed.branchId || department.branchId;
    if (parsed.name) {
      const existing = await Department.findOne({
        name: parsed.name,
        branchId: targetBranchId,
        _id: { $ne: id },
      });
      if (existing) {
        return NextResponse.json({ success: false, error: "يوجد قسم آخر بهذا الاسم تحت نفس الفرع" }, { status: 400 });
      }
    }

    Object.assign(department, parsed);
    await department.save();
    await department.populate("branchId", "name code");

    await logAuditEvent({
      userId: user.id,
      userName: user.fullName || user.username,
      action: "UPDATE",
      module: "users",
      targetId: department._id.toString(),
      description: `تعديل بيانات القسم: ${department.name}`,
    });

    return NextResponse.json({ success: true, department });
  } catch (error: unknown) {
    if (error && typeof error === "object" && "name" in error && error.name === "ZodError") {
      return NextResponse.json({ success: false, error: "البيانات المدخلة غير صحيحة", details: error }, { status: 400 });
    }
    return NextResponse.json({ success: false, error: "فشل في تحديث القسم" }, { status: 500 });
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
    return NextResponse.json({ success: false, error: "غير مصرح لك بحذف هذا القسم" }, { status: 403 });
  }

  try {
    const { id } = await params;
    await connectToDatabase();

    const department = await Department.findById(id);
    if (!department) {
      return NextResponse.json({ success: false, error: "القسم غير موجود" }, { status: 404 });
    }

    await Department.findByIdAndDelete(id);

    await logAuditEvent({
      userId: user.id,
      userName: user.fullName || user.username,
      action: "DELETE",
      module: "users",
      targetId: id,
      description: `حذف القسم: ${department.name}`,
    });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ success: false, error: "فشل في حذف القسم" }, { status: 500 });
  }
}
