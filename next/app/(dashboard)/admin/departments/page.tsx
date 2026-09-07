export const dynamic = "force-dynamic";
export const revalidate = 0;

import { redirect } from "next/navigation";
import { authenticate } from "@/lib/auth/middleware";
import { connectToDatabase } from "@/lib/db/connect";
import { Branch, Department } from "@/lib/db/models";
import { DepartmentsPageClient } from "@/components/admin/DepartmentsPageClient";

export default async function DepartmentsPage() {
  const result = await authenticate();
  if (!result.success) {
    redirect("/login");
  }

  const user = result.user!;
  if (user.role !== "admin") {
    redirect("/");
  }

  await connectToDatabase();

  const [branches, departments] = await Promise.all([
    Branch.find().sort({ order: 1, createdAt: 1 }).lean(),
    Department.find().populate("branchId", "name").sort({ order: 1, createdAt: 1 }).lean(),
  ]);

  const serializedBranches = branches.map((b) => ({
    _id: b._id.toString(),
    name: b.name,
    code: b.code || "",
    description: b.description || "",
    isActive: b.isActive ?? true,
    order: b.order ?? 0,
  }));

  const serializedDepartments = departments.map((d) => {
    const bObj = typeof d.branchId === "object" && d.branchId ? (d.branchId as { _id?: { toString: () => string }; name?: string }) : null;
    return {
      _id: d._id.toString(),
      name: d.name,
      code: d.code || "",
      branchId: bObj && bObj._id ? { _id: bObj._id.toString(), name: bObj.name || "" } : d.branchId ? d.branchId.toString() : "",
      description: d.description || "",
      isActive: d.isActive ?? true,
      order: d.order ?? 0,
    };
  });

  const canEdit = user.role === "admin";

  return (
    <DepartmentsPageClient
      initialBranches={serializedBranches}
      initialDepartments={serializedDepartments}
      canEdit={canEdit}
    />
  );
}
