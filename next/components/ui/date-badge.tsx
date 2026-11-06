"use client";

import React from "react";
import { Calendar } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  getDayName,
  formatDateDisplay,
  formatDateWithDay,
} from "@/lib/utils/date-display";

export interface DateBadgeProps {
  date?: string | Date | null;
  endDate?: string | Date | null;
  showDayName?: boolean;
  showIcon?: boolean;
  variant?: "default" | "surface" | "primary" | "warning" | "success" | "muted" | "amber";
  size?: "sm" | "md";
  layout?: "inline" | "stacked";
  className?: string;
}

const VARIANT_STYLES: Record<NonNullable<DateBadgeProps["variant"]>, string> = {
  default: "text-(--app-foreground)",
  surface: "bg-(--app-surface) border border-(--app-border) text-(--app-foreground) shadow-xs",
  primary: "bg-(--color-primary)/5 border border-(--color-primary)/20 text-(--color-primary)",
  warning: "bg-(--color-primary)/5 border border-(--color-primary)/20 text-(--color-primary)",
  amber: "bg-(--app-surface-container) border border-(--app-border) text-(--app-muted-foreground)",
  success: "bg-emerald-500/10 border border-emerald-500/20 text-emerald-800 dark:text-emerald-300",
  muted: "text-(--app-muted-foreground)",
};

/**
 * Reusable component to display a date formatted with its Arabic day name (اسم اليوم).
 * Complies strictly with the Sapphire Archive design system tokens and military monospace typography.
 */
export function DateBadge({
  date,
  endDate,
  showDayName = true,
  showIcon = false,
  variant = "default",
  size = "md",
  layout = "inline",
  className,
}: DateBadgeProps) {
  if (!date) return <span className="text-(--app-muted-foreground)/40">---</span>;

  const startDay = showDayName ? getDayName(date) : "";
  const startFormatted = formatDateDisplay(date);

  const endDay = endDate && showDayName ? getDayName(endDate) : "";
  const endFormatted = endDate ? formatDateDisplay(endDate) : "";

  const sizeClass = size === "sm" ? "text-[11px]" : "text-xs";
  const badgeClasses = cn(
    "inline-flex items-center gap-1.5 font-bold transition-colors",
    sizeClass,
    VARIANT_STYLES[variant],
    variant !== "default" && variant !== "muted" ? "px-2 py-1 rounded-xl" : "",
    className
  );

  // Single Date Rendering
  if (!endDate) {
    return (
      <span className={badgeClasses} dir="rtl">
        {showIcon && <Calendar className="w-3.5 h-3.5 shrink-0 opacity-70" />}
        {startDay && <span className="font-black text-(--color-primary)">{startDay}</span>}
        <span className="font-mono tracking-tight">{startFormatted}</span>
      </span>
    );
  }

  // Date Range (من ... حتى / إلى ...)
  if (layout === "stacked") {
    return (
      <div className={cn("flex flex-col items-center gap-0.5 text-xs font-bold", className)} dir="rtl">
        <div className="flex items-center gap-1">
          <span className="text-(--app-muted-foreground) text-[11px]">من:</span>
          {startDay && <span className="font-black text-(--color-primary)">{startDay}</span>}
          <span className="font-mono tracking-tight">{startFormatted}</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="text-(--app-muted-foreground) text-[11px]">إلى:</span>
          {endDay && <span className="font-black text-(--color-primary)">{endDay}</span>}
          <span className="font-mono tracking-tight">{endFormatted}</span>
        </div>
      </div>
    );
  }

  // Date Range Inline
  return (
    <span className={badgeClasses} dir="rtl">
      {showIcon && <Calendar className="w-3.5 h-3.5 shrink-0 opacity-70" />}
      <span>من</span>
      {startDay && <span className="font-black text-(--color-primary)">{startDay}</span>}
      <span className="font-mono tracking-tight">{startFormatted}</span>
      <span className="text-(--app-muted-foreground)/60 font-normal">إلى</span>
      {endDay && <span className="font-black text-(--color-primary)">{endDay}</span>}
      <span className="font-mono tracking-tight">{endFormatted}</span>
    </span>
  );
}

/**
 * Re-export helper for fast plain-text strings with day name.
 */
export { formatDateWithDay, getDayName, formatDateDisplay };
