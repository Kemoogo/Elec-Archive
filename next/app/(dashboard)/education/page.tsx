import { redirect } from "next/navigation";
import { authenticate } from "@/lib/auth/middleware";
import { connectToDatabase } from "@/lib/db/connect";
import { Course } from "@/lib/db/models/Course";
import { courseListQuerySchema } from "@/lib/validations/education";
import { CourseGrid } from "@/components/education/CourseGrid";
import { CourseForm } from "@/components/education/CourseForm";
import { PageContainer } from "@/components/layout/PageContainer";
import { ModernPageHeader as PageHeader } from "@/components/layout/ModernPageHeader";
import { BookOpen } from "lucide-react";
import { escapeRegex } from "@/lib/utils";
import type { Types } from "mongoose";

interface EducationPageProps {
  searchParams: Promise<Record<string, string | undefined>>;
}

export default async function EducationPage({ searchParams }: EducationPageProps) {
  const auth = await authenticate();
  if (!auth.success) redirect("/login");

  const user = auth.user!;
  if (user.role !== "admin" && user.permissions.education === "none") redirect("/");

  await connectToDatabase();

  const params = await searchParams;
  const parsed = courseListQuerySchema.safeParse(params);
  const { page, limit, status, search } = parsed.success
    ? parsed.data
    : { page: 1, limit: 20, status: undefined, search: undefined };

  const query: Record<string, unknown> = {};
  if (status === "all") { /* no filter */ }
  else if (status) { query.status = status; }
  else { query.status = { $in: ["upcoming", "ongoing"] }; }
  if (search) query.title = { $regex: escapeRegex(search), $options: "i" };

  const skip = (page - 1) * limit;
  const [courses, total] = await Promise.all([
    Course.find(query).sort({ startDate: 1 }).skip(skip).limit(limit).lean(),
    Course.countDocuments(query),
  ]);
  const totalPages = Math.max(1, Math.ceil(total / limit));

  const serialized = courses.map((c) => ({
    _id: (c._id as Types.ObjectId).toString(),
    title: c.title,
    description: c.description,
    startDate: (c.startDate as Date).toISOString(),
    endDate: (c.endDate as Date).toISOString(),
    status: c.status,
    participantModel: c.participantModel,
    participantCount: (c.participants as Types.ObjectId[]).length,
  }));

  const canEdit = user.role === "admin" || user.permissions.education === "edit";

  return (
    <PageContainer className="max-w-[1600px] mx-auto pb-12">
      <PageHeader
        title="التعليم والدورات"
        description="إدارة الدورات والتدريبات"
        icon={<BookOpen className="w-6 h-6" />}
        action={canEdit && <CourseForm mode="create" />}
      />
      <CourseGrid
        courses={serialized}
        page={page}
        totalPages={totalPages}
        total={total}
      />
    </PageContainer>
  );
}
