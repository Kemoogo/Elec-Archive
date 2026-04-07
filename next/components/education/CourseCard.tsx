"use client";

import Link from "next/link";
interface CourseCardProps {
  course: {
    _id: string;
    title: string;
    description?: string;
    startDate: string;
    endDate: string;
    status: string;
    participantModel: string;
    participantCount: number;
  };
}

const statusLabels: Record<string, string> = {
  upcoming: "قادمة",
  ongoing: "جارية",
  completed: "منتهية",
};

const statusColors: Record<string, string> = {
  upcoming: "bg-(--app-info)/20 text-(--app-info) border-(--app-info)/30",
  ongoing: "bg-(--app-success)/20 text-(--app-success) border-(--app-success)/30",
  completed: "bg-(--app-border) text-(--app-muted-foreground) border-(--app-border)",
};

export function CourseCard({ course }: CourseCardProps) {
  return (
    <Link
      href={`/education/${course._id}`}
      className="block rounded-lg border border-(--app-border) bg-(--app-surface) p-4 transition-colors hover:border-(--app-border) hover:bg-white/10"
      dir="rtl"
    >
      <div className="flex items-start justify-between">
        <h3 className="text-sm font-medium text-(--app-white)">{course.title}</h3>
        <span
          className={`inline-block rounded-full border px-2 py-0.5 text-xs ${
            statusColors[course.status] ?? statusColors.upcoming
          }`}
        >
          {statusLabels[course.status] ?? course.status}
        </span>
      </div>
      {course.description && (
        <p className="mt-1 line-clamp-2 text-xs text-(--app-muted-foreground)">{course.description}</p>
      )}
      <div className="mt-3 flex items-center justify-between text-xs text-(--app-muted-foreground)">
        <span>
          {new Date(course.startDate).toLocaleDateString("ar-EG")} —{" "}
          {new Date(course.endDate).toLocaleDateString("ar-EG")}
        </span>
        <span>{course.participantCount} مشارك</span>
      </div>
    </Link>
  );
}
