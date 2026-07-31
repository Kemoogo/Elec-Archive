"use client";

import * as React from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ModalActionsProps extends React.HTMLAttributes<HTMLDivElement> {
  submitText?: string;
  submitLoading?: boolean;
  submitVariant?: "primary" | "destructive";
  cancelText?: string;
  onCancel?: () => void;
}

export function ModalActions({
  className,
  submitText,
  submitLoading,
  submitVariant = "primary",
  cancelText,
  onCancel,
  children,
  ...props
}: ModalActionsProps) {
  return (
    <div
      className={cn("flex flex-row-reverse items-center justify-start gap-3 w-full", className)}
      {...props}
    >
      {children ? (
        children
      ) : (
        <>
          <button
            type="submit"
            disabled={submitLoading}
            className={cn(
              "inline-flex items-center justify-center gap-2 rounded-xl px-5 py-2.5 text-sm font-bold text-white transition-all duration-150 cursor-pointer shadow-md hover:shadow-lg active:scale-[0.97] disabled:opacity-50 disabled:pointer-events-none disabled:transform-none",
              submitVariant === "destructive"
                ? "bg-(--app-error) hover:bg-red-600 focus-visible:ring-2 focus-visible:ring-red-500/40"
                : "bg-(--color-primary) hover:bg-(--color-primary-hover) focus-visible:ring-2 focus-visible:ring-blue-500/40"
            )}
          >
            {submitLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-white" />
                <span>جاري الحفظ...</span>
              </>
            ) : (
              <span>{submitText || "حفظ التغييرات"}</span>
            )}
          </button>
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="inline-flex items-center justify-center rounded-xl bg-(--app-surface-container) hover:bg-(--app-border)/60 border border-(--app-border) px-5 py-2.5 text-sm font-bold text-(--app-foreground) active:scale-[0.97] transition-all duration-150 cursor-pointer focus-visible:ring-2 focus-visible:ring-blue-500/30"
            >
              {cancelText || "إلغاء"}
            </button>
          )}
        </>
      )}
    </div>
  );
}
