import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { authenticate } from "@/lib/auth/middleware";
import { connectToDatabase } from "@/lib/db/connect";
import { Department } from "@/lib/db/models/Department";
import { logAuditEvent } from "@/lib/auth/audit";
import { Types } from "mongoose";

export async function POST(req: Request) {
  const auth = await authenticate();
  if (!auth.success) {
    return NextResponse.json({ success: false, error: "غير مصرح" }, { status: 401 });
  }

  const user = auth.user!;
  const isAllowed = user.role === "admin";
  if (!isAllowed) {
    return NextResponse.json({ success: false, error: "غير مصرح لك بإعادة ترتيب الأقسام" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { id, direction, orderedIds, branchId } = body as {
      id?: string;
      direction?: "up" | "down";
      orderedIds?: string[];
      branchId?: string;
    };

    await connectToDatabase();

    // 1. If explicit orderedIds array provided
    if (Array.isArray(orderedIds) && orderedIds.length > 0) {
      const validIds = orderedIds.filter((did) => Types.ObjectId.isValid(did));
      if (validIds.length > 0) {
        await Department.bulkWrite(
          validIds.map((depId, index) => ({
            updateOne: {
              filter: { _id: new Types.ObjectId(depId) },
              update: { $set: { order: index + 1 } },
            },
          }))
        );

        await logAuditEvent({
          userId: user.id,
          userName: user.fullName || user.username,
          action: "UPDATE",
          module: "users",
          targetId: validIds[0],
          description: "إعادة ترتيب الأقسام بالكامل",
        });

        revalidatePath("/arkan-harb");
        revalidatePath("/admin/departments");
      }
      return NextResponse.json({ success: true, message: "تم تحديث ترتيب الأقسام بنجاح" });
    }

    // 2. If single item with direction
    if (!id || !direction) {
      return NextResponse.json({ success: false, error: "بيانات الترتيب غير مكتملة" }, { status: 400 });
    }

    const currentDep = await Department.findById(id).lean();
    if (!currentDep) {
      return NextResponse.json({ success: false, error: "القسم غير موجود" }, { status: 404 });
    }

    const targetBranchId = branchId || currentDep.branchId;
    const siblingDeps = await Department.find({ branchId: targetBranchId }).sort({ order: 1, name: 1 }).lean();

    const currentIndex = siblingDeps.findIndex((d) => d._id.toString() === id);
    if (currentIndex === -1) {
      return NextResponse.json({ success: false, error: "القسم غير موجود في هذا الفرع" }, { status: 404 });
    }

    const targetIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;

    if (targetIndex < 0 || targetIndex >= siblingDeps.length) {
      // Already at top or bottom
      return NextResponse.json({ success: true, message: "القسم في نهاية قائمة هذا الفرع بالفعل" });
    }

    // Swap items in sibling list
    const temp = siblingDeps[currentIndex];
    siblingDeps[currentIndex] = siblingDeps[targetIndex];
    siblingDeps[targetIndex] = temp;

    // Persist new orders using bulkWrite
    await Department.bulkWrite(
      siblingDeps.map((dep, index) => ({
        updateOne: {
          filter: { _id: dep._id },
          update: { $set: { order: index + 1 } },
        },
      }))
    );

    await logAuditEvent({
      userId: user.id,
      userName: user.fullName || user.username,
      action: "UPDATE",
      module: "users",
      targetId: id,
      description: `إعادة ترتيب الأقسام: نقل قسم ${siblingDeps[targetIndex].name} ${direction === "up" ? "للأعلى" : "للأسفل"}`,
    });

    revalidatePath("/arkan-harb");
    revalidatePath("/admin/departments");

    return NextResponse.json({ success: true, message: "تم تغيير ترتيب القسم بنجاح" });
  } catch {
    return NextResponse.json({ success: false, error: "فشل في إعادة ترتيب الأقسام" }, { status: 500 });
  }
}
