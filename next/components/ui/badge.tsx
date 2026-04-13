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
    <button
      className={cn(
        "inline-flex items-center rounded-md border font-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none border",
        {
          "bg-(--color-primary) text-(--app-white)": variant === "default",
          "bg-(--app-secondary) text-(--app-secondary-foreground)":
            variant === "secondary",
          "bg-(--app-destructive) text-(--app-destructive-foreground)":
            variant === "destructive",
          "border text-(--app-foreground) hover:bg-(--app-accent)":
            variant === "outline",
        },
        className
      )}
      {...props}
    />
  );
}
Badge.displayName = "Badge";