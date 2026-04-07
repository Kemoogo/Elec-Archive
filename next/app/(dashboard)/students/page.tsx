import { redirect } from "next/navigation";
import { authenticate } from "@/lib/auth/middleware";
import { connectToDatabase } from "@/lib/db/connect";
import { Student } from "@/lib/db/models/Student";
import { studentsListQuerySchema } from "@/lib/validations/student";
import { StudentList } from "@/components/students/StudentList";
import { StudentForm } from "@/components/students/StudentForm";
import { PageContainer } from "@/components/layout/PageContainer";
import { ModernPageHeader as PageHeader } from "@/components/layout/ModernPageHeader";
import { GraduationCap } from "lucide-react";
import type { Types } from "mongoose";

interface StudentsPageProps {
  searchParams: Promise<Record<string, string | undefined>>;
}

export default async function StudentsPage({ searchParams }: StudentsPageProps) {
  const auth = await authenticate();
  if (!auth.success) {
    redirect("/login");
  }

  const user = auth.user!;
  if (user.role !== "admin" && user.permissions.students === "none") {
    redirect("/");
  }

  await connectToDatabase();

  const params = await searchParams;
  const parsed = studentsListQuerySchema.safeParse(params);

  const { page, limit, status, search } = parsed.success
    ? parsed.data
    : { page: 1, limit: 20, status: undefined, search: undefined };

  const query: Record<string, unknown> = {};

  // Default to active-only unless explicitly set
  if (status === "all") {
    // no filter
  } else if (status) {
    query.status = status;
  } else {
    query.status = "active";
  }

  if (search) {
    const searchRegex = { $regex: search, $options: "i" };
    query.$or = [{ studentId: searchRegex }, { fullName: searchRegex }];
  }

  const skip = (page - 1) * limit;

  const [students, total] = await Promise.all([
    Student.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Student.countDocuments(query),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / limit));

  const serialized = students.map((s) => ({
    _id: (s._id as Types.ObjectId).toString(),
    studentId: s.studentId,
    fullName: s.fullName,
    enrollDate: (s.enrollDate as Date).toISOString(),
    status: s.status,
    documents: (s.documents as { name: string; fileUrl: string; uploadedAt: Date }[]).map((d) => ({
      name: d.name,
      fileUrl: d.fileUrl,
      uploadedAt: d.uploadedAt.toISOString(),
    })),
    notes: s.notes,
    createdAt: (s.createdAt as Date).toISOString(),
    updatedAt: (s.updatedAt as Date).toISOString(),
  }));

  const canEdit = user.role === "admin" || user.permissions.students === "edit";

  return (
    <PageContainer className="max-w-[1600px] mx-auto pb-12">
      <PageHeader
        title="شئون الطلبة"
        description="إدارة سجلات الطلبة وملفاتهم"
        icon={<GraduationCap className="w-6 h-6" />}
        action={canEdit && <StudentForm mode="create" />}
      />

      <StudentList
        students={serialized}
        page={page}
        totalPages={totalPages}
        total={total}
      />
    </PageContainer>
  );
}
