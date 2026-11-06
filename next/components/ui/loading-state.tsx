"use client";

import type { ReactNode } from "react";
import { RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

export interface LoadingStateProps {
  message?: string;
  className?: string;
  variant?: "card" | "inline" | "minimal";
}

export function LoadingState({
  message = "جاري تحميل البيانات...",
  className,
  variant = "card",
}: LoadingStateProps) {
  if (variant === "minimal") {
    return (
      <div
        className={cn(
          "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-(--app-surface-container) border border-(--app-border) text-(--app-muted-foreground) text-xs font-bold animate-pulse",
          className
        )}
      >
        <RefreshCw className="w-3.5 h-3.5 animate-spin text-(--color-primary) shrink-0" />
        <span>{message}</span>
      </div>
    );
  }

  if (variant === "inline") {
    return (
      <div
        className={cn(
          "p-12 text-center text-xs font-bold text-(--app-muted-foreground) flex items-center justify-center gap-2",
          className
        )}
      >
        <RefreshCw className="w-4 h-4 animate-spin text-(--color-primary) shrink-0" />
        <span>{message}</span>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "p-12 text-center bg-(--app-surface) border border-(--app-border) rounded-2xl text-xs font-bold text-(--app-muted-foreground) flex items-center justify-center gap-2",
        className
      )}
    >
      <RefreshCw className="w-4 h-4 animate-spin text-(--color-primary) shrink-0" />
      <span>{message}</span>
    </div>
  );
}

export interface LoadingWrapperProps {
  loading: boolean;
  message?: string;
  className?: string;
  variant?: "card" | "inline" | "minimal";
  children: ReactNode;
}

export function LoadingWrapper({
  loading,
  message = "جاري تحميل البيانات...",
  className,
  variant = "card",
  children,
}: LoadingWrapperProps) {
  if (loading) {
    return <LoadingState message={message} className={className} variant={variant} />;
  }
  return <>{children}</>;
}
