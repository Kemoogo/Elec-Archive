"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

// Re-export the canonical surface wrapper so components can import from one place
export { SectionWrapper } from "@/components/ui/section-wrapper";
export type { SectionWrapperProps } from "@/components/ui/section-wrapper";

export type CardProps = React.HTMLAttributes<HTMLDivElement> & {
  className?: string;
};

export function Card({
  className,
  children,
  ...props
}: CardProps) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-(--app-border) bg-(--app-surface) text-(--app-foreground) shadow-xs transition-all duration-200 hover:border-blue-500/30 hover:shadow-md",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}
Card.displayName = "Card";

export type CardHeaderProps = React.HTMLAttributes<HTMLDivElement> & {
  className?: string;
};

export function CardHeader({
  className,
  children,
  ...props
}: CardHeaderProps) {
  return (
    <div className={cn("flex flex-col space-y-1.5 p-6", className)} {...props}>
      {children}
    </div>
  );
}
CardHeader.displayName = "CardHeader";

export type CardTitleProps = React.HTMLAttributes<HTMLHeadingElement> & {
  className?: string;
};

export function CardTitle({
  className,
  children,
  ...props
}: CardTitleProps) {
  return (
    <h3
      className={cn(
        "text-(--app-foreground) text-lg font-semibold leading-none tracking-tight",
        className
      )}
      {...props}
    >
      {children}
    </h3>
  );
}
CardTitle.displayName = "CardTitle";

export type CardContentProps = React.HTMLAttributes<HTMLDivElement> & {
  className?: string;
};

export function CardContent({
  className,
  children,
  ...props
}: CardContentProps) {
  return (
    <div className={cn("p-6 pt-0", className)} {...props}>
      {children}
    </div>
  );
}
CardContent.displayName = "CardContent";