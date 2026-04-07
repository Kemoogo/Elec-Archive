import { redirect } from "next/navigation";
import { authenticate } from "@/lib/auth/middleware";
import { connectToDatabase } from "@/lib/db/connect";
import { Course } from "@/lib/db/models/Course";
import { CourseDetail } from "@/components/education/CourseDetail";
import { CourseForm } from "@/components/education/CourseForm";
import { ParticipantPicker } from "@/components/education/ParticipantPicker";
import { CourseDocumentUpload } from "@/components/education/CourseDocumentUpload";
import { PageContainer } from "@/components/layout/PageContainer";
import { PageHeader } from "@/components/layout/ModernPageHeader";
import type { Types } from "mongoose";

interface CourseDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function CourseDetailPage({ params }: CourseDetailPageProps) {
  const auth = await authenticate();
  if (!auth.success) redirect("/login");

  const user = auth.user!;
  if (user.role !== "admin" && user.permissions.education === "none") redirect("/");

  await connectToDatabase();

  const { id } = await params;
  const course = await Course.findById(id).populate("participants", "fullName militaryId studentId").lean();
  if (!course) redirect("/education");

  const serialized = {
    _id: (course._id as Types.ObjectId).toString(),
    title: course.title,
    description: course.description,
    startDate: (course.startDate as Date).toISOString(),
    endDate: (course.endDate as Date).toISOString(),
    status: course.status,
    participantModel: course.participantModel as "Officer" | "Student",
    participants: (course.participants as Record<string, unknown>[]).map((p) => ({
      _id: (p._id as Types.ObjectId).toString(),
      fullName: p.fullName as string,
      militaryId: p.militaryId as string | undefined,
      studentId: p.studentId as string | undefined,
    })),
    documents: (course.documents as { name: string; fileUrl: string }[]).map((d) => ({
      name: d.name,
      fileUrl: d.fileUrl,
    })),
    createdAt: (course.createdAt as Date).toISOString(),
  };

  const canEdit = user.role === "admin" || user.permissions.education === "edit";

  return (
    <PageContainer className="max-w-[1600px] mx-auto pb-12">
      <PageHeader
        title={course.title}
        backHref="/education"
        backLabel="التعليم والدورات"
      />
      <CourseDetail course={serialized} canEdit={canEdit} />

      {canEdit && (
        <div className="space-y-4">
          <ParticipantPicker courseId={serialized._id} participantModel={serialized.participantModel} />
          <CourseDocumentUpload courseId={serialized._id} />
        </div>
      )}

      {canEdit && (
        <div className="rounded-lg border border-(--app-border) p-4">
          <h2 className="mb-3 text-sm font-medium text-(--app-muted-foreground)">تعديل الدورة</h2>
          <CourseForm
            mode="edit"
            initialData={{
              _id: serialized._id,
              title: serialized.title,
              description: serialized.description,
              startDate: serialized.startDate,
              endDate: serialized.endDate,
              status: serialized.status,
            }}
          />
        </div>
      )}
    </PageContainer>
  );
}
