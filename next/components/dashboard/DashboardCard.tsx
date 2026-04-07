import Link from "next/link";

interface DashboardCardProps {
  title: string;
  count: number | null;
  subtitle: string;
  color: "blue" | "green" | "purple" | "yellow" | "red";
  icon: string;
  href?: string;
  emptyMessage?: string;
}

const colorClasses: Record<string, string> = {
  blue: "text-(--color-primary)",
  green: "text-(--app-success)",
  purple: "text-violet-700",
  yellow: "text-amber-700",
  red: "text-(--app-error)",
};

const iconBgClasses: Record<string, string> = {
  blue: "bg-(--color-primary)/20",
  green: "bg-(--app-success)/20",
  purple: "bg-violet-500/20",
  yellow: "bg-amber-500/20",
  red: "bg-(--app-error)/20",
};

export function DashboardCard({
  title,
  count,
  subtitle,
  color,
  icon,
  href,
  emptyMessage,
}: DashboardCardProps) {
  const content = (
    <div className="archive-card cursor-pointer">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground">{title}</h2>
          {count !== null ? (
            <p className={`mt-2 text-3xl font-bold ${colorClasses[color]}`}>{count}</p>
          ) : (
            <p className="mt-2 text-sm text-(--app-muted-foreground)">
              {emptyMessage ?? "لا توجد بيانات"}
            </p>
          )}
          <p className="mt-1 text-sm text-(--app-muted-foreground)">{subtitle}</p>
        </div>
        <div className={`flex h-14 w-14 items-center justify-center rounded-xl ${iconBgClasses[color]}`}>
          <span className="text-2xl">{icon}</span>
        </div>
      </div>
    </div>
  );

  if (href) {
    return <Link href={href}>{content}</Link>;
  }

  return content;
}
