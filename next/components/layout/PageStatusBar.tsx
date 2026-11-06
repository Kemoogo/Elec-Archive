"use client";

import React from "react";
import { cn } from "@/lib/utils";

export interface PageStatusBarProps {
  title?: React.ReactNode;
  children?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}

/**
 * شريط حالة الصفحة (PageStatusBar)
 * مكوّن موحد لعرض شارات التنبيهات والحالات والإحصائيات السريعة أعلى الجداول والصفحات
 */
export function PageStatusBar({
  title,
  children,
  actions,
  className = "",
}: PageStatusBarProps) {
  return (
    <div
      className={cn(
        "bg-(--app-surface) border border-(--app-border) rounded-2xl p-3 px-4 shadow-xs flex flex-wrap items-center justify-between gap-3",
        className
      )}
    >
      <div className="flex flex-wrap items-center gap-2.5">
        {title && (
          <span className="text-xs font-bold text-(--app-muted-foreground) shrink-0">
            {title}
          </span>
        )}
        {children}
      </div>

      {actions && (
        <div className="flex items-center gap-2 shrink-0">{actions}</div>
      )}
    </div>
  );
}
