import { cn } from "@/lib/utils";

export function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "animate-pulse rounded-xl bg-(--app-surface-container) border border-(--app-border)/40",
        className
      )}
      {...props}
    />
  );
}
