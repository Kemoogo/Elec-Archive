import { redirect } from "next/navigation";
import { authenticate } from "@/lib/auth/middleware";
import { connectToDatabase } from "@/lib/db/connect";
import { Student } from "@/lib/db/models/Student";
import { StudentProfile } from "@/components/students/StudentProfile";
import { StudentForm } from "@/components/students/StudentForm";
import { DocumentUpload } from "@/components/students/DocumentUpload";
import { PageContainer } from "@/components/layout/PageContainer";
import { PageHeader } from "@/components/layout/ModernPageHeader";
import type { Types } from "mongoose";

import Link from "next/link";
import { GraduationCap } from "lucide-react";

interface StudentProfilePageProps {
  params: Promise<{ id: string }>;
}

export default async function StudentProfilePage({ params }: StudentProfilePageProps) {
  const auth = await authenticate();
  if (!auth.success) {
    redirect("/login");
  }

  const user = auth.user!;
  if (user.role !== "admin" && user.permissions.students === "none") {
    redirect("/");
  }

  await connectToDatabase();

  const { id } = await params;
  const student = await Student.findById(id).lean();
  if (!student) {
    redirect("/students");
  }

  const serialized = {
    _id: (student._id as Types.ObjectId).toString(),
    studentId: student.studentId,
    fullName: student.fullName,
    enrollDate: (student.enrollDate as Date).toISOString(),
    status: student.status,
    documents: (
      student.documents as {
        name: string;
        fileUrl: string;
        uploadedAt: Date;
      }[]
    ).map((d) => ({
      name: d.name,
      fileUrl: d.fileUrl,
      uploadedAt: d.uploadedAt.toISOString(),
    })),
    notes: student.notes,
    createdAt: (student.createdAt as Date).toISOString(),
    updatedAt: (student.updatedAt as Date).toISOString(),
  };

  const canEdit = user.role === "admin" || user.permissions.students === "edit";

  return (
    <PageContainer className="max-w-[1600px] mx-auto pb-12">
      <PageHeader
        icon={<GraduationCap className="w-6 h-6" />}
        title={
          <span className="flex items-center gap-2 flex-wrap">
            <Link
              href="/students"
              className="text-(--color-primary) hover:underline hover:text-blue-600 transition-colors"
            >
              شئون الطلاب
            </Link>
            <span className="text-(--app-muted-foreground)/50 font-semibold">-</span>
            <span>{student.fullName} ({student.studentId})</span>
          </span>
        }
        description="بيانات الملف الدراسي والسجل العام للطالب والوثائق الأكاديمية المرفقة"
      />
      <StudentProfile
        student={serialized}
        canEdit={canEdit}
      />

      {canEdit && student.status === "active" && (
        <div className="space-y-4">
          <DocumentUpload studentId={serialized._id} />
        </div>
      )}

      {canEdit && student.status === "active" && (
        <div className="rounded-lg border border-(--app-border) p-4">
          <h2 className="mb-3 text-sm font-medium text-(--app-muted-foreground)">تعديل البيانات</h2>
          <StudentForm
            mode="edit"
            initialData={{
              _id: serialized._id,
              studentId: serialized.studentId,
              fullName: serialized.fullName,
              enrollDate: serialized.enrollDate,
              notes: serialized.notes,
            }}
          />
        </div>
      )}
    </PageContainer>
  );
}
