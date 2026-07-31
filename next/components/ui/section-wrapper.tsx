import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * SectionWrapper
 * ──────────────────────────────────────────────────────────────────────────
 * The canonical "card / panel" surface in the Sapphire Archive design system.
 * It matches the visual identity of ModernPageHeader exactly:
 *
 *   bg-(--app-surface)  ·  border border-(--app-border)
 *   rounded-2xl         ·  shadow-sm
 *
 * Usage
 * ──────
 *   <SectionWrapper>…</SectionWrapper>
 *
 *   // No padding (e.g. wrapping a full-bleed table)
 *   <SectionWrapper noPadding>…</SectionWrapper>
 *
 *   // Extra class overrides
 *   <SectionWrapper className="mt-4 overflow-hidden">…</SectionWrapper>
 */
export interface SectionWrapperProps extends React.HTMLAttributes<HTMLDivElement> {
  /** When true, removes the default 1.5rem padding so content fills edge-to-edge */
  noPadding?: boolean;
}

export function SectionWrapper({
  className,
  children,
  noPadding = false,
  ...props
}: SectionWrapperProps) {
  return (
    <div
      className={cn(
        // Canonical surface tokens — identical to ModernPageHeader
        "bg-(--app-surface) rounded-2xl shadow-sm border border-(--app-border)",
        // Default comfortable padding (opt-out via noPadding)
        !noPadding && "p-6",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}
