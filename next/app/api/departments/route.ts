import { NextResponse } from "next/server";
import { authenticate } from "@/lib/auth/middleware";
import { connectToDatabase } from "@/lib/db/connect";
import { Department } from "@/lib/db/models/Department";
import { Branch } from "@/lib/db/models/Branch";
import { createDepartmentSchema } from "@/lib/validations/department";
import { logAuditEvent } from "@/lib/auth/audit";

// Seed default branches & departments if empty
async function seedDefaultBranchesAndDepartmentsIfNeeded() {
  const branchCount = await Branch.countDocuments();
  if (branchCount > 0) return;

  const defaultBranches = [
    { name: "فرع الاتصالات والفاكس", order: 1, departments: [{ name: "قسم الفاكس والأرشيف", code: "fax" }] },
    { name: "فرع شئون الضباط", order: 2, departments: [{ name: "قسم الضباط", code: "officers" }, { name: "قسم أركان حرب", code: "arkan_harb" }] },
    { name: "فرع الخدمات الطبية", order: 3, departments: [{ name: "العيادة والنقطة الطبية", code: "medical" }] },
    { name: "فرع شئون الطلبة والتعليم", order: 4, departments: [{ name: "قسم الطلبة", code: "students" }, { name: "قسم التعليم والتدريب", code: "education" }] },
  ];

  for (const bData of defaultBranches) {
    const branch = await Branch.create({ name: bData.name, order: bData.order });
    for (let i = 0; i < bData.departments.length; i++) {
      const dep = bData.departments[i];
      await Department.create({
        name: dep.name,
        code: dep.code,
        branchId: branch._id,
        order: i + 1,
      });
    }
  }
}

export async function GET(req: Request) {
  const auth = await authenticate();
  if (!auth.success) {
    return NextResponse.json({ success: false, error: "غير مصرح" }, { status: 401 });
  }

  try {
    await connectToDatabase();
    await seedDefaultBranchesAndDepartmentsIfNeeded();

    const { searchParams } = new URL(req.url);
    const branchId = searchParams.get("branchId");

    const query: Record<string, unknown> = {};
    if (branchId) {
      query.branchId = branchId;
    }

    const departments = await Department.find(query)
      .populate("branchId", "name code")
      .sort({ order: 1, name: 1 })
      .lean();

    return NextResponse.json({ success: true, departments });
  } catch {
    return NextResponse.json({ success: false, error: "حدث خطأ أثناء جلب الأقسام" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const auth = await authenticate();
  if (!auth.success) {
    return NextResponse.json({ success: false, error: "غير مصرح" }, { status: 401 });
  }

  const user = auth.user!;
  const isAllowed = user.role === "admin";
  if (!isAllowed) {
    return NextResponse.json({ success: false, error: "غير مصرح لك بإضافة قسم جديد" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const parsed = createDepartmentSchema.parse(body);

    await connectToDatabase();

    const branch = await Branch.findById(parsed.branchId);
    if (!branch) {
      return NextResponse.json({ success: false, error: "الفرع المختار غير موجود" }, { status: 400 });
    }

    const existing = await Department.findOne({ name: parsed.name, branchId: parsed.branchId });
    if (existing) {
      return NextResponse.json({ success: false, error: "يوجد قسم بهذا الاسم تحت نفس الفرع بالفعل" }, { status: 400 });
    }

    const department = await Department.create(parsed);
    await department.populate("branchId", "name code");

    await logAuditEvent({
      userId: user.id,
      userName: user.fullName || user.username,
      action: "CREATE",
      module: "users",
      targetId: department._id.toString(),
      description: `إضافة قسم جديد (${department.name}) في فرع (${branch.name})`,
    });

    return NextResponse.json({ success: true, department }, { status: 201 });
  } catch (error: unknown) {
    if (error && typeof error === "object" && "name" in error && error.name === "ZodError") {
      return NextResponse.json({ success: false, error: "البيانات المدخلة غير صحيحة", details: error }, { status: 400 });
    }
    return NextResponse.json({ success: false, error: "فشل في إضافة القسم" }, { status: 500 });
  }
}
