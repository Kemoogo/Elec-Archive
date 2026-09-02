import * as React from "react";
import { cn } from "@/lib/utils";

export interface MonoBadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  label?: string;
  value: React.ReactNode;
  icon?: React.ReactNode;
  variant?: "surface" | "primary" | "muted" | "outline";
  size?: "sm" | "md" | "lg";
}

export function MonoBadge({
  label,
  value,
  icon,
  variant = "surface",
  size = "md",
  className,
  ...props
}: MonoBadgeProps) {
  const variantStyles = {
    surface: "bg-(--app-surface-container) border border-(--app-border) text-(--app-foreground)",
    primary: "bg-(--color-primary)/10 border border-(--color-primary)/20 text-(--color-primary)",
    muted: "bg-(--app-surface) border border-(--app-border) text-(--app-muted-foreground)",
    outline: "bg-transparent border border-(--app-border) text-(--app-foreground)",
  };

  const sizeStyles = {
    sm: "px-2.5 py-1 text-xs gap-1.5 rounded-lg",
    md: "px-3.5 py-1.5 text-xs font-bold gap-2 rounded-xl shadow-xs",
    lg: "px-4 py-2 text-sm font-bold gap-2.5 rounded-xl shadow-sm",
  };

  return (
    <div
      className={cn(
        "inline-flex items-center select-none transition-colors",
        variantStyles[variant],
        sizeStyles[size],
        className
      )}
      {...props}
    >
      {icon && <span className="shrink-0 text-(--app-muted-foreground)">{icon}</span>}
      {label && <span className="text-(--app-muted-foreground) font-semibold">{label}:</span>}
      <span className="font-mono font-bold tracking-tight">{value}</span>
    </div>
  );
}

export function MonoNumber({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span className={cn("font-mono font-bold tracking-tight", className)}>
      {children}
    </span>
  );
}
