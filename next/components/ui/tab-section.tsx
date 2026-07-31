import React from "react";
import { LucideIcon } from "lucide-react";

interface TabSectionProps {
  icon: LucideIcon;
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}

/**
 * TabSection
 * ──────────────────────────────────────────────────────────────────────────
 * Unified wrapper for tab content. Includes the standard header with an icon
 * inside a surface container, the title, and optional actions.
 */
export function TabSection({ icon: Icon, title, action, children }: TabSectionProps) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-(--app-surface-container) border border-(--app-border) rounded-lg">
            <Icon className="h-5 w-5 text-(--color-primary)" />
          </div>
          <h2 className="text-xl font-bold text-(--color-primary)">{title}</h2>
        </div>
        {action && (
          <div className="flex items-center gap-2">
            {action}
          </div>
        )}
      </div>
      {children}
    </div>
  );
}
