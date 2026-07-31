import * as React from "react";
import { cn } from "@/lib/utils";

interface BadgeProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "secondary" | "destructive" | "outline";
}

export function Badge({
  className,
  variant = "default",
  ...props
}: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center justify-center rounded-full border px-2.5 py-0.5 text-xs font-bold tabular-nums transition-all duration-150",
        {
          "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20 shadow-xs": variant === "default",
          "bg-(--app-surface-container) text-(--app-muted-foreground) border-(--app-border)": variant === "secondary",
          "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20 shadow-xs": variant === "destructive",
          "border border-(--app-border) text-(--app-foreground) bg-(--app-surface)": variant === "outline",
        },
        className
      )}
      {...props}
    />
  );
}
Badge.displayName = "Badge";