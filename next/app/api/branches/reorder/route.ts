import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { authenticate } from "@/lib/auth/middleware";
import { connectToDatabase } from "@/lib/db/connect";
import { Branch } from "@/lib/db/models/Branch";
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
    return NextResponse.json({ success: false, error: "غير مصرح لك بإعادة ترتيب الفروع" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { id, direction, orderedIds } = body as {
      id?: string;
      direction?: "up" | "down";
      orderedIds?: string[];
    };

    await connectToDatabase();

    // 1. If explicit orderedIds array provided
    if (Array.isArray(orderedIds) && orderedIds.length > 0) {
      const validIds = orderedIds.filter((bid) => Types.ObjectId.isValid(bid));
      if (validIds.length > 0) {
        await Branch.bulkWrite(
          validIds.map((branchId, index) => ({
            updateOne: {
              filter: { _id: new Types.ObjectId(branchId) },
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
          description: "إعادة ترتيب الفروع بالكامل",
        });

        revalidatePath("/arkan-harb");
        revalidatePath("/admin/departments");
      }
      return NextResponse.json({ success: true, message: "تم تحديث ترتيب الفروع بنجاح" });
    }

    // 2. If single item with direction
    if (!id || !direction) {
      return NextResponse.json({ success: false, error: "بيانات الترتيب غير مكتملة" }, { status: 400 });
    }

    const branches = await Branch.find().sort({ order: 1, name: 1 }).lean();
    const currentIndex = branches.findIndex((b) => b._id.toString() === id);

    if (currentIndex === -1) {
      return NextResponse.json({ success: false, error: "الفرع غير موجود" }, { status: 404 });
    }

    const targetIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;

    if (targetIndex < 0 || targetIndex >= branches.length) {
      // Already at top or bottom
      return NextResponse.json({ success: true, message: "الفرع في نهاية القائمة بالفعل" });
    }

    // Swap items in the list
    const temp = branches[currentIndex];
    branches[currentIndex] = branches[targetIndex];
    branches[targetIndex] = temp;

    // Persist new orders using bulkWrite
    await Branch.bulkWrite(
      branches.map((branch, index) => ({
        updateOne: {
          filter: { _id: branch._id },
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
      description: `إعادة ترتيب الفروع: نقل فرع ${branches[targetIndex].name} ${direction === "up" ? "للأعلى" : "للأسفل"}`,
    });

    revalidatePath("/arkan-harb");
    revalidatePath("/admin/departments");

    return NextResponse.json({ success: true, message: "تم تغيير ترتيب الفرع بنجاح" });
  } catch {
    return NextResponse.json({ success: false, error: "فشل في إعادة ترتيب الفروع" }, { status: 500 });
  }
}
