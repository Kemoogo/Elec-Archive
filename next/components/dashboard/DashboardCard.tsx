import Link from "next/link";
import { Spotlight } from "@/components/ui/spotlight";

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
  green: "text-(--color-primary)",
  purple: "text-(--app-info)",
  yellow: "text-(--color-primary)",
  red: "text-(--app-muted-foreground)",
};

const iconBgClasses: Record<string, string> = {
  blue: "bg-(--color-primary)/10 dark:bg-(--color-primary)/20",
  green: "bg-(--color-primary)/10 dark:bg-(--color-primary)/20",
  purple: "bg-(--app-info)/10",
  yellow: "bg-(--color-primary)/10 dark:bg-(--color-primary)/20",
  red: "bg-(--app-surface-container)",
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
    <Spotlight className="h-full rounded-2xl overflow-hidden">
      <div className="archive-card cursor-pointer h-full">
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
    </Spotlight>
  );

  if (href) {
    return (
      <Link href={href} className="block h-full">
        {content}
      </Link>
    );
  }

  return content;
}
