import React from "react";
import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: React.ReactNode;
  className?: string;
}

export function EmptyState({ icon: Icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div className={cn("flex flex-col items-center justify-center p-12 text-center border border-dashed rounded-2xl bg-(--app-surface-container)/50 border-(--app-border)", className)}>
      <div className="flex items-center justify-center w-16 h-16 rounded-full bg-(--app-surface) shadow-sm mb-4">
        <Icon className="w-8 h-8 text-(--app-muted-foreground)" strokeWidth={1.5} />
      </div>
      <h3 className="text-lg font-bold text-(--color-primary) mb-2">{title}</h3>
      <p className="text-sm text-(--app-muted-foreground) max-w-sm mb-6">
        {description}
      </p>
      {action && (
        <div className="mt-2">
          {action}
        </div>
      )}
    </div>
  );
}
