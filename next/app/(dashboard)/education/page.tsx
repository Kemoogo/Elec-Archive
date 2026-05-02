import { redirect } from "next/navigation";
import { authenticate } from "@/lib/auth/middleware";
import { connectToDatabase } from "@/lib/db/connect";
import { Course, type ICourse } from "@/lib/db/models/Course";
import { courseListQuerySchema } from "@/lib/validations/education";
import { EducationPageClient } from "@/components/education/EducationPageClient";
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
    <EducationPageClient
      courses={serialized as unknown as ICourse[]}
      total={total}
      totalPages={totalPages}
      page={page}
      canEdit={canEdit}
      initialFilters={{ search, status }}
    />
  );
}
